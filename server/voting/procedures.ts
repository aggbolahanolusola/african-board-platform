/**
 * Voting and Resolution procedures for tRPC
 * Handles vote creation, casting, tallying, and resolution management
 */

import { orgScopedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { votes, voteBallots, resolutions, meetings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "../permissions";

/**
 * If a meetingId is supplied, verify it belongs to the caller's organization.
 */
async function assertMeetingInOrg(db: any, meetingId: number | undefined, organizationId: number) {
  if (meetingId === undefined) return;
  const meeting = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.organizationId, organizationId)))
    .limit(1);
  if (meeting.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
  }
}

/**
 * Create a new vote/resolution
 */
export const createVoteProcedure = orgScopedProcedure
  .input(
    z.object({
      // organizationId accepted for backward compatibility but ignored.
      organizationId: z.number().optional(),
      meetingId: z.number().optional(),
      resolutionId: z.number().optional(),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      votingMethod: z.enum(["unanimous", "majority", "weighted", "plurality"]).default("majority"),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "manage_voting");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      await assertMeetingInOrg(db, input.meetingId, organizationId);

      // Create vote (organization derived from session, not client input)
      await db.insert(votes).values({
        organizationId,
        meetingId: input.meetingId,
        resolutionId: input.resolutionId,
        title: input.title,
        description: input.description,
        votingMethod: input.votingMethod,
        status: "open",
        result: "pending",
        createdBy: ctx.user!.id,
      });

      return {
        success: true,
        message: "Vote created successfully",
      };
    } catch (error) {
      console.error("[Voting] Error creating vote:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create vote",
      });
    }
  });

/**
 * Fetch a vote and confirm it belongs to the caller's organization.
 */
async function getOwnedVote(db: any, voteId: number, organizationId: number) {
  const voteList = await db
    .select()
    .from(votes)
    .where(and(eq(votes.id, voteId), eq(votes.organizationId, organizationId)))
    .limit(1);
  const vote = voteList[0];
  if (!vote) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Vote not found" });
  }
  return vote;
}

/**
 * Cast a vote
 */
export const castVoteProcedure = orgScopedProcedure
  .input(
    z.object({
      voteId: z.number(),
      choice: z.enum(["yes", "no", "abstain"]),
      weight: z.number().default(1),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "vote");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      // Check if vote exists, is in the caller's org, and is open
      const vote = await getOwnedVote(db, input.voteId, organizationId);

      if (vote.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vote is not open for voting",
        });
      }

      // Check if user already voted
      const existingBallot = await db
        .select()
        .from(voteBallots)
        .where(and(eq(voteBallots.voteId, input.voteId), eq(voteBallots.userId, ctx.user!.id)))
        .limit(1);

      if (existingBallot.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already voted on this resolution",
        });
      }

      // Cast vote
      await db.insert(voteBallots).values({
        voteId: input.voteId,
        userId: ctx.user!.id,
        choice: input.choice,
        weight: (input.weight || 1).toString(),
      });

      return {
        success: true,
        message: "Vote cast successfully",
      };
    } catch (error) {
      console.error("[Voting] Error casting vote:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cast vote",
      });
    }
  });

/**
 * Close a vote and tally results
 */
export const closeVoteProcedure = orgScopedProcedure
  .input(z.object({ voteId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "manage_voting");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      // Get vote scoped to the caller's organization
      const vote = await getOwnedVote(db, input.voteId, organizationId);

      // Get all ballots
      const ballots = await db
        .select()
        .from(voteBallots)
        .where(eq(voteBallots.voteId, input.voteId));

      // Tally votes based on voting method
      let result: "passed" | "failed" | "abstained" = "pending" as any;

      if (vote.votingMethod === "unanimous") {
        // All must vote yes
        const allYes = ballots.every((b: any) => b.choice === "yes");
        result = allYes ? "passed" : "failed";
      } else if (vote.votingMethod === "majority") {
        // More than 50% must vote yes
        const yesCount = ballots.filter((b: any) => b.choice === "yes").length;
        const totalVotes = ballots.filter((b: any) => b.choice !== "abstain").length;
        result = yesCount > totalVotes / 2 ? "passed" : "failed";
      } else if (vote.votingMethod === "weighted") {
        // Weighted voting
        const yesWeight = ballots
          .filter((b: any) => b.choice === "yes")
          .reduce((sum: number, b: any) => sum + parseFloat(b.weight || "1"), 0);
        const totalWeight = ballots
          .filter((b: any) => b.choice !== "abstain")
          .reduce((sum: number, b: any) => sum + parseFloat(b.weight || "1"), 0);
        result = yesWeight > totalWeight / 2 ? "passed" : "failed";
      } else if (vote.votingMethod === "plurality") {
        // Most votes wins
        const yesCounts = ballots.filter((b: any) => b.choice === "yes").length;
        const noCounts = ballots.filter((b: any) => b.choice === "no").length;
        result = yesCounts > noCounts ? "passed" : "failed";
      }

      // Update vote status
      await db
        .update(votes)
        .set({
          status: "closed",
          result,
          closedAt: new Date(),
        })
        .where(eq(votes.id, input.voteId));

      return {
        success: true,
        result,
        totalVotes: ballots.length,
        breakdown: {
          yes: ballots.filter((b: any) => b.choice === "yes").length,
          no: ballots.filter((b: any) => b.choice === "no").length,
          abstain: ballots.filter((b: any) => b.choice === "abstain").length,
        },
      };
    } catch (error) {
      console.error("[Voting] Error closing vote:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to close vote",
      });
    }
  });

