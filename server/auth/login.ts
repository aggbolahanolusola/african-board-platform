import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sdk } from "../_core/sdk";
import { ENV } from "../_core/env";
import { SESSION_TOKEN_TTL_MS } from "@shared/const";
import {
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  getRemainingLockoutTime,
} from "./accountLockout";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    name: string | null;
    email: string | null;
  };
  token?: string;
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(email: string, password: string): Promise<LoginResponse> {
  try {
    // Check if account is locked
    if (isAccountLocked(email)) {
      const remainingTime = getRemainingLockoutTime(email);
      return {
        success: false,
        message: `Account is temporarily locked. Please try again in ${remainingTime} seconds.`,
      };
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Find user by email
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      recordFailedAttempt(email);
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    const user = result[0];

    // Check if user is verified
    if (!user.isEmailVerified) {
      return {
        success: false,
        message: "Please verify your email before logging in",
      };
    }

    // Check if passwordHash exists
    if (!user.passwordHash) {
      recordFailedAttempt(email);
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      recordFailedAttempt(email);
      return {
        success: false,
        message: "Invalid email or password",
      };
    }

    // Verify email is not null
    if (!user.email) {
      return {
        success: false,
        message: "User email not found",
      };
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(email);

    // Generate a session token that is compatible with sdk.verifySession
    // (payload must contain openId, appId and a non-empty name) and short-lived.
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not configured. Cannot generate authentication token.");
    }
    const token = await sdk.signSession(
      {
        openId: user.openId,
        appId: ENV.appId,
        name: user.name || user.email || user.openId,
      },
      { expiresInMs: SESSION_TOKEN_TTL_MS }
    );

    console.log("[Login] User authenticated successfully");

    return {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    };
  } catch (error) {
    console.error("[Login] Error authenticating user");
    return {
      success: false,
      message: "Login failed",
    };
  }
}
