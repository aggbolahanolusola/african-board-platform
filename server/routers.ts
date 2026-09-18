import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getOrganizationById,
  getMeetingsByOrganization,
  getDocumentsByOrganization,
  getComplianceLogsByOrganization,
  getAuditLogsByOrganization,
  getDb,
} from "./db";

import {
  meetings,
  documents,
  complianceLogs,
  auditLogs,
  subscriptionPlans,
  organizationSubscriptions,
  users,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { createCheckoutSession, getStripeSubscriptionDetails } from "./stripe/subscriptions";
import { getStripePublishableKey } from "./stripe/client";
import { exportRouter } from "./export/procedures";
import { emailVerificationRouter } from "./auth/emailVerification.procedures";
import { profileRouter } from "./auth/profile.procedures";
import { requirePermission } from "./permissions";
import { createRememberMeToken, verifyRememberMeToken, revokeRememberMeToken, revokeAllUserTokens, REMEMBER_ME_CONFIG } from "./rememberMe";
import { uploadDocumentProcedure, getStorageInfoProcedure, deleteDocumentProcedure } from "./documents/upload.procedures";
import { createVoteProcedure, castVoteProcedure, closeVoteProcedure, getVoteProcedure, getVotesProcedure, createResolutionProcedure, getResolutionsProcedure } from "./voting/procedures";
import { meetingRouter } from "./meetings/procedures";
import { teamRouter } from "./team/procedures";
import { recordingRouter } from "./recordings/procedures";
import { nigerianComplianceRouter } from "./compliance/nigerian-procedures";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    signUp: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(12, "Password must be at least 12 characters"),
      }))
      .mutation(async ({ input }) => {
        const { createUserAccount } = await import("./auth/signup");
        const { validatePasswordStrength } = await import("./auth/passwordValidation");

        // Validate password strength on server
        const validation = validatePasswordStrength(input.password);
        if (!validation.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Password does not meet security requirements: ${validation.errors.join(", ")}`,
          });
        }

        return createUserAccount(input);
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1, "Password is required"),
        rememberMe: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const { authenticateUser } = await import("./auth/login");
        const result = await authenticateUser(input.email, input.password);
        if (result.success && result.user) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, result.token, cookieOptions);

          if (input.rememberMe) {
            try {
              const userAgent = ctx.req.headers['user-agent'];
              const rememberToken = await createRememberMeToken(
                result.user.id,
                userAgent,
                ctx.req.headers['x-forwarded-for'] as string | undefined
              );
              ctx.res.cookie(REMEMBER_ME_CONFIG.COOKIE_NAME, rememberToken, REMEMBER_ME_CONFIG.COOKIE_OPTIONS);
            } catch (error) {
              console.error('[RememberMe] Failed to create token:', error);
            }
          }
        }
        return result;
      }),
    loginWithRememberMe: publicProcedure
      .input(z.object({
        rememberToken: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const userAgent = ctx.req.headers['user-agent'];
          const verified = await verifyRememberMeToken(input.rememberToken, userAgent);

          if (!verified) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Invalid or expired remember me token',
            });
          }

          const db = await getDb();
          if (!db) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
          }

          const { users } = await import('../drizzle/schema');
          const userResult = await db.select().from(users).where(eq(users.id, verified.userId)).limit(1);

          if (!userResult.length) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
          }

          const user = userResult[0];
          if (!process.env.JWT_SECRET) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'JWT_SECRET is not configured',
            });
          }
          // Mint a short-lived session token compatible with sdk.verifySession.
          const { sdk } = await import('./_core/sdk');
          const { ENV } = await import('./_core/env');
          const { SESSION_TOKEN_TTL_MS } = await import('@shared/const');
          const sessionToken = await sdk.signSession(
            {
              openId: user.openId,
              appId: ENV.appId,
              name: user.name || user.email || user.openId,
            },
            { expiresInMs: SESSION_TOKEN_TTL_MS }
          );

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

          return {
            success: true,
            user,
            token: sessionToken,
          };
        } catch (error) {
          console.error('[RememberMe] Login failed:', error);
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: error instanceof Error ? error.message : 'Remember me login failed',
          });
        }
      }),
    revokeRememberMe: protectedProcedure
      .mutation(async ({ ctx }) => {
        try {
          const rememberToken = ctx.req.headers.cookie
            ?.split(';')
            .find(c => c.trim().startsWith(REMEMBER_ME_CONFIG.COOKIE_NAME))
            ?.split('=')?.[1];

          if (rememberToken) {
            await revokeRememberMeToken(rememberToken);
          }

          ctx.res.clearCookie(REMEMBER_ME_CONFIG.COOKIE_NAME, { path: '/' });

          return { success: true };
        } catch (error) {
          console.error('[RememberMe] Revoke failed:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to revoke remember me token',
          });
        }
      }),
    revokeAllRememberMe: protectedProcedure
      .mutation(async ({ ctx }) => {
        try {
          if (!ctx.user) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
          }

          await revokeAllUserTokens(ctx.user.id);
          ctx.res.clearCookie(REMEMBER_ME_CONFIG.COOKIE_NAME, { path: '/' });

          return { success: true };
        } catch (error) {
          console.error('[RememberMe] Revoke all failed:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to revoke all remember me tokens',
          });
        }
      }),
    verifyEmail: emailVerificationRouter.verifyEmail,
    getPendingToken: emailVerificationRouter.getPendingToken,
    resendVerificationEmail: emailVerificationRouter.resendVerificationEmail,
    checkEmailStatus: emailVerificationRouter.checkEmailStatus,
    updateProfile: profileRouter.updateProfile,
    changePassword: profileRouter.changePassword,
    getProfile: profileRouter.getProfile,
    resendVerificationEmailFromSettings: profileRouter.resendVerificationEmailFromSettings,
  }),

  // Organization routers
  organization: router({
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
        }
        const { createOrganization } = await import('./organization');
        const result = await createOrganization(
          input.name,
          'Unknown',
          'UTC',
          []
        );

        // Assign user to the newly created organization
        const db = await getDb();
        if (db && result.organizationId) {
          await db
            .update(users)
            .set({ organizationId: result.organizationId, userRole: 'administrator' })
            .where(eq(users.id, ctx.user.id));
        }

        return result;
      }),
    getById: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        return getOrganizationById(ctx.user.organizationId);
      }),
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.organizationId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const { getOrganizationStats } = await import("./organization");
      return getOrganizationStats(ctx.user.organizationId);
    }),
    getMembers: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.organizationId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      requirePermission(ctx.user, "view_members");
      const { getOrganizationMembers } = await import("./organization");
      return getOrganizationMembers(ctx.user.organizationId);
    }),
    addMember: protectedProcedure
      .input(z.object({ email: z.string().email(), role: z.enum(["boardMember", "secretary", "administrator", "complianceOfficer"]) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "manage_members");
        const { addOrganizationMember } = await import("./organization");
        return addOrganizationMember(ctx.user.organizationId, input.email, input.role);
      }),
    removeOrgMember: protectedProcedure
      .input(z.object({ memberId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "manage_members");
        const { removeOrganizationMember } = await import("./organization");
        return removeOrganizationMember(ctx.user.organizationId, input.memberId);
      }),
    getBillingHistory: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.organizationId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      requirePermission(ctx.user, "view_billing");
      const { getOrganizationBillingHistory } = await import("./organization");
      return getOrganizationBillingHistory(ctx.user.organizationId);
    }),
    getUsageStats: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.organizationId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }
      const { getOrganizationUsageStats } = await import("./organization");
      return getOrganizationUsageStats(ctx.user.organizationId);
    }),
    removeMember: teamRouter.removeMember,
    updateMemberRole: teamRouter.updateMemberRole,
    getPendingInvitations: teamRouter.getPendingInvitations,
    acceptInvitation: teamRouter.acceptInvitation,
    rejectInvitation: teamRouter.rejectInvitation,
    getMemberDetails: teamRouter.getMemberDetails,
    searchUsersToInvite: teamRouter.searchUsersToInvite,
    bulkInviteUsers: teamRouter.bulkInviteUsers
  }),

  // Meeting routers
  meeting: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "view_meeting");
        return getMeetingsByOrganization(ctx.user.organizationId);
      }),
    getById: protectedProcedure
      .input(z.object({ meetingId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "view_meeting");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Scope lookup to the caller's organization to prevent cross-org access (IDOR)
        const result = await db
          .select()
          .from(meetings)
          .where(
            and(
              eq(meetings.id, input.meetingId),
              eq(meetings.organizationId, ctx.user.organizationId)
            )
          )
          .limit(1);
        if (result.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
        }
        return result[0];
      }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          scheduledAt: z.date(),
          timezone: z.string(),
          meetingType: z.enum(["board", "committee", "annual", "special"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "create_meeting");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
        const result = await db.insert(meetings).values({
          organizationId: ctx.user.organizationId,
          title: input.title,
          description: input.description,
          scheduledAt: input.scheduledAt,
          timezone: input.timezone,
          meetingType: input.meetingType,
          status: "scheduled",
          createdBy: ctx.user.id,
        });
        return result;
      }),
    update: meetingRouter.update,
    delete: meetingRouter.delete,
    addParticipant: meetingRouter.addParticipant,
    removeParticipant: meetingRouter.removeParticipant,
    updateParticipantStatus: meetingRouter.updateParticipantStatus,
    getParticipants: meetingRouter.getParticipants,
    getDetails: meetingRouter.getDetails,
    createAgenda: meetingRouter.createAgenda,
    updateAgenda: meetingRouter.updateAgenda,
    deleteAgenda: meetingRouter.deleteAgenda,
  }),

  // Recording routers
  recording: recordingRouter,

  // Document routers
  document: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "view_document");
        return getDocumentsByOrganization(ctx.user.organizationId);
      }),
  }),

  // Compliance routers
  compliance: router({
    getLogs: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "view_compliance");
        return getComplianceLogsByOrganization(ctx.user.organizationId);
      }),
    getFrameworks: nigerianComplianceRouter.getFrameworks,
    getFramework: nigerianComplianceRouter.getFramework,
    getRequirements: nigerianComplianceRouter.getRequirements,
    getCAMA2020: nigerianComplianceRouter.getCAMA2020,
    getNCCG: nigerianComplianceRouter.getNCCG,
    getISA: nigerianComplianceRouter.getISA,
    checkCompliance: nigerianComplianceRouter.checkCompliance,
    getSummary: nigerianComplianceRouter.getSummary,
  }),

  // Audit routers
  audit: router({
    getLogs: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "view_compliance");
        return getAuditLogsByOrganization(ctx.user.organizationId);
      }),
  }),

  // Subscription routers
  subscription: router({
    getPlans: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
      } catch (error) {
        console.error("[Subscription] getPlans query failed (database unreachable?):", error);
        return [];
      }
    }),
    getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.organizationId) return null;
      const db = await getDb();
      if (!db) return null;
      try {
        const result = await db
          .select()
          .from(organizationSubscriptions)
          .where(eq(organizationSubscriptions.organizationId, ctx.user.organizationId))
          .limit(1);
        return result[0] || null;
      } catch (error) {
        console.error("[Subscription] getCurrentSubscription query failed:", error);
        return null;
      }
    }),
    getLimits: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.organizationId) return null;
      try {
        const { getSubscriptionLimits } = await import("./featureGates");
        return await getSubscriptionLimits(ctx.user.organizationId);
      } catch (error) {
        console.error("[Subscription] getLimits failed:", error);
        return null;
      }
    }),
    getSubscriptionDetails: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.organizationId) return null;
      const db = await getDb();
      if (!db) return null;

      try {
        const result = await db
          .select({
            subscription: organizationSubscriptions,
            plan: subscriptionPlans,
          })
          .from(organizationSubscriptions)
          .innerJoin(
            subscriptionPlans,
            eq(organizationSubscriptions.planId, subscriptionPlans.id)
          )
          .where(eq(organizationSubscriptions.organizationId, ctx.user.organizationId))
          .limit(1);

        if (!result.length) return null;

        const { subscription, plan } = result[0];
        return {
          planName: plan.name,
          planSlug: plan.slug,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          billingCycle: subscription.billingCycle,
        };
      } catch (error) {
        console.error("[Subscription] getSubscriptionDetails query failed:", error);
        return null;
      }
    }),
  }),

  // Stripe payment routers
  payment: router({
    createCheckout: protectedProcedure
      .input(z.object({ planSlug: z.enum(["starter", "professional", "enterprise"]), billingInterval: z.enum(["monthly", "yearly"]) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "manage_billing");
        if (!ctx.user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "User email not found" });
        }
        const origin = ctx.req.headers.origin || "https://nurtgov.com";
        const successUrl = `${origin}/dashboard?subscription=success`;
        const cancelUrl = `${origin}/pricing?subscription=cancelled`;
        return createCheckoutSession(
          ctx.user.organizationId,
          input.planSlug,
          input.billingInterval,
          ctx.user.email,
          ctx.user.name || "User",
          successUrl,
          cancelUrl
        );
      }),
    getPublishableKey: publicProcedure.query(() => {
      return { publishableKey: getStripePublishableKey() };
    }),
    getSubscriptionDetails: protectedProcedure
      .input(z.object({ stripeSubscriptionId: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user?.organizationId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
        }
        requirePermission(ctx.user, "view_billing");
        // Verify the requested Stripe subscription belongs to the caller's org (prevents IDOR)
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const owned = await db
          .select({ id: organizationSubscriptions.id })
          .from(organizationSubscriptions)
          .where(
            and(
              eq(organizationSubscriptions.organizationId, ctx.user.organizationId),
              eq(organizationSubscriptions.stripeSubscriptionId, input.stripeSubscriptionId)
            )
          )
          .limit(1);
        if (owned.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
        }
        const subscription = await getStripeSubscriptionDetails(input.stripeSubscriptionId);
        const data = subscription as any;
        return {
          id: data.id,
          status: data.status,
          currentPeriodStart: data.current_period_start ? new Date(data.current_period_start * 1000) : null,
          currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000) : null,
          cancelAtPeriodEnd: data.cancel_at_period_end || false,
          canceledAt: data.canceled_at ? new Date(data.canceled_at * 1000) : null,
        };
         }),
  }),
  export: exportRouter,
  documents: router({
    upload: uploadDocumentProcedure,
    getStorageInfo: getStorageInfoProcedure,
    delete: deleteDocumentProcedure,
  }),
  voting: router({
    createVote: createVoteProcedure,
    castVote: castVoteProcedure,
    closeVote: closeVoteProcedure,
    getVote: getVoteProcedure,
    getVotes: getVotesProcedure,
    createResolution: createResolutionProcedure,
    getResolutions: getResolutionsProcedure,
  }),
});
export type AppRouter = typeof appRouter;
