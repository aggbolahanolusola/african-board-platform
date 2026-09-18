import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  organizationSubscriptions,
  subscriptionPlans,
  meetings,
  documents,
  users,
} from "../drizzle/schema";
import { eq, count, and, gte, lte } from "drizzle-orm";

/**
 * Feature definitions and their tier requirements
 */
export const FEATURE_DEFINITIONS = {
  // Meeting features
  unlimitedMeetings: { tiers: ["professional", "enterprise"], limit: null },
  monthlyMeetings: { tiers: ["starter"], limit: 12 },

  // Document features
  advancedDocumentManagement: { tiers: ["professional", "enterprise"], limit: null },
  basicDocumentManagement: { tiers: ["starter", "professional", "enterprise"], limit: null },
  documentVersioning: { tiers: ["professional", "enterprise"], limit: null },

  // User management
  maxUsersStarter: { tiers: ["starter"], limit: 5 },
  maxUsersProfessional: { tiers: ["professional"], limit: 25 },
  maxUsersEnterprise: { tiers: ["enterprise"], limit: null },

  // Storage
  storageStarter: { tiers: ["starter"], limit: 10 }, // GB
  storageProfessional: { tiers: ["professional"], limit: 100 }, // GB
  storageEnterprise: { tiers: ["enterprise"], limit: null }, // Unlimited

  // Premium features
  liveTranscription: { tiers: ["professional", "enterprise"], limit: null },
  digitalSignatures: { tiers: ["professional", "enterprise"], limit: null },
  boardAssessments: { tiers: ["professional", "enterprise"], limit: null },
  customIntegrations: { tiers: ["enterprise"], limit: null },
  dedicatedAccountManager: { tiers: ["enterprise"], limit: null },
  advancedSecurityFeatures: { tiers: ["enterprise"], limit: null },
  dataResidencyOptions: { tiers: ["professional", "enterprise"], limit: null },
  apiAccess: { tiers: ["professional", "enterprise"], limit: null },
  prioritySupport: { tiers: ["professional", "enterprise"], limit: null },
};

export type FeatureName = keyof typeof FEATURE_DEFINITIONS;

/**
 * Get the current subscription plan for an organization
 */
export async function getOrganizationSubscription(organizationId: number) {
  const db = await getDb();
  if (!db) return null;

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
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if a feature is available for an organization
 */
export async function isFeatureAvailable(
  organizationId: number,
  featureName: FeatureName
): Promise<boolean> {
  const subscription = await getOrganizationSubscription(organizationId);
  if (!subscription) return false;

  const feature = FEATURE_DEFINITIONS[featureName];
  if (!feature) return false;

  return feature.tiers.includes(subscription.plan.slug);
}

/**
 * Get the user limit for an organization based on subscription
 */
export async function getUserLimit(organizationId: number): Promise<number | null> {
  const subscription = await getOrganizationSubscription(organizationId);
  if (!subscription) return null;

  const planSlug = subscription.plan.slug;
  if (planSlug === "starter") return 5;
  if (planSlug === "professional") return 25;
  if (planSlug === "enterprise") return null; // Unlimited

  return null;
}

/**
 * Get the current user count for an organization
 */
export async function getCurrentUserCount(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.organizationId, organizationId));

  return result[0]?.count || 0;
}

/**
 * Check if organization can add more users
 */
export async function canAddUser(organizationId: number): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  message: string;
}> {
  const userLimit = await getUserLimit(organizationId);
  const currentCount = await getCurrentUserCount(organizationId);

  if (userLimit === null) {
    // Enterprise - unlimited
    return {
      allowed: true,
      current: currentCount,
      limit: null,
      message: "Unlimited users available",
    };
  }

  const allowed = currentCount < userLimit;
  return {
    allowed,
    current: currentCount,
    limit: userLimit,
    message: allowed
      ? `${userLimit - currentCount} user slots remaining`
      : `User limit (${userLimit}) reached. Please upgrade your plan.`,
  };
}

/**
 * Get the meeting limit for an organization
 */
export async function getMeetingLimit(organizationId: number): Promise<number | null> {
  const subscription = await getOrganizationSubscription(organizationId);
  if (!subscription) return null;

  const planSlug = subscription.plan.slug;
  if (planSlug === "starter") return 12; // Monthly meetings
  if (planSlug === "professional" || planSlug === "enterprise") return null; // Unlimited

  return null;
}

/**
 * Get the current meeting count for an organization (this month)
 */
export async function getCurrentMonthMeetingCount(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await db
    .select({ count: count() })
    .from(meetings)
    .where(
      and(
        eq(meetings.organizationId, organizationId),
        gte(meetings.scheduledAt, monthStart),
        lte(meetings.scheduledAt, monthEnd)
      )
    );

  return result[0]?.count || 0;
}

/**
 * Check if organization can create more meetings
 */
