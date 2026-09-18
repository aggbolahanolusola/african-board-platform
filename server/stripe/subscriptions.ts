import { getStripeClient } from "./client";
import { getDb } from "../db";
import { organizationSubscriptions, subscriptionPlans, organizations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Create a Stripe checkout session for subscription purchase
 */
export async function createCheckoutSession(
  organizationId: number,
  planSlug: string,
  billingInterval: "monthly" | "yearly",
  userEmail: string,
  userName: string,
  successUrl: string,
  cancelUrl: string
) {
  const stripe = getStripeClient();
  const db = await getDb();

  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }

  try {
    // Get the plan from database
    const plan = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .limit(1);

    if (!plan.length) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
    }

    const planData = plan[0];
    const priceAmount = billingInterval === "monthly" ? planData.monthlyPrice : planData.yearlyPrice;

    if (!priceAmount) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Plan pricing not available for this interval" });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planData.name,
              description: planData.description || undefined,
            },
            unit_amount: Math.round(Number(priceAmount) * 100), // Convert to cents
            recurring: {
              interval: billingInterval === "monthly" ? "month" : "year",
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        organizationId: organizationId.toString(),
        planId: planData.id.toString(),
        planSlug: planSlug,
        billingInterval: billingInterval === "monthly" ? "month" : "year",
      },
      client_reference_id: organizationId.toString(),
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url,
    };
  } catch (error) {
    console.error("[Stripe] Failed to create checkout session:", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create checkout session" });
  }
}

/**
 * Handle successful checkout session completion
 */
export async function handleCheckoutSessionCompleted(
  sessionId: string,
  stripeSubscriptionId: string,
  organizationId: number,
  planId: number,
  billingInterval: "monthly" | "yearly"
) {
  const db = await getDb();

  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }

  try {
    // Calculate subscription period dates
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();

    if (billingInterval === "monthly") {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    // Create or update organization subscription
    const existingSubscription = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    if (existingSubscription.length > 0) {
      // Update existing subscription
      await db
        .update(organizationSubscriptions)
        .set({
          planId: planId,
          status: "active",
          billingCycle: billingInterval,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          stripeSubscriptionId: stripeSubscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(organizationSubscriptions.organizationId, organizationId));
    } else {
      // Create new subscription with default storage limit (10GB)
      const defaultStorageLimit = 10 * 1024 * 1024 * 1024; // 10GB in bytes
      
      await db.insert(organizationSubscriptions).values({
        organizationId: organizationId,
        planId: planId,
        status: "active",
        billingCycle: billingInterval,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        stripeSubscriptionId: stripeSubscriptionId,
        storageUsed: 0,
        storageLimit: defaultStorageLimit,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[Stripe] Failed to handle checkout completion:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to process subscription" });
  }
}

/**
 * Cancel an organization's subscription
 */
export async function cancelSubscription(organizationId: number) {
  const stripe = getStripeClient();
  const db = await getDb();

  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  }

  try {
    // Get the subscription
    const subscription = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    if (!subscription.length || !subscription[0].stripeSubscriptionId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
    }

    // Cancel in Stripe
    await stripe.subscriptions.cancel(subscription[0].stripeSubscriptionId);

    // Update in database
    await db
      .update(organizationSubscriptions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(organizationSubscriptions.organizationId, organizationId));

    return { success: true };
  } catch (error) {
    console.error("[Stripe] Failed to cancel subscription:", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to cancel subscription" });
  }
}

/**
 * Get subscription details from Stripe
 */
export async function getStripeSubscriptionDetails(stripeSubscriptionId: string) {
  const stripe = getStripeClient();

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    return subscription;
  } catch (error) {
    console.error("[Stripe] Failed to retrieve subscription:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve subscription details" });
  }
}
