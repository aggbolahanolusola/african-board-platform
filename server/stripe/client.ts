import Stripe from "stripe";
import { ENV } from "../_core/env";

/**
 * Initialize Stripe client with secret key
 * Used for all server-side Stripe operations
 */
export function getStripeClient(): Stripe {
  if (!ENV.stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(ENV.stripeSecretKey, {
    typescript: true,
  });
}

/**
 * Get Stripe webhook secret for signature verification
 */
export function getStripeWebhookSecret(): string {
  if (!ENV.stripeWebhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return ENV.stripeWebhookSecret;
}

/**
 * Get Stripe publishable key for frontend
 */
export function getStripePublishableKey(): string {
  if (!process.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is not configured");
  }
  return process.env.VITE_STRIPE_PUBLISHABLE_KEY;
}