export async function canCreateMeeting(organizationId: number): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  message: string;
}> {
  const meetingLimit = await getMeetingLimit(organizationId);
  const currentCount = await getCurrentMonthMeetingCount(organizationId);

  if (meetingLimit === null) {
    // Professional/Enterprise - unlimited
    return {
      allowed: true,
      current: currentCount,
      limit: null,
      message: "Unlimited meetings available",
    };
  }

  const allowed = currentCount < meetingLimit;
  return {
    allowed,
    current: currentCount,
    limit: meetingLimit,
    message: allowed
      ? `${meetingLimit - currentCount} meetings remaining this month`
      : `Monthly meeting limit (${meetingLimit}) reached. Please upgrade your plan.`,
  };
}

/**
 * Get the storage limit for an organization (in GB)
 */
export async function getStorageLimit(organizationId: number): Promise<number | null> {
  const subscription = await getOrganizationSubscription(organizationId);
  if (!subscription) return null;

  const planSlug = subscription.plan.slug;
  if (planSlug === "starter") return 10;
  if (planSlug === "professional") return 100;
  if (planSlug === "enterprise") return null; // Unlimited

  return null;
}

/**
 * Get the current storage usage for an organization (in bytes)
 */
export async function getCurrentStorageUsage(organizationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ totalSize: count() })
    .from(documents)
    .where(eq(documents.organizationId, organizationId));

  // In a real implementation, you would sum the fileSize column
  // In a real implementation, you would sum the fileSize column
  // For now, return a placeholder value
  return (result[0]?.totalSize || 0) * 1024 * 1024; // Assume each document is ~1MB
}

/**
 * Check if organization can upload a document
 */
export async function canUploadDocument(
  organizationId: number,
  fileSizeBytes: number
): Promise<{
  allowed: boolean;
  current: number;
  limit: number | null;
  message: string;
}> {
  const storageLimit = await getStorageLimit(organizationId);
  const currentUsage = await getCurrentStorageUsage(organizationId);

  // Convert to GB for comparison
  const currentUsageGB = currentUsage / (1024 * 1024 * 1024);
  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);

  if (storageLimit === null) {
    // Enterprise - unlimited
    return {
      allowed: true,
      current: Math.round(currentUsageGB),
      limit: null,
      message: "Unlimited storage available",
    };
  }

  const allowed = currentUsageGB + fileSizeGB <= storageLimit;
  const remainingGB = storageLimit - currentUsageGB;

  return {
    allowed,
    current: Math.round(currentUsageGB),
    limit: storageLimit,
    message: allowed
      ? `${remainingGB.toFixed(2)} GB storage remaining`
      : `Storage limit (${storageLimit} GB) exceeded. Please upgrade your plan.`,
  };
}

/**
 * Enforce feature availability - throws error if not available
 */
export async function enforceFeature(
  organizationId: number,
  featureName: FeatureName
): Promise<void> {
  const available = await isFeatureAvailable(organizationId, featureName);
  if (!available) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Feature '${featureName}' is not available on your current subscription plan. Please upgrade to access this feature.`,
    });
  }
}

/**
 * Enforce user limit - throws error if limit exceeded
 */
export async function enforceUserLimit(organizationId: number): Promise<void> {
  const check = await canAddUser(organizationId);
  if (!check.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: check.message,
    });
  }
}

/**
 * Enforce meeting limit - throws error if limit exceeded
 */
export async function enforceMeetingLimit(organizationId: number): Promise<void> {
  const check = await canCreateMeeting(organizationId);
  if (!check.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: check.message,
    });
  }
}

/**
 * Enforce storage limit - throws error if limit exceeded
 */
export async function enforceStorageLimit(
  organizationId: number,
  fileSizeBytes: number
): Promise<void> {
  const check = await canUploadDocument(organizationId, fileSizeBytes);
  if (!check.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: check.message,
    });
  }
}

/**
 * Get all feature availability for an organization
 */
export async function getFeatureAvailability(organizationId: number): Promise<{
  [key in FeatureName]: boolean;
}> {
  const availability: Partial<{ [key in FeatureName]: boolean }> = {};

  for (const featureName of Object.keys(FEATURE_DEFINITIONS) as FeatureName[]) {
    availability[featureName] = await isFeatureAvailable(organizationId, featureName);
  }

  return availability as { [key in FeatureName]: boolean };
}

/**
 * Get subscription limits for an organization
 */
export async function getSubscriptionLimits(organizationId: number): Promise<{
  userLimit: number | null;
  currentUsers: number;
  meetingLimit: number | null;
  currentMeetings: number;
  storageLimit: number | null;
  currentStorage: number;
  features: { [key in FeatureName]: boolean };
}> {
  return {
    userLimit: await getUserLimit(organizationId),
    currentUsers: await getCurrentUserCount(organizationId),
    meetingLimit: await getMeetingLimit(organizationId),
    currentMeetings: await getCurrentMonthMeetingCount(organizationId),
    storageLimit: await getStorageLimit(organizationId),
    currentStorage: await getCurrentStorageUsage(organizationId),
    features: await getFeatureAvailability(organizationId),
  };
}
