/**
 * Simple export utilities for meeting minutes
 * Generates PDF and DOCX with basic formatting
 */

interface MinutesData {
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
 * Format minutes data as plain text
 */
export function formatMinutesAsText(data: MinutesData): string {
  const lines: string[] = [];

  // Header
  lines.push('NURTGOV - BOARD GOVERNANCE PLATFORM');
  lines.push('Meeting Minutes');
  lines.push('='.repeat(60));
  lines.push('');

  // Title and date
  lines.push(`Title: ${data.title}`);
  lines.push(
    `Date: ${new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`
  );
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  // Attendees
  lines.push('ATTENDEES:');
  lines.push('-'.repeat(60));
  data.attendees.forEach((attendee) => {
    lines.push(`  • ${attendee}`);
  });
  lines.push('');

  // Speaker statistics
  if (data.speakers && data.speakers.length > 0) {
    lines.push('SPEAKER STATISTICS:');
    lines.push('-'.repeat(60));

    const totalTime = data.speakers.reduce((sum, s) => sum + s.speakTime, 0);

    data.speakers.forEach((speaker) => {
      const percentage = ((speaker.speakTime / totalTime) * 100).toFixed(1);
      const minutes = Math.floor(speaker.speakTime / 60);
      const seconds = speaker.speakTime % 60;

      lines.push(
        `  ${speaker.name}: ${minutes}:${seconds.toString().padStart(2, '0')} (${percentage}%)`
      );
    });
    lines.push('');
  }

  // Minutes content
  lines.push('MEETING MINUTES:');
  lines.push('-'.repeat(60));
  lines.push(data.content);
  lines.push('');

  // Action items
  if (data.actionItems.length > 0) {
    lines.push('ACTION ITEMS:');
    lines.push('-'.repeat(60));

    data.actionItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.description}`);

      if (item.assignee) {
        lines.push(`   Assignee: ${item.assignee}`);
      }

      if (item.dueDate) {
        lines.push(
          `   Due Date: ${new Date(item.dueDate).toLocaleDateString()}`
        );
      }

      lines.push(`   Status: ${item.status}`);
      lines.push('');
    });
  }

  // Footer
  lines.push('='.repeat(60));
  lines.push(`© ${new Date().getFullYear()} NurtGov. All rights reserved.`);

  return lines.join('\n');
}

/**
 * Format minutes data as HTML for PDF conversion
 */
export function formatMinutesAsHTML(data: MinutesData): string {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #1a5f7a;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #1a5f7a;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0;
      color: #666;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1a5f7a;
      margin: 20px 0 10px 0;
    }
    .meta {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .meta p {
      margin: 5px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1a5f7a;
      margin-top: 20px;
      margin-bottom: 10px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .attendee-list {
      list-style-type: none;
      padding-left: 0;
    }
    .attendee-list li {
      padding: 5px 0;
      padding-left: 20px;
    }
    .attendee-list li:before {
      content: "• ";
      margin-right: 10px;
      color: #d4a574;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #1a5f7a;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .action-item {
      margin: 15px 0;
      padding: 10px;
      background: #f9f9f9;
      border-left: 3px solid #d4a574;
    }
    .action-item-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .action-item-detail {
      font-size: 14px;
      color: #666;
      margin: 3px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>NurtGov</h1>
    <p>Board Governance Platform</p>
  </div>

  <div class="title">${data.title}</div>

  <div class="meta">
    <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="section-title">Attendees</div>
  <ul class="attendee-list">
    ${data.attendees.map((a) => `<li>${a}</li>`).join('\n')}
  </ul>
`;

  // Speaker statistics
  if (data.speakers && data.speakers.length > 0) {
    const totalTime = data.speakers.reduce((sum, s) => sum + s.speakTime, 0);

    html += `
  <div class="section-title">Speaker Statistics</div>
  <table>
    <thead>
      <tr>
        <th>Speaker</th>
        <th>Duration</th>
        <th>Percentage</th>
      </tr>
    </thead>
    <tbody>
`;

    data.speakers.forEach((speaker) => {
      const percentage = ((speaker.speakTime / totalTime) * 100).toFixed(1);
      const minutes = Math.floor(speaker.speakTime / 60);
      const seconds = speaker.speakTime % 60;

      html += `
      <tr>
        <td>${speaker.name}</td>
        <td>${minutes}:${seconds.toString().padStart(2, '0')}</td>
        <td>${percentage}%</td>
      </tr>
`;
    });

    html += `
    </tbody>
  </table>
`;
  }

  // Minutes content
  html += `
  <div class="section-title">Meeting Minutes</div>
  <p>${data.content.replace(/\n/g, '<br>')}</p>
`;

  // Action items
  if (data.actionItems.length > 0) {
    html += `
  <div class="section-title">Action Items</div>
`;

    data.actionItems.forEach((item, index) => {
      html += `
  <div class="action-item">
    <div class="action-item-title">${index + 1}. ${item.description}</div>
    ${item.assignee ? `<div class="action-item-detail"><strong>Assignee:</strong> ${item.assignee}</div>` : ''}
    ${item.dueDate ? `<div class="action-item-detail"><strong>Due Date:</strong> ${new Date(item.dueDate).toLocaleDateString()}</div>` : ''}
    <div class="action-item-detail"><strong>Status:</strong> ${item.status}</div>
  </div>
`;
    });
  }

  html += `
  <div class="footer">
    © ${new Date().getFullYear()} NurtGov. All rights reserved.
  </div>
</body>
</html>
`;

  return html;
}
