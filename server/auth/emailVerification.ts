import crypto from "crypto";
import { getDb } from "../db";
import { emailVerificationTokens, InsertEmailVerificationToken, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const TOKEN_EXPIRY_HOURS = 24;
const TOKEN_LENGTH = 32;

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Create a new email verification token for a user
 */
export async function createVerificationToken(
  userId: number,
  email: string
): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  const verificationToken: InsertEmailVerificationToken = {
    userId,
    email,
    token,
    expiresAt,
  };

  try {
    await db.insert(emailVerificationTokens).values(verificationToken);
    console.log("[EmailVerification] Token created for user:", userId);
    return token;
  } catch (error) {
    console.error("[EmailVerification] Failed to create token:", error);
    throw new Error("Failed to create verification token");
  }
}

/**
 * Verify an email verification token and mark email as verified
 */
export async function verifyEmailToken(token: string): Promise<{ userId: number; email: string }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  try {
    // Find the token
    const result = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .limit(1);

    if (result.length === 0) {
      throw new Error("Invalid verification token");
    }

    const verificationToken = result[0];

    // Check if token has expired
    if (new Date() > verificationToken.expiresAt) {
      throw new Error("Verification token has expired");
    }

    // Check if already verified
    if (verificationToken.verifiedAt) {
      throw new Error("Email already verified");
    }

    // Mark as verified in verification tokens table
    await db
      .update(emailVerificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationTokens.id, verificationToken.id));

    // Mark as verified in users table
    await db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, verificationToken.userId));

    console.log("[EmailVerification] Email verified for user:", verificationToken.userId);

    return {
      userId: verificationToken.userId,
      email: verificationToken.email,
    };
  } catch (error) {
    console.error("[EmailVerification] Token verification failed:", error);
    throw error instanceof Error ? error : new Error("Token verification failed");
  }
}

/**
 * Check if an email is verified for a user
 */
export async function isEmailVerified(userId: number, email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  try {
    const result = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          eq(emailVerificationTokens.email, email)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    return result[0].verifiedAt !== null;
  } catch (error) {
    console.error("[EmailVerification] Failed to check email verification:", error);
    return false;
  }
}

/**
 * Get pending verification token for a user
 */
export async function getPendingVerificationToken(
  userId: number
): Promise<{ token: string; email: string; expiresAt: Date } | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  try {
    const result = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          eq(emailVerificationTokens.verifiedAt, null as any)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const token = result[0];
    return {
      token: token.token,
      email: token.email,
      expiresAt: token.expiresAt,
    };
  } catch (error) {
    console.error("[EmailVerification] Failed to get pending token:", error);
    return null;
  }
}

/**
 * Generate verification link for email
 */
export function generateVerificationLink(token: string, baseUrl: string): string {
  return `${baseUrl}/verify-email?token=${token}`;
}
