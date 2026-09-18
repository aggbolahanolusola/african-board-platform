import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { tasks, taskNotifications, actionItems, users } from "../../drizzle/schema";
import type { InsertTask, InsertTaskNotification } from "../../drizzle/schema";

/**
 * Generate tasks from action items extracted from meeting transcripts
 */
export async function generateTasksFromActionItems(
  organizationId: number,
  meetingId: number,
  actionItemsData: Array<{
    description: string;
    assignedTo?: number;
    dueDate?: Date;
    priority?: "low" | "medium" | "high" | "critical";
  }>,
  createdBy: number
): Promise<number[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const taskIds: number[] = [];

  for (const item of actionItemsData) {
    const taskData: InsertTask = {
      organizationId,
      meetingId,
      title: item.description.substring(0, 255),
      description: item.description,
      assignedTo: item.assignedTo,
      createdBy,
      status: "open",
      priority: item.priority || "medium",
      dueDate: item.dueDate,
    };

    try {
      await db.insert(tasks).values(taskData);
      const createdTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.organizationId, organizationId),
            eq(tasks.title, taskData.title)
          )
        )
        .orderBy(tasks.id)
        .limit(1);

      if (createdTasks.length > 0) {
        const taskId = createdTasks[0].id;
        taskIds.push(taskId);

        if (item.assignedTo) {
          await createTaskNotification(
            taskId,
            item.assignedTo,
            "assigned",
            `You have been assigned a new task: ${item.description.substring(0, 100)}`
          );
        }
      }
    } catch (error) {
      console.error("[Tasks] Failed to create task:", error);
    }
  }

  return taskIds;
}

/**
 * Assign a task to a user
 */
export async function assignTask(
  taskId: number,
  userId: number,
  organizationId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db
      .update(tasks)
      .set({ assignedTo: userId })
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId)));

    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (task.length > 0) {
      await createTaskNotification(
        taskId,
        userId,
        "assigned",
        `You have been assigned task: ${task[0].title}`
      );
    }

    return true;
  } catch (error) {
    console.error("[Tasks] Failed to assign task:", error);
    return false;
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: number,
  status: "open" | "inProgress" | "completed" | "cancelled",
  organizationId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const completedAt = status === "completed" ? new Date() : null;

    await db
      .update(tasks)
      .set({ status, completedAt })
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId)));

    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (task.length > 0 && task[0].createdBy !== userId) {
      await createTaskNotification(
        taskId,
        task[0].createdBy,
        "updated",
        `Task "${task[0].title}" status changed to ${status}`
      );
    }

    return true;
  } catch (error) {
    console.error("[Tasks] Failed to update task status:", error);
    return false;
  }
}

/**
 * Get tasks for a user
 */
export async function getUserTasks(
  userId: number,
  organizationId: number,
  status?: string
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    let whereConditions: any = and(
      eq(tasks.organizationId, organizationId),
      eq(tasks.assignedTo, userId)
    );

    if (status) {
      whereConditions = and(whereConditions, eq(tasks.status, status as any));
    }

    return await db.select().from(tasks).where(whereConditions);
  } catch (error) {
    console.error("[Tasks] Failed to get user tasks:", error);
    return [];
  }
}

/**
 * Get organization tasks
 */
export async function getOrganizationTasks(
  organizationId: number,
  meetingId?: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    let whereConditions: any = eq(tasks.organizationId, organizationId);

    if (meetingId) {
      whereConditions = and(whereConditions, eq(tasks.meetingId, meetingId));
    }

    return await db.select().from(tasks).where(whereConditions);
  } catch (error) {
    console.error("[Tasks] Failed to get organization tasks:", error);
    return [];
  }
}

/**
 * Create task notification
 */
export async function createTaskNotification(
  taskId: number,
  userId: number,
  type: "assigned" | "updated" | "commented" | "completed" | "overdue",
  message: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const notification: InsertTaskNotification = {
      taskId,
      userId,
      type,
      message,
      isRead: false,
    };

    await db.insert(taskNotifications).values(notification);
    return true;
  } catch (error) {
    console.error("[Tasks] Failed to create notification:", error);
    return false;
  }
}

/**
 * Get user task notifications
 */
export async function getUserTaskNotifications(
  userId: number,
  unreadOnly: boolean = true
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    let whereConditions: any = eq(taskNotifications.userId, userId);

    if (unreadOnly) {
      whereConditions = and(whereConditions, eq(taskNotifications.isRead, false));
    }

    return await db.select().from(taskNotifications).where(whereConditions);
  } catch (error) {
    console.error("[Tasks] Failed to get notifications:", error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

    try {
      const whereClause = and(
        eq(taskNotifications.id, notificationId),
        eq(taskNotifications.userId, userId)
      );
      if (whereClause) {
        await db
          .update(taskNotifications)
          .set({ isRead: true, readAt: new Date() } as any)
          .where(whereClause);
      }

    return true;
  } catch (error) {
    console.error("[Tasks] Failed to mark notification as read:", error);
    return false;
  }
}

/**
 * Get task statistics for organization
 */
export async function getTaskStatistics(organizationId: number): Promise<{
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId));

    const now = new Date();
    const stats = {
      total: allTasks.length,
      open: allTasks.filter((t) => t.status === "open").length,
      inProgress: allTasks.filter((t) => t.status === "inProgress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      cancelled: allTasks.filter((t) => t.status === "cancelled").length,
      overdue: allTasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.status !== "cancelled" &&
          t.dueDate &&
          t.dueDate < now
      ).length,
    };

    return stats;
  } catch (error) {
    console.error("[Tasks] Failed to get statistics:", error);
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      overdue: 0,
    };
  }
}
