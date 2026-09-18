/**
 * Stripe Products and Prices Configuration for NurtGov
 * Defines subscription plans and their corresponding Stripe product/price IDs
 */

export const STRIPE_PRODUCTS = {
  // Starter Plan - $49/month
  STARTER_MONTHLY: {
    productId: "prod_starter_monthly",
    priceId: "price_starter_monthly",
    name: "Starter Plan",
    description: "Perfect for small boards",
    monthlyPrice: 4900, // $49.00 in cents
    yearlyPrice: 49900, // $499.00 in cents (10% discount)
    features: [
      "Up to 5 team members",
      "12 meetings per month",
      "10GB storage",
      "Basic compliance tracking",
      "Email support",
    ],
    limits: {
      maxUsers: 5,
      maxMeetings: 12,
      maxStorage: 10, // GB
      transcriptionIncluded: false,
      digitalSignatures: false,
      advancedReporting: false,
    },
  },

  // Professional Plan - $149/month
  PROFESSIONAL_MONTHLY: {
    productId: "prod_professional_monthly",
    priceId: "price_professional_monthly",
    name: "Professional Plan",
    description: "For growing organizations",
    monthlyPrice: 14900, // $149.00 in cents
    yearlyPrice: 149900, // $1,499.00 in cents (10% discount)
    features: [
      "Up to 25 team members",
      "Unlimited meetings",
      "100GB storage",
      "Advanced compliance tracking",
      "Live meeting transcription",
      "Digital signatures",
      "Priority email & chat support",
    ],
    limits: {
      maxUsers: 25,
      maxMeetings: null, // unlimited
      maxStorage: 100, // GB
      transcriptionIncluded: true,
      digitalSignatures: true,
      advancedReporting: true,
    },
  },

  // Enterprise Plan - Custom pricing
  ENTERPRISE: {
    productId: "prod_enterprise",
    priceId: "price_enterprise",
    name: "Enterprise Plan",
    description: "For large organizations with custom needs",
    monthlyPrice: null, // Custom pricing
    yearlyPrice: null,
    features: [
      "Unlimited team members",
      "Unlimited meetings",
      "Unlimited storage",
      "Full compliance suite",
      "Live transcription & AI analysis",
      "Digital signatures & e-notarization",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone & email support",
      "SLA guarantee",
    ],
    limits: {
      maxUsers: null, // unlimited
      maxMeetings: null,
      maxStorage: null,
      transcriptionIncluded: true,
      digitalSignatures: true,
      advancedReporting: true,
    },
  },
};

export const STRIPE_BILLING_INTERVALS = {
  MONTHLY: "month",
  YEARLY: "year",
} as const;

export type BillingInterval = (typeof STRIPE_BILLING_INTERVALS)[keyof typeof STRIPE_BILLING_INTERVALS];

/**
 * Get product details by plan slug
 */
export function getProductBySlug(slug: string) {
  const slugToProduct: Record<string, (typeof STRIPE_PRODUCTS)[keyof typeof STRIPE_PRODUCTS]> = {
    starter: STRIPE_PRODUCTS.STARTER_MONTHLY,
    professional: STRIPE_PRODUCTS.PROFESSIONAL_MONTHLY,
    enterprise: STRIPE_PRODUCTS.ENTERPRISE,
  };

  return slugToProduct[slug] || null;
}

/**
 * Get all products with pricing
 */
export function getAllProducts() {
  return [STRIPE_PRODUCTS.STARTER_MONTHLY, STRIPE_PRODUCTS.PROFESSIONAL_MONTHLY, STRIPE_PRODUCTS.ENTERPRISE];
}
