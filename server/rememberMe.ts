import crypto from 'crypto';
import { getDb } from './db';
import { rememberMeTokens } from '../drizzle/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';

/**
 * Configuration for remember me tokens
 */
export const REMEMBER_ME_CONFIG = {
  // Token validity: 30 days
  TOKEN_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000,
  // Token length: 32 bytes (256 bits)
  TOKEN_LENGTH: 32,
  // Cookie name
  COOKIE_NAME: 'rememberMe',
  // Cookie options
  COOKIE_OPTIONS: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: true,
    httpOnly: true,
    sameSite: 'none' as const,
    path: '/',
  },
};

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(REMEMBER_ME_CONFIG.TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a remember me token for a user
 */
export async function createRememberMeToken(
  userId: number,
  userAgent?: string,
  ipAddress?: string
) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REMEMBER_ME_CONFIG.TOKEN_EXPIRY_MS);

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    await db.insert(rememberMeTokens).values({
      userId,
      token: token.substring(0, 50), // Store partial token for identification
      tokenHash,
      userAgent,
      ipAddress,
      expiresAt,
    });

    return token;
  } catch (error) {
    console.error('[RememberMe] Failed to create token:', error);
    throw error;
  }
}

/**
 * Verify and retrieve user from remember me token
 */
export async function verifyRememberMeToken(
  token: string,
  userAgent?: string
): Promise<{ userId: number; token: any } | null> {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const tokenHash = hashToken(token);
    const now = new Date();

    // Find valid, non-revoked token
    const result = await db
      .select()
      .from(rememberMeTokens)
      .where(
        and(
          eq(rememberMeTokens.tokenHash, tokenHash),
          gt(rememberMeTokens.expiresAt, now),
          isNull(rememberMeTokens.revokedAt)
        )
      )
      .limit(1);

    if (!result.length) {
      console.log('[RememberMe] Token not found or expired');
      return null;
    }

    const tokenRecord = result[0];

    // Optional: Validate user agent for additional security
    // (commented out to allow device changes, but can be enabled)
    // if (userAgent && tokenRecord.userAgent && tokenRecord.userAgent !== userAgent) {
    //   console.warn('[RememberMe] User agent mismatch - possible token theft');
    //   return null;
    // }

    // Update last used timestamp
    const db2 = await getDb();
    if (db2) {
      await db2
        .update(rememberMeTokens)
        .set({ lastUsedAt: now })
        .where(eq(rememberMeTokens.id, tokenRecord.id));
    }

    return {
      userId: tokenRecord.userId,
      token: tokenRecord,
    };
  } catch (error) {
    console.error('[RememberMe] Token verification failed:', error);
    return null;
  }
}

/**
 * Revoke a remember me token
 */
export async function revokeRememberMeToken(token: string) {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const tokenHash = hashToken(token);
    const now = new Date();

    await db
      .update(rememberMeTokens)
      .set({ revokedAt: now })
      .where(eq(rememberMeTokens.tokenHash, tokenHash));

    console.log('[RememberMe] Token revoked');
  } catch (error) {
    console.error('[RememberMe] Failed to revoke token:', error);
    throw error;
  }
}

/**
 * Revoke all remember me tokens for a user (logout from all devices)
 */
export async function revokeAllUserTokens(userId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const now = new Date();

    await db
      .update(rememberMeTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(rememberMeTokens.userId, userId),
          isNull(rememberMeTokens.revokedAt)
        )
      );

    console.log('[RememberMe] All tokens revoked for user:', userId);
  } catch (error) {
    console.error('[RememberMe] Failed to revoke all tokens:', error);
    throw error;
  }
}

/**
 * Clean up expired remember me tokens
 */
export async function cleanupExpiredTokens() {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const now = new Date();

    const result = await db
      .delete(rememberMeTokens)
      .where(gt(rememberMeTokens.expiresAt, now));

    console.log('[RememberMe] Cleaned up expired tokens');
    return result;
  } catch (error) {
    console.error('[RememberMe] Failed to cleanup tokens:', error);
    throw error;
  }
}

/**
 * Get active remember me tokens for a user
 */
export async function getUserRememberMeTokens(userId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const now = new Date();

    const tokens = await db
      .select()
      .from(rememberMeTokens)
      .where(
        and(
          eq(rememberMeTokens.userId, userId),
          gt(rememberMeTokens.expiresAt, now),
          isNull(rememberMeTokens.revokedAt)
        )
      );

    return tokens;
  } catch (error) {
    console.error('[RememberMe] Failed to get user tokens:', error);
    return [];
  }
}
