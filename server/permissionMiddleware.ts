import { initTRPC, TRPCError } from "@trpc/server";
import { requirePermission, requireAnyPermission, requireAllPermissions, type Permission } from "./permissions";
import type { TrpcContext } from "./_core/context";

const t = initTRPC.context<TrpcContext>().create();

/**
 * Middleware that requires a specific permission
 */
export function requirePermissionMiddleware(permission: Permission) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requirePermission(ctx.user, permission);
    return next();
  });
}

/**
 * Middleware that requires any of the specified permissions
 */
export function requireAnyPermissionMiddleware(permissions: Permission[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requireAnyPermission(ctx.user, permissions);
    return next();
  });
}

/**
 * Middleware that requires all of the specified permissions
 */
export function requireAllPermissionsMiddleware(permissions: Permission[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    requireAllPermissions(ctx.user, permissions);
    return next();
  });
}

/**
 * Create a procedure that requires a specific permission
 */
export const permissionProcedure = (permission: Permission) =>
  t.procedure.use(requirePermissionMiddleware(permission));

/**
 * Create a procedure that requires any of the specified permissions
 */
export const anyPermissionProcedure = (permissions: Permission[]) =>
  t.procedure.use(requireAnyPermissionMiddleware(permissions));

/**
 * Create a procedure that requires all of the specified permissions
 */
export const allPermissionsProcedure = (permissions: Permission[]) =>
  t.procedure.use(requireAllPermissionsMiddleware(permissions));
