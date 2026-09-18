import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import {
  generateTasksFromActionItems,
  assignTask,
  updateTaskStatus,
  getUserTasks,
  getOrganizationTasks,
  getUserTaskNotifications,
  markNotificationAsRead,
  getTaskStatistics,
} from "./service";

/**
 * Generate tasks from action items
 */
export const generateTasks = protectedProcedure
  .input(
    z.object({
      meetingId: z.number(),
      actionItems: z.array(
        z.object({
          description: z.string(),
          assignedTo: z.number().optional(),
          dueDate: z.date().optional(),
          priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        })
      ),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const taskIds = await generateTasksFromActionItems(
      ctx.user.organizationId,
      input.meetingId,
      input.actionItems,
      ctx.user.id
    );

    return {
      success: true,
      taskIds,
      message: `Created ${taskIds.length} tasks from action items`,
    };
  });

/**
 * Assign task to user
 */
export const assignTaskProcedure = protectedProcedure
  .input(
    z.object({
      taskId: z.number(),
      userId: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const success = await assignTask(
      input.taskId,
      input.userId,
      ctx.user.organizationId
    );

    return {
      success,
      message: success ? "Task assigned successfully" : "Failed to assign task",
    };
  });

/**
 * Update task status
 */
export const updateTaskStatusProcedure = protectedProcedure
  .input(
    z.object({
      taskId: z.number(),
      status: z.enum(["open", "inProgress", "completed", "cancelled"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const success = await updateTaskStatus(
      input.taskId,
      input.status,
      ctx.user.organizationId,
      ctx.user.id
    );

    return {
      success,
      message: success ? "Task status updated" : "Failed to update task status",
    };
  });

/**
 * Get user's tasks
 */
export const getUserTasksProcedure = protectedProcedure
  .input(
    z.object({
      status: z.enum(["open", "inProgress", "completed", "cancelled"]).optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const userTasks = await getUserTasks(
      ctx.user.id,
      ctx.user.organizationId,
      input.status
    );

    return userTasks;
  });

/**
 * Get organization tasks
 */
export const getOrgTasksProcedure = protectedProcedure
  .input(
    z.object({
      meetingId: z.number().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const orgTasks = await getOrganizationTasks(
      ctx.user.organizationId,
      input.meetingId
    );

    return orgTasks;
  });

/**
 * Get user task notifications
 */
export const getNotificationsProcedure = protectedProcedure
  .input(
    z.object({
      unreadOnly: z.boolean().default(true),
    })
  )
  .query(async ({ ctx, input }) => {
    const notifications = await getUserTaskNotifications(
      ctx.user!.id,
      input.unreadOnly
    );

    return notifications;
  });

/**
 * Mark notification as read
 */
export const markNotificationReadProcedure = protectedProcedure
  .input(
    z.object({
      notificationId: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const success = await markNotificationAsRead(
      input.notificationId,
      ctx.user!.id
    );

    return {
      success,
      message: success ? "Notification marked as read" : "Failed to mark notification",
    };
  });

/**
 * Get task statistics
 */
export const getTaskStatsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    if (!ctx.user?.organizationId) {
      throw new Error("User must belong to an organization");
    }

    const stats = await getTaskStatistics(ctx.user.organizationId);

    return stats;
  }
);
