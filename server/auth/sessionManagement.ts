/**
 * Session Management Module
 * Handles JWT token generation, refresh tokens, and session lifecycle
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getDb } from "../db";
import { rememberMeTokens } from "../../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface TokenPayload {
  id: number;
  email: string;
  openId: string;
  iat?: number;
  exp?: number;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate access token (short-lived, 1 hour)
 */
export function generateAccessToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not configured");
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
}

/**
 * Generate refresh token (long-lived, 30 days)
 * Returns both the token and its hash for storage
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

/**
 * Create session tokens for a user
 */
export function createSessionTokens(payload: Omit<TokenPayload, "iat" | "exp">): SessionTokens {
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken } = generateRefreshToken();

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hour in seconds
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET not configured");
    }

    const payload = jwt.verify(token, jwtSecret) as TokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(
  userId: number,
  tokenHash: string,
  userAgent?: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await db
      .insert(rememberMeTokens)
      .values({
        userId,
        token: "", // We don't store the actual token, only the hash
        tokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      })
      .execute();

    return true;
  } catch (error) {
    console.error("[Session] Error storing refresh token:", error);
    return false;
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(token: string, userId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Hash the provided token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find matching token in database
    const result = await db
      .select()
      .from(rememberMeTokens)
      .where(
        and(
          eq(rememberMeTokens.tokenHash, tokenHash),
          eq(rememberMeTokens.userId, userId),
          isNull(rememberMeTokens.revokedAt)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    const storedToken = result[0];

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      return false;
    }

    // Update last used timestamp
    await db
      .update(rememberMeTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(rememberMeTokens.tokenHash, tokenHash))
      .execute();

    return true;
  } catch (error) {
    console.error("[Session] Error verifying refresh token:", error);
    return false;
  }
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await db
      .update(rememberMeTokens)
      .set({ revokedAt: new Date() })
      .where(eq(rememberMeTokens.tokenHash, tokenHash))
      .execute();

    return true;
  } catch (error) {
    console.error("[Session] Error revoking refresh token:", error);
    return false;
  }
}

/**
 * Revoke all user sessions
 */
export async function revokeAllUserSessions(userId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    await db
      .update(rememberMeTokens)
      .set({ revokedAt: new Date() })
      .where(eq(rememberMeTokens.userId, userId))
      .execute();

    console.log(`[Session] Revoked all sessions for user ${userId}`);
    return true;
  } catch (error) {
    console.error("[Session] Error revoking all sessions:", error);
    return false;
  }
}

/**
 * Get active sessions for a user
 */
export async function getActiveSessions(userId: number) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    const sessions = await db
      .select()
      .from(rememberMeTokens)
      .where(
        and(
          eq(rememberMeTokens.userId, userId),
          isNull(rememberMeTokens.revokedAt)
        )
      )
      .execute();

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  } catch (error) {
    console.error("[Session] Error getting active sessions:", error);
    return [];
  }
}

/**
 * Clean up expired refresh tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    const now = new Date();

    // Delete expired tokens
    await db
      .delete(rememberMeTokens)
      .where(sql`${rememberMeTokens.expiresAt} < NOW()`)
      .execute();

    console.log(`[Session] Cleaned up expired refresh tokens`);
    return 0;
  } catch (error) {
    console.error("[Session] Error cleaning up tokens:", error);
    return 0;
  }
}
