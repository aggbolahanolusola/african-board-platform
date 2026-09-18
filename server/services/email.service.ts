/**
 * Email service for sending meeting minutes and notifications
 * Uses Manus built-in notification API for email delivery
 */

import { invokeLLM } from '../_core/llm';
import { notifyOwner } from '../_core/notification';

interface EmailRecipient {
  email: string;
  name: string;
}

interface SendEmailOptions {
  recipients: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachmentFilename?: string;
  attachmentContent?: string;
}

interface MinutesEmailData {
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
}

/**
 * Generate professional HTML email template for meeting minutes
 */
export function generateMinutesEmailTemplate(
  data: MinutesEmailData,
  senderName: string
): string {
  const dateStr = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const attendeesList = data.attendees.join(', ');

  let actionItemsHtml = '';
  if (data.actionItems && data.actionItems.length > 0) {
    actionItemsHtml = `
      <h3 style="color: #1a5f7a; margin-top: 30px; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">
        Action Items
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background-color: #1a5f7a; color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Action</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Assignee</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Due Date</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.actionItems
            .map(
              (item) => `
            <tr style="background-color: ${data.actionItems.indexOf(item) % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 10px; border: 1px solid #ddd;">${item.description}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${item.assignee || '-'}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${
                item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'
              }</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-transform: capitalize;">${item.status}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  let speakersHtml = '';
  if (data.speakers && data.speakers.length > 0) {
    const totalTime = data.speakers.reduce((sum, s) => sum + s.speakTime, 0);
    speakersHtml = `
      <h3 style="color: #1a5f7a; margin-top: 30px; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">
        Speaker Statistics
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background-color: #1a5f7a; color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Speaker</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Duration</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${data.speakers
            .map(
              (speaker, index) => {
                const percentage = ((speaker.speakTime / totalTime) * 100).toFixed(1);
                const minutes = Math.floor(speaker.speakTime / 60);
                const seconds = speaker.speakTime % 60;
                return `
            <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 10px; border: 1px solid #ddd;">${speaker.name}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${minutes}:${seconds.toString().padStart(2, '0')}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${percentage}%</td>
            </tr>
          `;
              }
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Poppins', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1a5f7a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a5f7a;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #666;
      margin: 5px 0 0 0;
      font-size: 14px;
    }
    .meeting-info {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      border-left: 4px solid #d4a574;
    }
    .meeting-info p {
      margin: 5px 0;
      font-size: 14px;
    }
    .meeting-info strong {
      color: #1a5f7a;
    }
    .content {
      margin: 30px 0;
      line-height: 1.8;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
    .sender-info {
      color: #666;
      font-size: 13px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NurtGov</h1>
      <p>Board Governance Platform</p>
    </div>

    <h2 style="color: #1a5f7a; margin-bottom: 20px;">${data.title}</h2>

    <div class="meeting-info">
      <p><strong>Date:</strong> ${dateStr}</p>
      <p><strong>Attendees:</strong> ${attendeesList}</p>
      <p><strong>Sent by:</strong> ${senderName}</p>
    </div>

    <div class="content">
      <h3 style="color: #1a5f7a; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #d4a574; padding-bottom: 10px;">
        Meeting Minutes
      </h3>
      <p>${data.content.replace(/\n/g, '<br>')}</p>
    </div>

    ${speakersHtml}
    ${actionItemsHtml}

    <div class="footer">
      <p>© ${new Date().getFullYear()} NurtGov. All rights reserved.</p>
      <p>This email contains confidential information. If you are not the intended recipient, please delete this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of meeting minutes for email
 */
export function generateMinutesEmailText(data: MinutesEmailData): string {
  const dateStr = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [];

  lines.push('NURTGOV - BOARD GOVERNANCE PLATFORM');
  lines.push('Meeting Minutes');
  lines.push('='.repeat(60));
  lines.push('');

  lines.push(`Title: ${data.title}`);
  lines.push(`Date: ${dateStr}`);
  lines.push(`Attendees: ${data.attendees.join(', ')}`);
  lines.push('');

  lines.push('MEETING MINUTES:');
  lines.push('-'.repeat(60));
  lines.push(data.content);
  lines.push('');

  if (data.speakers && data.speakers.length > 0) {
    lines.push('SPEAKER STATISTICS:');
    lines.push('-'.repeat(60));

    const totalTime = data.speakers.reduce((sum, s) => sum + s.speakTime, 0);

    data.speakers.forEach((speaker) => {
      const percentage = ((speaker.speakTime / totalTime) * 100).toFixed(1);
      const minutes = Math.floor(speaker.speakTime / 60);
      const seconds = speaker.speakTime % 60;

      lines.push(
        `${speaker.name}: ${minutes}:${seconds.toString().padStart(2, '0')} (${percentage}%)`
      );
    });
    lines.push('');
  }

  if (data.actionItems && data.actionItems.length > 0) {
    lines.push('ACTION ITEMS:');
    lines.push('-'.repeat(60));

    data.actionItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.description}`);

      if (item.assignee) {
        lines.push(`   Assignee: ${item.assignee}`);
      }

      if (item.dueDate) {
        lines.push(`   Due Date: ${new Date(item.dueDate).toLocaleDateString()}`);
      }

      lines.push(`   Status: ${item.status}`);
      lines.push('');
    });
  }

  lines.push('='.repeat(60));
  lines.push(`© ${new Date().getFullYear()} NurtGov. All rights reserved.`);

  return lines.join('\n');
}

/**
 * Validate email addresses
 */
export function validateEmails(emails: string[]): {
  valid: string[];
  invalid: string[];
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return {
    valid: emails.filter((email) => emailRegex.test(email)),
    invalid: emails.filter((email) => !emailRegex.test(email)),
  };
}

/**
 * Log email sending attempt (for audit trail)
 */
export async function logEmailSent(
  minutesTitle: string,
  recipients: EmailRecipient[],
  userId: string
): Promise<void> {
  try {
    const recipientEmails = recipients.map((r) => r.email).join(', ');
    console.log(
      `[Email] Sent meeting minutes "${minutesTitle}" to ${recipientEmails} by user ${userId}`
    );

    // Notify owner of email sending activity
    await notifyOwner({
      title: 'Meeting Minutes Emailed',
      content: `Meeting minutes "${minutesTitle}" were sent to ${recipients.length} recipient(s): ${recipientEmails}`,
    });
  } catch (error) {
    console.error('[Email] Failed to log email:', error);
  }
}
