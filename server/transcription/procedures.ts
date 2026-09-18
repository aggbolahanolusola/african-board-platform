import { protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { transcribeAudio, extractActionItems, generateMeetingMinutes, identifySpeakers, formatSpeakerTranscript } from "./whisper";
import { getDb } from "../db";
import { minutes, actionItems } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Transcribe a meeting recording and generate minutes
 */
export const transcribeMeeting = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      audioUrl: z.string().url(),
      meetingTitle: z.string(),
      attendees: z.array(z.string()),
      language: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    if (!ctx.user.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID not found" });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }

    try {
      console.log(`[Transcription] Starting transcription for meeting ${input.meetingId}`);

      // Transcribe the audio
      const transcription = await transcribeAudio(input.audioUrl, input.language, "Meeting transcript");

      // Identify speakers
      const speakerSegments = await identifySpeakers(transcription.segments);
      const speakerTranscript = formatSpeakerTranscript(speakerSegments);

      // Extract action items
      const items = await extractActionItems(transcription.text);

      // Generate meeting minutes
      const minutesContent = await generateMeetingMinutes(input.meetingTitle, new Date(), input.attendees, speakerTranscript);

      // Save minutes to database
      const minutesResult = await db.insert(minutes).values({
        meetingId: input.meetingId,
        content: minutesContent,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Get the inserted minutes ID
      const minutesId = (minutesResult as any).insertId || 0;

      // Save action items
      for (const item of items) {
        await db.insert(actionItems).values({
          meetingId: input.meetingId,
          minutesId: minutesId || null,
          description: item.item,
          assignedTo: null,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
          status: "open",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log(`[Transcription] Transcription and minutes saved for meeting ${input.meetingId}`);

      return {
        success: true,
        minutesId: minutesId,
        actionItemsCount: items.length,
        language: transcription.language,
        duration: transcription.duration,
        speakerCount: new Set(speakerSegments.map((s) => s.speaker)).size,
      };
    } catch (error) {
      console.error("[Transcription] Failed to transcribe meeting:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to transcribe meeting" });
    }
  });

/**
 * Get meeting minutes
 */
export const getMinutes = protectedProcedure
  .input(z.object({ meetingId: z.number() }))
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }

    try {
      const result = await db.select().from(minutes).where(eq(minutes.meetingId, input.meetingId)).limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("[Transcription] Failed to get minutes:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve minutes" });
    }
  });

/**
 * Approve meeting minutes
 */
export const approveMinutes = protectedProcedure
  .input(z.object({ minutesId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    if (!ctx.user.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID not found" });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }

    try {
      await db
        .update(minutes)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(minutes.id, input.minutesId));

      console.log(`[Transcription] Minutes ${input.minutesId} approved`);

      return { success: true };
    } catch (error) {
      console.error("[Transcription] Failed to approve minutes:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to approve minutes" });
    }
  });

/**
 * Get action items for a meeting
 */
export const getActionItems = protectedProcedure
  .input(z.object({ meetingId: z.number() }))
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }

    try {
      const items = await db.select().from(actionItems).where(eq(actionItems.meetingId, input.meetingId));

      return items;
    } catch (error) {
      console.error("[Transcription] Failed to get action items:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve action items" });
    }
  });

/**
 * Update action item status
 */
export const updateActionItem = protectedProcedure
  .input(
    z.object({
      actionItemId: z.number(),
      status: z.enum(["open", "inProgress", "completed", "cancelled"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }

    try {
      await db
        .update(actionItems)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(actionItems.id, input.actionItemId));

      console.log(`[Transcription] Action item ${input.actionItemId} status updated to ${input.status}`);

      return { success: true };
    } catch (error) {
      console.error("[Transcription] Failed to update action item:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update action item" });
    }
  });
