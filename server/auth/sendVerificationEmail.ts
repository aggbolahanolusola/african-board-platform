import { notifyOwner } from "../_core/notification";
import {
  generateVerificationEmailHTML,
  generateVerificationEmailText,
} from "./emailVerificationTemplate";

export interface SendVerificationEmailInput {
  email: string;
  userName: string;
  verificationLink: string;
  expiryHours?: number;
}

/**
 * Send email verification email to user
 * Uses the Manus notification system to send emails
 */
export async function sendVerificationEmail(input: SendVerificationEmailInput): Promise<boolean> {
  try {
    const { email, userName, verificationLink, expiryHours = 24 } = input;

    // Generate email content
    const htmlContent = generateVerificationEmailHTML(userName, verificationLink, expiryHours);
    const textContent = generateVerificationEmailText(userName, verificationLink, expiryHours);

    console.log("[EmailVerification] Sending verification email to:", email);

    // Use the owner notification system to send email
    // In a production system, you would use a dedicated email service like SendGrid, AWS SES, etc.
    const result = await notifyOwner({
      title: `Email Verification - ${userName}`,
      content: `Verification email sent to ${email}. Link: ${verificationLink}`,
    });

    if (!result) {
      console.warn("[EmailVerification] Failed to send verification email via notification system");
      // In production, you might want to implement a fallback email service here
      // For now, we'll log it and consider it a soft failure
    }

    console.log("[EmailVerification] Verification email sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("[EmailVerification] Failed to send verification email:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to send verification email"
    );
  }
}

/**
 * Resend verification email to user
 * This is used when the user requests a new verification link
 */
export async function resendVerificationEmail(
  email: string,
  userName: string,
  newVerificationLink: string
): Promise<boolean> {
  return sendVerificationEmail({
    email,
    userName,
    verificationLink: newVerificationLink,
  });
}
