/**
 * Meeting recording upload and transcription procedures
 * Handles audio/video uploads and Whisper API transcription
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { meetings, documents } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { transcribeAudio, type WhisperResponse } from "../_core/voiceTranscription";
import { requirePermission } from "../permissions";

// Supported audio/video formats for transcription
const SUPPORTED_FORMATS = ["webm", "mp3", "wav", "ogg", "m4a", "mp4"];
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB limit for Whisper API

/**
 * Upload meeting recording
 */
export const uploadRecordingProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      fileName: z.string().min(1).max(255),
      mimeType: z.string(),
      fileSize: z.number().positive().max(MAX_FILE_SIZE),
      base64Data: z.string(),
      duration: z.number().optional(), // Duration in seconds
    })
  )
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "create_meeting");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Verify meeting belongs to user's organization
    const meeting = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.id, input.meetingId),
          eq(meetings.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (meeting.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
    }

    // Validate file format
    const fileExtension = input.fileName.split(".").pop()?.toLowerCase();
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unsupported format. Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
      });
    }

    // Validate file size
    if (input.fileSize > MAX_FILE_SIZE) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `File size exceeds maximum of 16MB`,
      });
    }

    try {
      // Convert base64 to buffer
      const fileBuffer = Buffer.from(input.base64Data, "base64");

      // Verify buffer size matches declared size
      if (fileBuffer.length !== input.fileSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File size mismatch",
        });
      }

      // Upload to S3
      const fileKey = `org-${ctx.user.organizationId}/recordings/${input.meetingId}/${Date.now()}-${input.fileName}`;
      const uploadResult = await storagePut(fileKey, fileBuffer, input.mimeType);

      if (!uploadResult.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload recording to storage",
        });
      }

      // Update meeting with recording URL
      await db
        .update(meetings)
        .set({ recordingUrl: uploadResult.url })
        .where(eq(meetings.id, input.meetingId));

      return {
        success: true,
        recordingUrl: uploadResult.url,
        fileKey: uploadResult.key,
      };
    } catch (error) {
      console.error("[Recording Upload] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to upload recording",
      });
    }
  });

/**
 * Transcribe meeting recording
 */
export const transcribeRecordingProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      recordingUrl: z.string().url(),
      language: z.string().optional().default("en"),
    })
  )
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "create_meeting");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Verify meeting belongs to user's organization
    const meeting = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.id, input.meetingId),
          eq(meetings.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (meeting.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
    }

    try {
      // Call Whisper API for transcription
      const transcriptionResult = await transcribeAudio({
        audioUrl: input.recordingUrl,
        language: input.language,
        prompt: `Transcribe this meeting recording for ${meeting[0].title}`,
      });

      // Check if transcription is an error
      if ('error' in transcriptionResult) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: transcriptionResult.error,
        });
      }

      const typedResult = transcriptionResult as WhisperResponse;

      if (!typedResult.text) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Transcription failed - no text returned",
        });
      }

      // Save transcription as a document
      const transcriptionKey = `org-${ctx.user.organizationId}/transcriptions/${input.meetingId}/${Date.now()}-transcription.txt`;
      const transcriptionBuffer = Buffer.from(typedResult.text, "utf-8");
      const uploadResult = await storagePut(
        transcriptionKey,
        transcriptionBuffer,
        "text/plain"
      );

      if (!uploadResult.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save transcription",
        });
      }

      // Update meeting with transcription URL
      await db
        .update(meetings)
        .set({ transcriptionUrl: uploadResult.url })
        .where(eq(meetings.id, input.meetingId));

      // Create a document record for the transcription
      await db.insert(documents).values({
        organizationId: ctx.user.organizationId,
        meetingId: input.meetingId,
        title: `Transcription: ${meeting[0].title}`,
        description: `Automated transcription from meeting recording`,
        documentType: "minutes",
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        mimeType: "text/plain",
        fileSize: transcriptionBuffer.length,
        isConfidential: false,
        uploadedBy: ctx.user.id,
      });

      return {
        success: true,
        transcription: typedResult.text,
        transcriptionUrl: uploadResult.url,
        language: typedResult.language,
        segments: typedResult.segments,
      };
    } catch (error) {
      console.error("[Transcription] Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to transcribe recording",
      });
    }
  });

/**
 * Get recording status for a meeting
 */
export const getRecordingStatusProcedure = protectedProcedure
  .input(z.object({ meetingId: z.number() }))
  .query(async ({ input, ctx }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_meeting");

    const db = await getDb();
    if (!db) return null;

    const meeting = await db
      .select({
        id: meetings.id,
        title: meetings.title,
        recordingUrl: meetings.recordingUrl,
        transcriptionUrl: meetings.transcriptionUrl,
      })
      .from(meetings)
      .where(
        and(
          eq(meetings.id, input.meetingId),
          eq(meetings.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (meeting.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
    }

    return {
      meetingId: meeting[0].id,
      title: meeting[0].title,
      hasRecording: !!meeting[0].recordingUrl,
      recordingUrl: meeting[0].recordingUrl,
      hasTranscription: !!meeting[0].transcriptionUrl,
      transcriptionUrl: meeting[0].transcriptionUrl,
    };
  });

/**
 * Delete recording for a meeting
 */
export const deleteRecordingProcedure = protectedProcedure
  .input(z.object({ meetingId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "create_meeting");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Verify meeting belongs to user's organization
    const meeting = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.id, input.meetingId),
          eq(meetings.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (meeting.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
    }

    // Clear recording and transcription URLs
    await db
      .update(meetings)
      .set({
        recordingUrl: null,
        transcriptionUrl: null,
      })
      .where(eq(meetings.id, input.meetingId));

    // Delete associated transcription documents
    // Note: S3 files are not deleted here - they remain in storage
    // This is intentional for audit/compliance purposes

    return { success: true };
  });

export const recordingRouter = router({
  upload: uploadRecordingProcedure,
  transcribe: transcribeRecordingProcedure,
  getStatus: getRecordingStatusProcedure,
  delete: deleteRecordingProcedure,
});
