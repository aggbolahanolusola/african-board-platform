import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, ne, like } from "drizzle-orm";
import { users, organizations } from "../../drizzle/schema";
import { requirePermission } from "../permissions";

/**
 * Remove a team member from organization
 */
export const removeMemberProcedure = protectedProcedure
  .input(z.object({ userId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "manage_members");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Verify user to remove is in the same organization
    const userToRemove = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, input.userId),
          eq(users.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (userToRemove.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Prevent removing the last administrator
    const adminCount = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, ctx.user.organizationId),
          eq(users.userRole, "administrator")
        )
      );

    if (
      adminCount.length === 1 &&
      userToRemove[0].userRole === "administrator"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Cannot remove the last administrator",
      });
    }

    // Remove user from organization
    await db
      .update(users)
      .set({ organizationId: null, userRole: "boardMember" })
      .where(eq(users.id, input.userId));

    return { success: true };
  });

/**
 * Update a team member's role
 */
export const updateMemberRoleProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      role: z.enum(["boardMember", "secretary", "administrator", "complianceOfficer"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "manage_members");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Verify user to update is in the same organization
    const userToUpdate = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, input.userId),
          eq(users.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (userToUpdate.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Update user role
    await db
      .update(users)
      .set({ userRole: input.role })
      .where(eq(users.id, input.userId));

    return { success: true };
  });

/**
 * Get pending invitations for current user
 */
export const getPendingInvitationsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // For now, return empty array as we don't have an invitations table yet
    // This will be implemented when we add the invitations table
    return [];
  });

/**
 * Accept an invitation to join an organization
 */
export const acceptInvitationProcedure = protectedProcedure
  .input(z.object({ invitationId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // This will be implemented when we add the invitations table
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Invitations feature coming soon",
    });
  });

/**
 * Reject an invitation to join an organization
 */
export const rejectInvitationProcedure = protectedProcedure
  .input(z.object({ invitationId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // This will be implemented when we add the invitations table
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "Invitations feature coming soon",
    });
  });

/**
 * Get team member details
 */
export const getMemberDetailsProcedure = protectedProcedure
  .input(z.object({ userId: z.number() }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_members");

    const db = await getDb();
    if (!db) return null;

    const member = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, input.userId),
          eq(users.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (member.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
    }

    return member[0];
  });

/**
 * Search for users to invite
 */
export const searchUsersToInviteProcedure = protectedProcedure
  .input(z.object({ query: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "manage_members");

    const db = await getDb();
    if (!db) return [];

    // Search for users by email or name that are not in the organization
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        userRole: users.userRole,
      })
      .from(users)
      .where(
        and(
          // Not in the current organization
          ne(users.organizationId, ctx.user.organizationId),
          // Match search query
          like(users.email, `%${input.query}%`)
        )
      )
      .limit(10);

    return results;
  });

/**
 * Bulk invite users to organization
 */
export const bulkInviteUsersProcedure = protectedProcedure
  .input(
    z.object({
      emails: z.array(z.string().email()),
      role: z.enum(["boardMember", "secretary", "administrator", "complianceOfficer"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "manage_members");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const results = [];

    for (const email of input.emails) {
      try {
        // Check if user exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser.length === 0) {
          results.push({
            email,
            success: false,
            message: "User not found",
          });
          continue;
        }

        // Check if user is already in organization
        if (existingUser[0].organizationId === ctx.user.organizationId) {
          results.push({
            email,
            success: false,
            message: "User already in organization",
          });
          continue;
        }

        // Add user to organization
        await db
          .update(users)
          .set({
            organizationId: ctx.user.organizationId,
            userRole: input.role,
          })
          .where(eq(users.id, existingUser[0].id));

        results.push({
          email,
          success: true,
          message: "User added successfully",
        });
      } catch (error) {
        results.push({
          email,
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  });

export const teamRouter = router({
  removeMember: removeMemberProcedure,
  updateMemberRole: updateMemberRoleProcedure,
  getPendingInvitations: getPendingInvitationsProcedure,
  acceptInvitation: acceptInvitationProcedure,
  rejectInvitation: rejectInvitationProcedure,
  getMemberDetails: getMemberDetailsProcedure,
  searchUsersToInvite: searchUsersToInviteProcedure,
  bulkInviteUsers: bulkInviteUsersProcedure,
});
