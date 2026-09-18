import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Procedure that additionally guarantees the caller belongs to an organization.
 *
 * It exposes a non-null `ctx.organizationId` derived from the authenticated
 * session. Resource lookups in org-scoped procedures should always filter by
 * `ctx.organizationId` (never a client-supplied organizationId) to prevent
 * horizontal privilege escalation / IDOR.
 */
export const orgScopedProcedure = protectedProcedure.use(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user.organizationId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must belong to an organization to perform this action",
    });
  }

  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.user.organizationId,
    },
  });
});

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
