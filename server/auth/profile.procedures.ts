import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { updateUserProfile, changeUserPassword } from "./profile";
import { createVerificationToken } from "./emailVerification";
import { sendVerificationEmail } from "./sendVerificationEmail";

export const profileRouter = router({
  /**
   * Update user profile information
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Invalid email address").optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        bio: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        return {
          success: false,
          message: "Unauthorized",
        };
      }

      return updateUserProfile({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Change user password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        return {
          success: false,
          message: "Unauthorized",
        };
      }

      if (input.newPassword !== input.confirmPassword) {
        return {
          success: false,
          message: "Passwords do not match",
        };
      }

      return changeUserPassword(ctx.user.id, input.currentPassword, input.newPassword);
    }),

  /**
   * Get user profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      createdAt: ctx.user.createdAt,
      lastSignedIn: ctx.user.lastSignedIn,
    };
  }),

  /**
   * Resend verification email from account settings
   */
  resendVerificationEmailFromSettings: protectedProcedure
    .input(
      z.object({
        baseUrl: z.string().url("Invalid base URL"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        return {
          success: false,
          message: "Unauthorized",
        };
      }

      try {
        // Validate user has email and name
        if (!ctx.user.email || !ctx.user.name) {
          return {
            success: false,
            message: "User email or name is missing",
          };
        }

        // Create new verification token for the authenticated user
        const token = await createVerificationToken(ctx.user.id, ctx.user.email);
        const verificationLink = `${input.baseUrl}/verify-email?token=${token}`;

        // Send verification email
        await sendVerificationEmail({
          email: ctx.user.email,
          userName: ctx.user.name,
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
});