/**
 * Get vote details with results
 */
export const getVoteProcedure = orgScopedProcedure
  .input(z.object({ voteId: z.number() }))
  .query(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "view_voting");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      // Get vote scoped to the caller's organization
      const vote = await getOwnedVote(db, input.voteId, organizationId);

      // Get ballots
      const ballots = await db
        .select()
        .from(voteBallots)
        .where(eq(voteBallots.voteId, input.voteId));

      return {
        success: true,
        vote,
        ballots,
        stats: {
          totalVotes: ballots.length,
          yesCount: ballots.filter((b: any) => b.choice === "yes").length,
          noCount: ballots.filter((b: any) => b.choice === "no").length,
          abstainCount: ballots.filter((b: any) => b.choice === "abstain").length,
        },
      };
    } catch (error) {
      console.error("[Voting] Error getting vote:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get vote",
      });
    }
  });

/**
 * Get all votes for an organization or meeting
 */
export const getVotesProcedure = orgScopedProcedure
  .input(
    z.object({
      // organizationId accepted for backward compatibility but ignored.
      organizationId: z.number().optional(),
      meetingId: z.number().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "view_voting");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      const conditions = [eq(votes.organizationId, organizationId)];
      if (input.meetingId) {
        conditions.push(eq(votes.meetingId, input.meetingId));
      }

      const allVotes = await db
        .select()
        .from(votes)
        .where(and(...conditions));

      return {
        success: true,
        votes: allVotes,
      };
    } catch (error) {
      console.error("[Voting] Error getting votes:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get votes",
      });
    }
  });

/**
 * Create a resolution
 */
export const createResolutionProcedure = orgScopedProcedure
  .input(
    z.object({
      // organizationId accepted for backward compatibility but ignored.
      organizationId: z.number().optional(),
      meetingId: z.number().optional(),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      requiresSignature: z.boolean().default(true),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "manage_voting");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      await assertMeetingInOrg(db, input.meetingId, organizationId);

      // Create resolution (organization derived from session)
      await db.insert(resolutions).values({
        organizationId,
        meetingId: input.meetingId,
        title: input.title,
        description: input.description,
        requiresSignature: input.requiresSignature,
        status: "draft",
        createdBy: ctx.user!.id,
      });

      return {
        success: true,
        message: "Resolution created successfully",
      };
    } catch (error) {
      console.error("[Resolution] Error creating resolution:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create resolution",
      });
    }
  });

/**
 * Get all resolutions for an organization
 */
export const getResolutionsProcedure = orgScopedProcedure
  .input(
    z.object({
      // organizationId accepted for backward compatibility but ignored.
      organizationId: z.number().optional(),
      meetingId: z.number().optional(),
      status: z.enum(["draft", "approved", "rejected", "executed"]).optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const organizationId = ctx.organizationId;
      requirePermission(ctx.user, "view_voting");

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      const conditions = [eq(resolutions.organizationId, organizationId)];
      if (input.meetingId) {
        conditions.push(eq(resolutions.meetingId, input.meetingId));
      }
      if (input.status) {
        conditions.push(eq(resolutions.status, input.status));
      }

      const allResolutions = await db
        .select()
        .from(resolutions)
        .where(and(...conditions));

      return {
        success: true,
        resolutions: allResolutions,
      };
    } catch (error) {
      console.error("[Resolution] Error getting resolutions:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get resolutions",
      });
    }
  });
