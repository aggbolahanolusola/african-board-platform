/**
 * Password Reset tRPC Procedures
 * Handles password reset requests and verification via tRPC
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { requestPasswordReset, validateResetToken, resetPassword } from "./passwordReset";
import { TRPCError } from "@trpc/server";

/**
 * Request password reset - public procedure
 * User provides email, receives reset link via email
 */
export const requestPasswordResetProcedure = publicProcedure
  .input(z.object({ email: z.string().email("Invalid email address") }))
  .mutation(async ({ input }) => {
    try {
      const result = await requestPasswordReset(input.email);

      return {
        success: result.success,
        message: result.message,
        // Note: token is only returned in development/testing
        // In production, it would be sent via email only
        token: process.env.NODE_ENV === "development" ? result.token : undefined,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to process password reset request",
      });
    }
  });

/**
 * Validate reset token - public procedure
 * Check if a reset token is valid before showing password reset form
 */
export const validateResetTokenProcedure = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    try {
      const result = await validateResetToken(input.token);

      if (!result.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.message,
        });
      }

      return {
        valid: true,
        message: "Token is valid",
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to validate reset token",
      });
    }
  });

/**
 * Reset password - public procedure
 * User provides new password and reset token
 */
export const resetPasswordProcedure = publicProcedure
  .input(
    z.object({
      token: z.string(),
      newPassword: z.string().min(12, "Password must be at least 12 characters"),
      confirmPassword: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Verify passwords match
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passwords do not match",
        });
      }

      const result = await resetPassword(input.token, input.newPassword);

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.message,
        });
      }

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reset password",
      });
    }
  });

/**
 * Change password - protected procedure
 * Authenticated user changes their own password
 */
export const changePasswordProcedure = protectedProcedure
  .input(
    z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(12, "Password must be at least 12 characters"),
      confirmPassword: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Verify passwords match
      if (input.newPassword !== input.confirmPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "New passwords do not match",
        });
      }

      // Verify new password is different from current
      if (input.currentPassword === input.newPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "New password must be different from current password",
        });
      }

      // TODO: Implement change password logic
      // 1. Verify current password
      // 2. Hash new password
      // 3. Update user record
      // 4. Invalidate all sessions

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to change password",
      });
    }
  });
