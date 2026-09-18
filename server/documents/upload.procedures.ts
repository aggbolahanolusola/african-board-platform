/**
 * Document upload procedures for tRPC
 * Handles file uploads with storage quota validation
 */
import { orgScopedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { documents, meetings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "../permissions";
import {
  checkStorageQuota,
  updateStorageUsage,
  validateFile,
  getStorageInfo,
} from "./storageManager";

export const uploadDocumentProcedure = orgScopedProcedure
  .input(
    z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.string(),
      fileSize: z.number().positive(),
      base64Data: z.string(),
      // organizationId accepted for backward compatibility but ignored; org is
      // always derived from the authenticated session.
      organizationId: z.number().optional(),
      meetingId: z.number().optional(),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      documentType: z.enum(["boardPack", "resolution", "minutes", "policy", "other"]).default("other"),
      isConfidential: z.boolean().default(false),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "upload_document");

      // Validate file
      const validation = validateFile(input.fileName, input.mimeType, input.fileSize);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error || "Invalid file",
        });
      }

      // Check storage quota
      const quotaCheck = await checkStorageQuota(organizationId, input.fileSize);
      if (!quotaCheck.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: quotaCheck.reason || "Storage quota exceeded",
        });
      }

      // Convert base64 to buffer
      const fileBuffer = Buffer.from(input.base64Data, "base64");

      // Verify buffer size matches declared size
      if (fileBuffer.length !== input.fileSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File size mismatch",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      // If linked to a meeting, ensure that meeting belongs to the caller's org
      if (input.meetingId !== undefined) {
        const meeting = await db
          .select({ id: meetings.id })
          .from(meetings)
          .where(and(eq(meetings.id, input.meetingId), eq(meetings.organizationId, organizationId)))
          .limit(1);
        if (meeting.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
        }
      }

      // Upload to S3
      const fileKey = `org-${organizationId}/documents/${Date.now()}-${input.fileName}`;
      const uploadResult = await storagePut(fileKey, fileBuffer, input.mimeType);

      if (!uploadResult.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file to storage",
        });
      }

      // Save document metadata to database
      await db
        .insert(documents)
        .values({
          organizationId,
          meetingId: input.meetingId,
          title: input.title,
          description: input.description,
          fileKey,
          fileUrl: uploadResult.url,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          documentType: input.documentType,
          isConfidential: input.isConfidential,
          uploadedBy: ctx.user!.id,
        });

      // Update storage usage
      const storageUpdate = await updateStorageUsage(organizationId, input.fileSize);
      if (!storageUpdate.success) {
        console.warn("[Upload] Failed to update storage usage:", storageUpdate.error);
        // Don't fail the upload if storage update fails, but log it
      }

      // Get updated storage info
      const storageInfo = await getStorageInfo(organizationId);

      return {
        success: true,
        fileUrl: uploadResult.url,
        storageInfo: storageInfo.data,
      };
    } catch (error) {
      console.error("[Upload] Error uploading document:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to upload document",
      });
    }
  });

export const getStorageInfoProcedure = orgScopedProcedure
  // organizationId is accepted for backward compatibility but ignored; the org
  // is always derived from the authenticated session.
  .input(z.object({ organizationId: z.number().optional() }).optional())
  .query(async ({ ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "view_document");

      const storageInfo = await getStorageInfo(organizationId);

      if (!storageInfo.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: storageInfo.error || "Failed to get storage information",
        });
      }

      return {
        success: true,
        data: storageInfo.data,
      };
    } catch (error) {
      console.error("[StorageInfo] Error getting storage info:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get storage information",
      });
    }
  });

export const deleteDocumentProcedure = orgScopedProcedure
  .input(z.object({ documentId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "delete_document");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      // Get document scoped to the caller's organization
      const docList = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, input.documentId), eq(documents.organizationId, organizationId)))
        .limit(1);

      const doc = docList[0];

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Delete from database
      await db.delete(documents).where(eq(documents.id, input.documentId));

      // Update storage usage (subtract file size)
      const fileSize = doc.fileSize || 0;
      const storageUpdate = await updateStorageUsage(organizationId, -fileSize);
      if (!storageUpdate.success) {
        console.warn("[Delete] Failed to update storage usage:", storageUpdate.error);
      }

      // Get updated storage info
      const storageInfo = await getStorageInfo(organizationId);

      return {
        success: true,
        storageInfo: storageInfo.data,
      };
    } catch (error) {
      console.error("[Delete] Error deleting document:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete document",
      });
    }
  });
