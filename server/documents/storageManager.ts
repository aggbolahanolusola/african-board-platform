/**
 * Document storage management utilities
 * Handles storage quota validation, tracking, and enforcement
 */

import { getDb } from "../db";
import { organizationSubscriptions, documents } from "../../drizzle/schema";
import { eq, sum } from "drizzle-orm";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file
const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/gif",
];

export interface StorageCheckResult {
  allowed: boolean;
  reason?: string;
  quotaInfo?: {
    used: number;
    limit: number;
    remaining: number;
    percentageUsed: number;
  };
}

/**
 * Validate file before upload
 */
export function validateFile(
  fileName: string,
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not supported`,
    };
  }

  // Check file name
  if (!fileName || fileName.length > 255) {
    return {
      valid: false,
      error: "File name is invalid or too long",
    };
  }

  return { valid: true };
}

/**
 * Check if organization has storage quota available
 */
export async function checkStorageQuota(
  organizationId: number,
  requiredBytes: number
): Promise<StorageCheckResult> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        allowed: false,
        reason: "Database connection not available",
      };
    }

    // Get organization subscription
    const subscriptions = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    const subscription = subscriptions[0];

    if (!subscription) {
      return {
        allowed: false,
        reason: "No active subscription found",
      };
    }

    // Calculate current storage usage
    const currentUsage = subscription.storageUsed;
    const limit = subscription.storageLimit;
    const remaining = limit - currentUsage;

    const quotaInfo = {
      used: currentUsage,
      limit,
      remaining,
      percentageUsed: Math.round((currentUsage / limit) * 100),
    };

    // Check if adding new file would exceed quota
    if (currentUsage + requiredBytes > limit) {
      return {
        allowed: false,
        reason: `Insufficient storage quota. Required: ${requiredBytes} bytes, Available: ${remaining} bytes`,
        quotaInfo,
      };
    }

    return {
      allowed: true,
      quotaInfo,
    };
  } catch (error) {
    console.error("[StorageManager] Error checking quota:", error);
    return {
      allowed: false,
      reason: "Error checking storage quota",
    };
  }
}

/**
 * Update storage usage after file upload
 */
export async function updateStorageUsage(
  organizationId: number,
  bytesAdded: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection not available" };
    }

    // Get current subscription
    const subscriptions = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    const subscription = subscriptions[0];

    if (!subscription) {
      return { success: false, error: "No active subscription found" };
    }

    // Update storage used
    const newUsage = subscription.storageUsed + bytesAdded;

    await db
      .update(organizationSubscriptions)
      .set({
        storageUsed: newUsage,
        updatedAt: new Date(),
      })
      .where(eq(organizationSubscriptions.organizationId, organizationId));

    return { success: true };
  } catch (error) {
    console.error("[StorageManager] Error updating storage usage:", error);
    return { success: false, error: "Failed to update storage usage" };
  }
}

/**
 * Recalculate storage usage for organization (for reconciliation)
 */
export async function recalculateStorageUsage(
  organizationId: number
): Promise<{ success: boolean; totalBytes?: number; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection not available" };
    }

    // Sum all document file sizes for organization
    const result = await db
      .select({ total: sum(documents.fileSize) })
      .from(documents)
      .where(eq(documents.organizationId, organizationId));

    const totalBytes = typeof result[0]?.total === 'number' ? result[0].total : 0;

    // Update subscription
    await db
      .update(organizationSubscriptions)
      .set({
        storageUsed: totalBytes,
        updatedAt: new Date(),
      })
      .where(eq(organizationSubscriptions.organizationId, organizationId));

    return { success: true, totalBytes };
  } catch (error) {
    console.error("[StorageManager] Error recalculating storage:", error);
    return { success: false, error: "Failed to recalculate storage usage" };
  }
}

/**
 * Get storage quota information for organization
 */
export async function getStorageInfo(organizationId: number): Promise<{
  success: boolean;
  data?: {
    used: number;
    limit: number;
    remaining: number;
    percentageUsed: number;
    documentCount: number;
  };
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database connection not available" };
    }

    // Get subscription
    const subscriptions = await db
      .select()
      .from(organizationSubscriptions)
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1);

    const subscription = subscriptions[0];

    if (!subscription) {
      return { success: false, error: "No active subscription found" };
    }

    // Get document count
    const docCount = await db
      .select()
      .from(documents)
      .where(eq(documents.organizationId, organizationId));

    return {
      success: true,
      data: {
        used: subscription.storageUsed,
        limit: subscription.storageLimit,
        remaining: subscription.storageLimit - subscription.storageUsed,
        percentageUsed: Math.round(
          (subscription.storageUsed / subscription.storageLimit) * 100
        ),
        documentCount: docCount.length,
      },
    };
  } catch (error) {
    console.error("[StorageManager] Error getting storage info:", error);
    return { success: false, error: "Failed to get storage information" };
  }
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get storage warning level (0-100%)
 * Returns "ok", "warning", or "critical"
 */
export function getStorageWarningLevel(percentageUsed: number): "ok" | "warning" | "critical" {
  if (percentageUsed >= 90) return "critical";
  if (percentageUsed >= 70) return "warning";
  return "ok";
}
