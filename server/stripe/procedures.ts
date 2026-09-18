import { protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createCheckoutSession, getStripeSubscriptionDetails } from "./subscriptions";
import { getStripePublishableKey } from "./client";

/**
 * Create a checkout session for subscription purchase
 */
export const createSubscriptionCheckout = protectedProcedure
  .input(
    z.object({
      planSlug: z.enum(["starter", "professional", "enterprise"]),
      billingInterval: z.enum(["monthly", "yearly"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user?.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    if (!ctx.user.email) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User email not found" });
    }

    // Get origin from request headers for redirect URLs
    const origin = ctx.req.headers.origin || "https://nurtgov.com";
    const successUrl = `${origin}/dashboard?subscription=success`;
    const cancelUrl = `${origin}/pricing?subscription=cancelled`;

    try {
      const result = await createCheckoutSession(
        ctx.user.organizationId,
        input.planSlug,
        input.billingInterval,
        ctx.user.email,
        ctx.user.name || "User",
        successUrl,
        cancelUrl
      );

      return {
        sessionId: result.sessionId,
        sessionUrl: result.sessionUrl,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("[Stripe] Failed to create checkout session:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create checkout session" });
    }
  });

/**
 * Get Stripe publishable key for frontend
 */
export const getStripePublishableKeyProcedure = publicProcedure.query(() => {
  try {
    return {
      publishableKey: getStripePublishableKey(),
    };
  } catch (error) {
    console.error("[Stripe] Failed to get publishable key:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to get Stripe configuration" });
  }
});

/**
 * Get subscription details from Stripe
 */
export const getSubscriptionDetails = protectedProcedure
  .input(z.object({ stripeSubscriptionId: z.string() }))
  .query(async ({ input }) => {
    try {
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
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("[Stripe] Failed to get subscription details:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve subscription details" });
    }
  });
