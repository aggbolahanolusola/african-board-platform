import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  verifyEmailToken,
  getPendingVerificationToken,
  createVerificationToken,
} from "./emailVerification";
import { sendVerificationEmail } from "./sendVerificationEmail";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const emailVerificationRouter = router({
  /**
   * Verify email with token
   */
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1, "Token is required") }))
    .mutation(async ({ input }) => {
      try {
        const { userId, email } = await verifyEmailToken(input.token);

        // Update user to mark email as verified
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }

        await db
          .update(users)
          .set({ email })
          .where(eq(users.id, userId));

        return {
          success: true,
          message: "Email verified successfully. You can now log in.",
        };
      } catch (error) {
        console.error("[EmailVerification] Verification failed:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Email verification failed",
        };
      }
    }),

  /**
   * Get pending verification token for user (for resend)
   */
  getPendingToken: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      try {
        const pendingToken = await getPendingVerificationToken(input.userId);

        if (!pendingToken) {
          return {
            hasPending: false,
            expiresAt: null,
          };
        }

        return {
          hasPending: true,
          email: pendingToken.email,
          expiresAt: pendingToken.expiresAt,
        };
      } catch (error) {
        console.error("[EmailVerification] Failed to get pending token:", error);
        return {
          hasPending: false,
          expiresAt: null,
        };
      }
    }),

  /**
   * Resend verification email
   */
  resendVerificationEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        userName: z.string().min(1, "Name is required"),
        baseUrl: z.string().url("Invalid base URL"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }

        // Find user by email
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (userResult.length === 0) {
          // Don't reveal if email exists for security
          return {
            success: true,
            message: "If an account exists with this email, a verification link has been sent.",
          };
        }

        const user = userResult[0];

        // Create new verification token
        const token = await createVerificationToken(user.id, input.email);
        const verificationLink = `${input.baseUrl}/verify-email?token=${token}`;

        // Send verification email
        await sendVerificationEmail({
          email: input.email,
          userName: input.userName,
          verificationLink,
        });

        return {
          success: true,
          message: "Verification email has been sent. Please check your inbox.",
        };
      } catch (error) {
        console.error("[EmailVerification] Failed to resend verification email:", error);
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to resend verification email",
        };
      }
    }),

  /**
   * Check if email is verified
   */
  checkEmailStatus: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }

        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (result.length === 0) {
          return {
            exists: false,
            verified: false,
          };
        }

        // If user has email set, they're verified
        return {
          exists: true,
          verified: result[0].email === input.email,
        };
      } catch (error) {
        console.error("[EmailVerification] Failed to check email status:", error);
        return {
          exists: false,
          verified: false,
        };
      }
    }),
});
