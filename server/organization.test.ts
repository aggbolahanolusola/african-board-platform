import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import "./test/env";

const dbConfigured = !!process.env.DATABASE_URL;

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(organizationId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    organizationId: organizationId,
    userRole: "administrator",
    passwordHash: null,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

(dbConfigured ? describe : describe.skip)("Organization Dashboard", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  describe("organization.getStats", () => {
    it("should return organization stats for authenticated user", async () => {
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.organization.getStats();

      expect(stats).toBeDefined();
      expect(stats.memberCount).toBeGreaterThanOrEqual(0);
    });

    it("should throw error if user is not authenticated", async () => {
      const unauthenticatedCtx = {
        ...ctx,
        user: null,
      } as unknown as TrpcContext;

      const caller = appRouter.createCaller(unauthenticatedCtx);

      try {
        await caller.organization.getStats();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("organization.getMembers", () => {
    it("should return organization members", async () => {
      const caller = appRouter.createCaller(ctx);
      const members = await caller.organization.getMembers();

      expect(Array.isArray(members)).toBe(true);
    });
  });

  describe("organization.addMember", () => {
    it("should add a new member to the organization", async () => {
      const caller = appRouter.createCaller(ctx);
      const result = await caller.organization.addMember({
        email: "newmember@example.com",
        role: "boardMember",
      });

      expect(result.success).toBe(true);
      expect(result.memberId).toBeGreaterThan(0);
    });
  });

  describe("organization.removeMember", () => {
    it("should remove a member from the organization", async () => {
      const caller = appRouter.createCaller(ctx);

      // First add a member
      const addResult = await caller.organization.addMember({
        email: "membertoremove@example.com",
        role: "boardMember",
      });

      // Verify the member was added
      expect(addResult.success).toBe(true);
      expect(addResult.memberId).toBeGreaterThan(0);

      // Then remove the member
      const removeResult = await caller.organization.removeMember({
        userId: addResult.memberId,
      });

      expect(removeResult.success).toBe(true);
    });
  });

  describe("organization.getBillingHistory", () => {
    it("should return billing history", async () => {
      const caller = appRouter.createCaller(ctx);
      const history = await caller.organization.getBillingHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("organization.getUsageStats", () => {
    it("should return usage stats for authenticated user", async () => {
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.organization.getUsageStats();

      expect(stats).toBeDefined();
      expect(stats.members).toBeGreaterThanOrEqual(0);
      expect(stats.maxMembers).toBeGreaterThanOrEqual(0);
      expect(stats.memberUsagePercent).toBeGreaterThanOrEqual(0);
      expect(stats.storageUsed).toBeGreaterThanOrEqual(0);
      expect(stats.storageLimit).toBeGreaterThanOrEqual(0);
      expect(stats.storageUsagePercent).toBeGreaterThanOrEqual(0);
    });

    it("should calculate member usage percentage correctly", async () => {
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.organization.getUsageStats();

      const expectedPercentage = (stats.members / stats.maxMembers) * 100;
      expect(stats.memberUsagePercent).toBe(expectedPercentage);
    });

    it("should calculate storage usage percentage correctly", async () => {
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.organization.getUsageStats();

      const expectedPercentage = (stats.storageUsed / stats.storageLimit) * 100;
      expect(stats.storageUsagePercent).toBe(expectedPercentage);
    });

    it("should throw error if user is not authenticated", async () => {
      const unauthenticatedCtx = {
        ...ctx,
        user: null,
      } as unknown as TrpcContext;

      const caller = appRouter.createCaller(unauthenticatedCtx);

      try {
        await caller.organization.getUsageStats();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("Dashboard Data Consistency", () => {
    it("should return consistent data across multiple calls", async () => {
      const caller = appRouter.createCaller(ctx);

      const stats1 = await caller.organization.getUsageStats();
      const stats2 = await caller.organization.getUsageStats();

      expect(stats1.members).toBe(stats2.members);
      expect(stats1.storageUsed).toBe(stats2.storageUsed);
      expect(stats1.meetingsThisMonth).toBe(stats2.meetingsThisMonth);
    });

    it("should have valid usage percentages (0-100)", async () => {
      const caller = appRouter.createCaller(ctx);
      const stats = await caller.organization.getUsageStats();

      expect(stats.memberUsagePercent).toBeGreaterThanOrEqual(0);
      expect(stats.memberUsagePercent).toBeLessThanOrEqual(100);
      expect(stats.storageUsagePercent).toBeGreaterThanOrEqual(0);
      expect(stats.storageUsagePercent).toBeLessThanOrEqual(100);
    });
  });
});
