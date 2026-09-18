import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import {
  meetings,
  meetingParticipants,
  agendas,
  users,
} from "../../drizzle/schema";
import { requirePermission } from "../permissions";

/**
 * Update a meeting
 */
export const updateMeetingProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      scheduledAt: z.date().optional(),
      endTime: z.date().optional(),
      timezone: z.string().optional(),
      location: z.string().optional(),
      meetingType: z.enum(["board", "committee", "annual", "special"]).optional(),
      status: z.enum(["scheduled", "inProgress", "completed", "cancelled"]).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
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

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt;
    if (input.endTime !== undefined) updateData.endTime = input.endTime;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.meetingType !== undefined) updateData.meetingType = input.meetingType;
    if (input.status !== undefined) updateData.status = input.status;

    await db
      .update(meetings)
      .set(updateData)
      .where(eq(meetings.id, input.meetingId));

    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.id, input.meetingId))
      .limit(1);
  });

/**
 * Delete a meeting
 */
export const deleteMeetingProcedure = protectedProcedure
  .input(z.object({ meetingId: z.number() }))
  .mutation(async ({ ctx, input }) => {
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

    // Delete related records
    await db
      .delete(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, input.meetingId));

    await db
      .delete(agendas)
      .where(eq(agendas.meetingId, input.meetingId));

    // Delete the meeting
    await db.delete(meetings).where(eq(meetings.id, input.meetingId));

    return { success: true };
  });

/**
 * Add a participant to a meeting
 */
export const addParticipantProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      userId: z.number(),
      status: z.enum(["invited", "accepted", "declined", "attended", "absent"]).default("invited"),
    })
  )
  .mutation(async ({ ctx, input }) => {
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

    // Verify user is in the same organization
    const user = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, input.userId),
          eq(users.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (user.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Check if participant already exists
    const existing = await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, input.meetingId),
          eq(meetingParticipants.userId, input.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User is already a participant",
      });
    }

    const result = await db.insert(meetingParticipants).values({
      meetingId: input.meetingId,
      userId: input.userId,
      status: input.status,
    });

    return result;
  });

/**
 * Remove a participant from a meeting
 */
export const removeParticipantProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      userId: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
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

    await db
      .delete(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, input.meetingId),
          eq(meetingParticipants.userId, input.userId)
        )
      );

    return { success: true };
  });

/**
 * Update participant status
 */
export const updateParticipantStatusProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      userId: z.number(),
      status: z.enum(["invited", "accepted", "declined", "attended", "absent"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

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

    // Check if participant exists
    const participant = await db
      .select()
      .from(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, input.meetingId),
          eq(meetingParticipants.userId, input.userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Participant not found",
      });
    }

    // Update status
    await db
      .update(meetingParticipants)
      .set({ status: input.status })
      .where(
        and(
          eq(meetingParticipants.meetingId, input.meetingId),
          eq(meetingParticipants.userId, input.userId)
        )
      );

    return { success: true };
  });

/**
 * Get meeting participants
 */
export const getParticipantsProcedure = protectedProcedure
  .input(z.object({ meetingId: z.number() }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_meeting");

    const db = await getDb();
    if (!db) return [];

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

    // Get participants with user details
    return await db
      .select({
        id: meetingParticipants.id,
        meetingId: meetingParticipants.meetingId,
        userId: meetingParticipants.userId,
        status: meetingParticipants.status,
        joinedAt: meetingParticipants.joinedAt,
        leftAt: meetingParticipants.leftAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.userRole,
      })
      .from(meetingParticipants)
      .innerJoin(users, eq(meetingParticipants.userId, users.id))
      .where(eq(meetingParticipants.meetingId, input.meetingId));
  });

/**
 * Get meeting with participants
 */
export const getMeetingDetailsProcedure = protectedProcedure
  .input(z.object({ meetingId: z.number() }))
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "view_meeting");

    const db = await getDb();
    if (!db) return null;

    // Get meeting
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

    // Get participants
    const participants = await db
      .select({
        id: meetingParticipants.id,
        meetingId: meetingParticipants.meetingId,
        userId: meetingParticipants.userId,
        status: meetingParticipants.status,
        joinedAt: meetingParticipants.joinedAt,
        leftAt: meetingParticipants.leftAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.userRole,
      })
      .from(meetingParticipants)
      .innerJoin(users, eq(meetingParticipants.userId, users.id))
      .where(eq(meetingParticipants.meetingId, input.meetingId));

    // Get agendas
    const agendaItems = await db
      .select()
      .from(agendas)
      .where(eq(agendas.meetingId, input.meetingId));

    return {
      ...meeting[0],
      participants,
      agendas: agendaItems,
    };
  });

/**
 * Create agenda item
 */
export const createAgendaProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      duration: z.number().optional(),
      orderIndex: z.number().default(0),
    })
  )
  .mutation(async ({ ctx, input }) => {
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

    const result = await db.insert(agendas).values({
      meetingId: input.meetingId,
      title: input.title,
      description: input.description,
      duration: input.duration,
      orderIndex: input.orderIndex,
    });

    return result;
  });

/**
 * Update agenda item
 */
export const updateAgendaProcedure = protectedProcedure
  .input(
    z.object({
      agendaId: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      duration: z.number().optional(),
      status: z.enum(["pending", "inProgress", "completed"]).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "create_meeting");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Verify agenda belongs to a meeting in user's organization
    const agenda = await db
      .select()
      .from(agendas)
      .innerJoin(meetings, eq(agendas.meetingId, meetings.id))
      .where(
        and(
          eq(agendas.id, input.agendaId),
          eq(meetings.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (agenda.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agenda not found" });
    }

    const updateData: Record<string, any> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.status !== undefined) updateData.status = input.status;

    await db.update(agendas).set(updateData).where(eq(agendas.id, input.agendaId));

    return { success: true };
  });

/**
 * Delete agenda item
 */
export const deleteAgendaProcedure = protectedProcedure
  .input(z.object({ agendaId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, "create_meeting");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Verify agenda belongs to a meeting in user's organization
    const agenda = await db
      .select()
      .from(agendas)
      .innerJoin(meetings, eq(agendas.meetingId, meetings.id))
      .where(
        and(
          eq(agendas.id, input.agendaId),
          eq(meetings.organizationId, ctx.user.organizationId)
        )
      )
      .limit(1);

    if (agenda.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agenda not found" });
    }

    await db.delete(agendas).where(eq(agendas.id, input.agendaId));

    return { success: true };
  });

export const meetingRouter = router({
  update: updateMeetingProcedure,
  delete: deleteMeetingProcedure,
  addParticipant: addParticipantProcedure,
  removeParticipant: removeParticipantProcedure,
  updateParticipantStatus: updateParticipantStatusProcedure,
  getParticipants: getParticipantsProcedure,
  getDetails: getMeetingDetailsProcedure,
  createAgenda: createAgendaProcedure,
  updateAgenda: updateAgendaProcedure,
  deleteAgenda: deleteAgendaProcedure,
});
