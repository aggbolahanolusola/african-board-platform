import { Request, Response } from "express";
import Stripe from "stripe";
import { getStripeClient, getStripeWebhookSecret } from "./client";
import { handleCheckoutSessionCompleted, cancelSubscription } from "./subscriptions";
import { TRPCError } from "@trpc/server";

/**
 * Handle Stripe webhook events
 * This endpoint receives events from Stripe and processes them
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  // Get the raw body for signature verification
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error: any) {
    console.error("[Stripe Webhook] Signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(
          session.id,
          session.subscription as string,
          parseInt(session.metadata?.organizationId || "0"),
          parseInt(session.metadata?.planId || "0"),
          (session.metadata?.billingInterval as "monthly" | "yearly") || "monthly"
        );
        console.log(`[Stripe Webhook] Checkout session completed for organization ${session.metadata?.organizationId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription cancelled: ${subscription.id}`);
        // Could trigger additional cleanup here if needed
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription updated: ${subscription.id}`);
        // Handle subscription updates (e.g., plan changes, payment method updates)
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice paid: ${invoice.id}`);
        // Handle successful payment
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice payment failed: ${invoice.id}`);
        // Handle failed payment - could send notification to organization
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
