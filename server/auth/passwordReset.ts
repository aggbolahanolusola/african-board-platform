/**
 * Password Reset Module
 * Handles password reset token generation, validation, and password updates
 */

import crypto from "crypto";
import { getDb } from "../db";
import { users, passwordResetTokens } from "../../drizzle/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "./passwordValidation";

/**
 * Generate a secure password reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Request password reset for a user
 * Returns true if email exists, false otherwise (for security)
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; token?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Find user by email
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      // Return success even if user doesn't exist (security best practice)
      return {
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      };
    }

    const user = userResult[0];

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Store reset token in database
    await db
      .insert(passwordResetTokens)
      .values({
        userId: user.id,
        token: resetToken,
        expiresAt,
        used: false,
      })
      .execute();

    console.log(`[Password Reset] Reset token generated for user ${user.id}`);

    return {
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
      token: resetToken, // In production, this would be sent via email
    };
  } catch (error) {
    console.error("[Password Reset] Error requesting password reset:", error);
    return {
      success: false,
      message: "Failed to request password reset",
    };
  }
}

/**
 * Validate password reset token
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean; userId?: number; message: string }> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Find token in database
    const tokenResult = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, sql`NOW()`)
        )
      )
      .limit(1);

    if (tokenResult.length === 0) {
      return {
        valid: false,
        message: "Invalid or expired password reset token",
      };
    }

    const resetToken = tokenResult[0];

    return {
      valid: true,
      userId: resetToken.userId,
      message: "Token is valid",
    };
  } catch (error) {
    console.error("[Password Reset] Error validating token:", error);
    return {
      valid: false,
      message: "Failed to validate reset token",
    };
  }
}

/**
 * Reset password using valid token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: `Password does not meet security requirements: ${passwordValidation.errors.join(", ")}`,
      };
    }

    // Validate token
    const tokenValidation = await validateResetToken(token);
    if (!tokenValidation.valid || !tokenValidation.userId) {
      return {
        success: false,
        message: tokenValidation.message,
      };
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, tokenValidation.userId))
      .execute();

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({
        used: true,
        usedAt: new Date(),
      })
      .where(eq(passwordResetTokens.token, token))
      .execute();

    console.log(`[Password Reset] Password reset successful for user ${tokenValidation.userId}`);

    return {
      success: true,
      message: "Password has been reset successfully. Please log in with your new password.",
    };
  } catch (error) {
    console.error("[Password Reset] Error resetting password:", error);
    return {
      success: false,
      message: "Failed to reset password",
    };
  }
}

/**
 * Clean up expired reset tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Delete expired tokens
    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.used, false),
          gt(sql`NOW()`, passwordResetTokens.expiresAt)
        )
      )
      .execute();

    console.log(`[Password Reset] Cleaned up expired tokens`);

    return {
      success: true,
      deletedCount: 0,
    };
  } catch (error) {
    console.error("[Password Reset] Error cleaning up tokens:", error);
    return {
      success: false,
      deletedCount: 0,
    };
  }
}
