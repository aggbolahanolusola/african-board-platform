/**
 * Generate HTML email template for email verification
 */
export function generateVerificationEmailHTML(
  userName: string,
  verificationLink: string,
  expiryHours: number = 24
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #0d9488;
    }
    .content {
      padding: 30px 0;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1f2937;
    }
    .message {
      font-size: 14px;
      margin-bottom: 20px;
      color: #6b7280;
    }
    .cta-button {
      display: inline-block;
      padding: 12px 32px;
      background-color: #0d9488;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .cta-button:hover {
      background-color: #0f766e;
    }
    .link-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }
    .link-text {
      font-size: 12px;
      color: #9ca3af;
      word-break: break-all;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
      font-size: 12px;
      color: #9ca3af;
    }
    .expiry-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 13px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌱 NurtGov</div>
      <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">Board Governance, Nurtured for Africa</p>
    </div>

    <div class="content">
      <div class="greeting">Welcome to NurtGov, ${escapeHtml(userName)}!</div>
      
      <div class="message">
        Thank you for signing up. To complete your registration and activate your account, please verify your email address by clicking the button below.
      </div>

      <center>
        <a href="${escapeHtml(verificationLink)}" class="cta-button">Verify Email Address</a>
      </center>

      <div class="expiry-notice">
        ⏰ This verification link will expire in ${expiryHours} hours. If you don't verify within this time, you'll need to sign up again.
      </div>

      <div class="message">
        If you didn't create this account, you can safely ignore this email.
      </div>

      <div class="link-section">
        <div class="link-text">
          <strong>Or copy and paste this link in your browser:</strong><br>
          ${escapeHtml(verificationLink)}
        </div>
      </div>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} NurtGov. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email template for email verification
 */
export function generateVerificationEmailText(
  userName: string,
  verificationLink: string,
  expiryHours: number = 24
): string {
  return `
Welcome to NurtGov, ${userName}!

Thank you for signing up. To complete your registration and activate your account, please verify your email address by visiting the link below:

${verificationLink}

This verification link will expire in ${expiryHours} hours. If you don't verify within this time, you'll need to sign up again.

If you didn't create this account, you can safely ignore this email.

---
© ${new Date().getFullYear()} NurtGov. All rights reserved.
This is an automated message, please do not reply to this email.
  `.trim();
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
