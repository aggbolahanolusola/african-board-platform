/**
 * Builds tRPC callers for tests. `callerFor(user)` returns an appRouter caller
 * whose context is authenticated as the given user (or anonymous when null),
 * mirroring how a real request reaches a procedure.
 */
import { vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import type { User } from "../../drizzle/schema";

export function mockContext(user: User | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

export function callerFor(user: User | null) {
  return appRouter.createCaller(mockContext(user));
}
