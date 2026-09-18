import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { formatMinutesAsText, formatMinutesAsHTML } from './simpleExport';
import { emailRouter } from './email.procedures';

type MinutesInput = {
  title: string;
  date: string;
  attendees: string[];
  content: string;
  actionItems: Array<{
    description: string;
    assignee?: string;
    dueDate?: string;
    status: string;
  }>;
  speakers?: Array<{
    name: string;
    speakTime: number;
  }>;
};

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

export const exportRouter = router({
  email: emailRouter,

  /**
   * Export meeting minutes as text
   */
  exportMinutesText: protectedProcedure
    .input(minutesSchema)
    .mutation(async ({ input }) => {
      try {
        const text = formatMinutesAsText(input);
        const buffer = Buffer.from(text, 'utf-8');

        return {
          success: true,
          buffer: buffer.toString('base64'),
          filename: `${input.title.replace(/\s+/g, '_')}_${new Date().getTime()}.txt`,
        };
      } catch (error) {
        console.error('[Export] Text generation failed:', error);
        throw new Error('Failed to generate text file');
      }
    }),

  /**
   * Export meeting minutes as HTML
   */
  exportMinutesHTML: protectedProcedure
    .input(minutesSchema)
    .mutation(async ({ input }) => {
      try {
        const html = formatMinutesAsHTML(input);
        const buffer = Buffer.from(html, 'utf-8');

        return {
          success: true,
          buffer: buffer.toString('base64'),
          filename: `${input.title.replace(/\s+/g, '_')}_${new Date().getTime()}.html`,
        };
      } catch (error) {
        console.error('[Export] HTML generation failed:', error);
        throw new Error('Failed to generate HTML file');
      }
    }),
});
