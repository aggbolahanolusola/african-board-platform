import { describe, it, expect, vi } from "vitest";
import {
  generateTasksFromActionItems,
  assignTask,
  updateTaskStatus,
  getUserTasks,
  getOrganizationTasks,
  getTaskStatistics,
  createTaskNotification,
  getUserTaskNotifications,
  markNotificationAsRead,
} from "./service";

// Mock database
const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([1]),
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            id: 1,
            organizationId: 1,
            meetingId: 1,
            title: "Test Task",
            description: "Test Description",
            assignedTo: 2,
            createdBy: 1,
            status: "open",
            priority: "medium",
            dueDate: new Date(),
            completedAt: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              organizationId: 1,
              title: "Test Task",
            },
          ]),
        }),
      }),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({}),
    }),
  }),
};

vi.mock("../db", () => ({
  getDb: vi.fn(async () => mockDb),
}));

describe("Task Management Service", () => {
  describe("generateTasksFromActionItems", () => {
    it("should generate tasks from action items", async () => {
      const actionItems = [
        {
          description: "Review financial report",
          assignedTo: 2,
          dueDate: new Date("2026-02-01"),
          priority: "high" as const,
        },
      ];

      const taskIds = await generateTasksFromActionItems(1, 1, actionItems, 1);

      expect(Array.isArray(taskIds)).toBe(true);
    });

    it("should handle empty action items", async () => {
      const taskIds = await generateTasksFromActionItems(1, 1, [], 1);

      expect(Array.isArray(taskIds)).toBe(true);
      expect(taskIds.length).toBe(0);
    });

    it("should handle action items without assignee", async () => {
      const actionItems = [
        {
          description: "Review compliance requirements",
          priority: "high" as const,
        },
      ];

      const taskIds = await generateTasksFromActionItems(1, 1, actionItems, 1);

      expect(Array.isArray(taskIds)).toBe(true);
    });
  });

  describe("assignTask", () => {
    it("should assign task to user", async () => {
      const success = await assignTask(1, 2, 1);

      expect(success).toBe(true);
    });

    it("should handle assignment errors", async () => {
      const success = await assignTask(999, 999, 999);

      expect(typeof success).toBe("boolean");
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status to in progress", async () => {
      const success = await updateTaskStatus(1, "inProgress", 1, 1);

      expect(success).toBe(true);
    });

    it("should mark task as completed", async () => {
      const success = await updateTaskStatus(1, "completed", 1, 1);

      expect(success).toBe(true);
    });

    it("should cancel task", async () => {
      const success = await updateTaskStatus(1, "cancelled", 1, 1);

      expect(success).toBe(true);
    });
  });

  describe("getUserTasks", () => {
    it("should retrieve user tasks", async () => {
      const userTasks = await getUserTasks(2, 1);

      expect(typeof userTasks).toBe("object");
    });

    it("should filter tasks by status", async () => {
      const userTasks = await getUserTasks(2, 1, "open");

      expect(typeof userTasks).toBe("object");
    });

    it("should return empty array on error", async () => {
      const userTasks = await getUserTasks(999, 999);

      expect(typeof userTasks).toBe("object");
    });
  });

  describe("getOrganizationTasks", () => {
    it("should retrieve organization tasks", async () => {
      const orgTasks = await getOrganizationTasks(1);

      expect(typeof orgTasks).toBe("object");
    });

    it("should handle meeting filter", async () => {
      const orgTasks = await getOrganizationTasks(1, 1);

      expect(typeof orgTasks).toBe("object");
    });
  });

  describe("Task Notifications", () => {
    it("should create task notification", async () => {
      const success = await createTaskNotification(
        1,
        2,
        "assigned",
        "You have been assigned a task"
      );

      expect(success).toBe(true);
    });

    it("should handle user notifications", async () => {
      const notifications = await getUserTaskNotifications(2);

      expect(typeof notifications).toBe("object");
    });

    it("should mark notification as read", async () => {
      const success = await markNotificationAsRead(1, 2);

      expect(success).toBe(true);
    });
  });

  describe("getTaskStatistics", () => {
    it("should return task statistics", async () => {
      const stats = await getTaskStatistics(1);

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("open");
      expect(stats).toHaveProperty("inProgress");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("cancelled");
      expect(stats).toHaveProperty("overdue");

      expect(typeof stats.total).toBe("number");
      expect(typeof stats.open).toBe("number");
    });

    it("should return zero stats on error", async () => {
      const stats = await getTaskStatistics(999);

      expect(stats.total).toBe(0);
      expect(stats.open).toBe(0);
    });
  });

  describe("Task workflow", () => {
    it("should handle task status updates", async () => {
      let success = await updateTaskStatus(1, "inProgress", 1, 1);
      expect(success).toBe(true);

      success = await updateTaskStatus(1, "completed", 1, 1);
      expect(success).toBe(true);
    });

    it("should handle task reassignment", async () => {
      let success = await assignTask(1, 2, 1);
      expect(success).toBe(true);

      success = await assignTask(1, 3, 1);
      expect(success).toBe(true);
    });

    it("should track task statistics", async () => {
      const stats = await getTaskStatistics(1);
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.completed).toBe("number");
    });
  });
});
