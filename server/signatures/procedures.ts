/**
 * E-Signature tRPC Procedures
 * Handles signature requests, tracking, and management
 */

import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { signatures } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Request signatures for a resolution
 * Multiple signers can be specified
 */
export const requestSignatures = protectedProcedure
  .input(
    z.object({
      resolutionId: z.number(),
      signers: z.array(
        z.object({
          userId: z.number(),
          email: z.string().email(),
          name: z.string(),
        })
      ),
      documentUrl: z.string().url(),
      documentName: z.string(),
      expiresInDays: z.number().default(30),
    })
  )
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    // Verify user has permission to request signatures
    if (ctx.user.role !== "admin" && ctx.user.userRole !== "administrator") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can request signatures",
      });
    }

    try {
      // Create signature records for each signer
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      const signatureRecords = await Promise.all(
        input.signers.map(async (signer: any) => {
          // Generate mock envelope ID (in production, this would come from DocuSign)
          const envelopeId = `envelope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const [result] = await db
            .insert(signatures)
            .values({
              resolutionId: input.resolutionId,
              userId: signer.userId,
              signatureProviderId: "docusign",
              envelopeId,
              status: "pending",
              expiresAt,
              auditTrail: {
                requestedAt: new Date().toISOString(),
                requestedBy: ctx.user.id,
                signer: {
                  email: signer.email,
                  name: signer.name,
                },
              },
            })
            .execute();

          return {
            userId: signer.userId,
            envelopeId,
          };
        })
      );

      return {
        success: true,
        signatureRecords,
        message: `Signature requests sent to ${input.signers.length} signers`,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to request signatures: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

/**
 * Get signature status for a resolution
 */
export const getSignatureStatus = protectedProcedure
  .input(z.object({ resolutionId: z.number() }))
  .query(async ({ input, ctx }: { input: any; ctx: any }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    try {
      const sigs = await db
        .select()
        .from(signatures)
        .where(eq(signatures.resolutionId, input.resolutionId))
        .execute();

      if (!sigs.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No signatures found for this resolution",
        });
      }

      return {
        resolutionId: input.resolutionId,
        totalSigners: sigs.length,
        signed: sigs.filter((s) => s.status === "signed").length,
        pending: sigs.filter((s) => s.status === "pending").length,
        rejected: sigs.filter((s) => s.status === "rejected").length,
        signatures: sigs.map((sig) => ({
          id: sig.id,
          userId: sig.userId,
          status: sig.status,
          signedAt: sig.signedAt,
          rejectionReason: sig.rejectionReason,
        })),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get signature status: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

/**
 * Sign a document (mark as signed)
 */
export const signDocument = protectedProcedure
  .input(
    z.object({
      signatureId: z.number(),
      signatureData: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    try {
      // Get the signature record
      const [sig]: any = await db
        .select()
        .from(signatures)
        .where(eq(signatures.id, input.signatureId))
        .execute();

      if (!sig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Signature not found",
        });
      }

      // Verify the user is the intended signer
      if (sig.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to sign this document",
        });
      }

      // Update signature status
      await db
        .update(signatures)
        .set({
          status: "signed",
          signedAt: new Date(),
          signatureData: input.signatureData,
          auditTrail: {
            ...((sig.auditTrail as Record<string, unknown>) || {}),
            signedAt: new Date().toISOString(),
            signedBy: ctx.user.id,
          },
        })
        .where(eq(signatures.id, input.signatureId))
        .execute();

      return {
        success: true,
        message: "Document signed successfully",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to sign document: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

/**
 * Reject a signature request
 */
export const rejectSignature = protectedProcedure
  .input(
    z.object({
      signatureId: z.number(),
      reason: z.string(),
    })
  )
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    try {
      const [sig]: any = await db
        .select()
        .from(signatures)
        .where(eq(signatures.id, input.signatureId))
        .execute();

      if (!sig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Signature not found",
        });
      }

      if (sig.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to reject this signature",
        });
      }

      await db
        .update(signatures)
        .set({
          status: "rejected",
          rejectionReason: input.reason,
          auditTrail: {
            ...((sig.auditTrail as Record<string, unknown>) || {}),
            rejectedAt: new Date().toISOString(),
            rejectedBy: ctx.user.id,
            rejectionReason: input.reason,
          },
        })
        .where(eq(signatures.id, input.signatureId))
        .execute();

      return {
        success: true,
        message: "Signature request rejected",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to reject signature: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

/**
 * Get pending signatures for current user
 */
export const getPendingSignatures = protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

  try {
    const pending = await db
      .select()
      .from(signatures)
      .where(
        and(
          eq(signatures.userId, ctx.user.id),
          eq(signatures.status, "pending")
        )
      )
      .execute();

    return {
      count: pending.length,
      signatures: pending.map((sig) => ({
        id: sig.id,
        resolutionId: sig.resolutionId,
        expiresAt: sig.expiresAt,
        createdAt: sig.createdAt,
      })),
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to get pending signatures: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
});
