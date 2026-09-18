import { upsertUser } from "../db";
import { InsertUser } from "../../drizzle/schema";
import bcrypt from "bcryptjs";
import { createVerificationToken } from "./emailVerification";
import { sendVerificationEmail } from "./sendVerificationEmail";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { validatePasswordStrength } from "./passwordValidation";

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Create a new user account with email and password
 */
export async function createUserAccount(input: SignUpInput): Promise<{ success: boolean; message: string; userId?: number }> {
  try {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: `Password does not meet security requirements: ${passwordValidation.errors.join(", ")}`,
      };
    }

    // Check if user already exists
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection not available");
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        message: "Email already registered. Please login or use a different email.",
      };
    }

    // Hash the password
    const hashedPassword = await hashPassword(input.password);

    // Create a unique openId for email-based login
    const openId = `email_${input.email}_${Date.now()}`;

    const user: InsertUser = {
      openId,
      name: input.name,
      email: input.email,
      loginMethod: "email",
      passwordHash: hashedPassword,
      isEmailVerified: false,
      lastSignedIn: new Date(),
    };

    await upsertUser(user);

    // Get the created user to get their ID
    const createdUser = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (createdUser.length === 0) {
      throw new Error("Failed to retrieve created user");
    }

    const userId = createdUser[0].id;

    // Create verification token
    const verificationToken = await createVerificationToken(userId, input.email);
    
    // Generate verification link
    const baseUrl = process.env.VITE_FRONTEND_URL || "http://localhost:5173";
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await sendVerificationEmail({
        email: input.email,
        userName: input.name,
        verificationLink,
      });
      console.log("[SignUp] Verification email sent");
    } catch (emailError) {
      console.warn("[SignUp] Failed to send verification email");
      // Don't fail the signup if email sending fails
    }

    console.log("[SignUp] User account created with userId:", userId);

    return {
      success: true,
      message: "Account created successfully. Please check your email to verify your account.",
      userId,
    };
  } catch (error) {
    console.error("[SignUp] Error creating account:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create account");
  }
}
