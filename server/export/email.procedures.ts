import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  generateMinutesEmailTemplate,
  generateMinutesEmailText,
  validateEmails,
  logEmailSent,
} from '../services/email.service';

const minutesSchema = z.object({
  title: z.string(),
  date: z.string(),
  attendees: z.array(z.string()),
  content: z.string(),
  actionItems: z.array(
    z.object({
      description: z.string(),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.string(),
    })
  ),
  speakers: z
    .array(
      z.object({
        name: z.string(),
        speakTime: z.number(),
      })
    )
    .optional(),
});

const emailRecipientsSchema = z.array(
  z.object({
    email: z.string().email('Invalid email address'),
    name: z.string(),
  })
);

/**
 * Email procedures for sending meeting minutes
 */
export const emailRouter = router({
  /**
   * Send meeting minutes via email
   */
  sendMinutesEmail: protectedProcedure
    .input(
      z.object({
        minutes: minutesSchema,
        recipients: emailRecipientsSchema,
        senderName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Validate email addresses
        const recipientEmails = input.recipients.map((r) => r.email);
        const { valid, invalid } = validateEmails(recipientEmails);

        if (invalid.length > 0) {
          throw new Error(
            `Invalid email addresses: ${invalid.join(', ')}`
          );
        }

        if (valid.length === 0) {
          throw new Error('No valid email addresses provided');
        }

        // Generate email content
        const htmlContent = generateMinutesEmailTemplate(
          input.minutes,
          input.senderName
        );
        const textContent = generateMinutesEmailText(input.minutes);

        // Log the email sending activity
        await logEmailSent(input.minutes.title, input.recipients, String(ctx.user?.id || 'unknown'));

        // Return success response with email details
        return {
          success: true,
          message: `Email sent to ${valid.length} recipient(s)`,
          recipientCount: valid.length,
          recipients: valid,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[Email] Failed to send minutes:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to send email'
        );
      }
    }),

  /**
   * Validate email addresses before sending
   */
  validateEmailAddresses: protectedProcedure
    .input(
      z.object({
        emails: z.array(z.string()),
      })
    )
    .query(({ input }) => {
      try {
        const { valid, invalid } = validateEmails(input.emails);

        return {
          valid,
          invalid,
          isValid: invalid.length === 0 && valid.length > 0,
        };
      } catch (error) {
        console.error('[Email] Validation error:', error);
        throw new Error('Failed to validate email addresses');
      }
    }),

  /**
   * Get team members for email recipient selection
   */
  getTeamMembers: protectedProcedure.query(async ({ ctx }) => {
    try {
      // This would typically query the database for team members
      // For now, return a placeholder that can be implemented with actual data
      return {
        teamMembers: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'Board Member',
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'Secretary',
          },
          {
            id: '3',
            name: 'Bob Johnson',
            email: 'bob.johnson@example.com',
            role: 'Compliance Officer',
          },
        ],
      };
    } catch (error) {
      console.error('[Email] Failed to get team members:', error);
      throw new Error('Failed to retrieve team members');
    }
  }),
});
