/**
 * Secure logging utility
 * Hashes sensitive data before logging to prevent PII exposure
 */

import crypto from "crypto";

/**
 * Hash sensitive data for logging (one-way hash)
 * Returns first 8 characters of SHA256 hash
 */
export function hashForLog(value: string): string {
  if (!value) return "[empty]";
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 8);
}

/**
 * Mask email address for logging
 * Example: user@example.com -> u***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "[invalid-email]";
  const [localPart, domain] = email.split("@");
  const masked = localPart.charAt(0) + "*".repeat(Math.max(1, localPart.length - 1));
  return `${masked}@${domain}`;
}

/**
 * Mask phone number for logging
 * Example: +1234567890 -> +123****7890
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return "[invalid-phone]";
  const prefix = phone.slice(0, 3);
  const suffix = phone.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Create a sanitized log object for authentication events
 */
export function createAuthLog(event: {
  type: "signup" | "login" | "logout" | "login_failed" | "password_reset";
  email?: string;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  reason?: string;
}): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    type: event.type,
    emailHash: event.email ? hashForLog(event.email) : undefined,
    userId: event.userId,
    ipHash: event.ipAddress ? hashForLog(event.ipAddress) : undefined,
    userAgentHash: event.userAgent ? hashForLog(event.userAgent) : undefined,
    success: event.success,
    reason: event.reason,
  };
}

/**
 * Create a sanitized log object for data access events
 */
export function createDataAccessLog(event: {
  type: "document_accessed" | "document_downloaded" | "data_exported";
  userId?: number;
  resourceId?: number;
  resourceType?: string;
  ipAddress?: string;
}): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    type: event.type,
    userId: event.userId,
    resourceId: event.resourceId,
    resourceType: event.resourceType,
    ipHash: event.ipAddress ? hashForLog(event.ipAddress) : undefined,
  };
}

/**
 * Safe console.log for sensitive operations
 */
export function logSecurityEvent(message: string, data?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [Security] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [Security] ${message}`);
  }
}

/**
 * Safe console.error for security incidents
 */
export function logSecurityError(message: string, error?: Error | Record<string, any>): void {
  const timestamp = new Date().toISOString();
  if (error instanceof Error) {
    console.error(`[${timestamp}] [Security Error] ${message}:`, {
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 3).join("\n"), // Only first 3 lines
    });
  } else if (error) {
    console.error(`[${timestamp}] [Security Error] ${message}:`, error);
  } else {
    console.error(`[${timestamp}] [Security Error] ${message}`);
  }
}
