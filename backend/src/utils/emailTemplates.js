// backend/src/utils/emailTemplates.js

// ─────────────────────────────────────────
// EMAIL TEMPLATES
// Plain inline-styled HTML (no external CSS/Tailwind) since email
// clients have inconsistent CSS support — inline styles are the only
// reliably-rendered option across Gmail, Outlook, Apple Mail, etc.
// Kept simple: one accent color, one button, a plain-text fallback
// link, matching the app's actual violet/cyan brand rather than a
// generic auto-generated look.
// ─────────────────────────────────────────

const EMAIL_WRAPPER_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #080D1A;
  padding: 40px 20px;
`

const CARD_STYLE = `
  max-width: 480px;
  margin: 0 auto;
  background-color: #0D1426;
  border-radius: 16px;
  padding: 40px 32px;
  border: 1px solid #1e293b;
`

const BUTTON_STYLE = `
  display: inline-block;
  padding: 14px 28px;
  background: linear-gradient(135deg, #7C3AED, #06B6D4);
  color: #ffffff;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
`

export const resetPasswordTemplate = (resetUrl) => `
<div style="${EMAIL_WRAPPER_STYLE}">
  <div style="${CARD_STYLE}">
    <p style="color: #22D3EE; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px;">
      Mentora AI
    </p>

    <h1 style="color: #ffffff; font-size: 20px; margin: 0 0 16px;">
      Reset your password
    </h1>

    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
      We received a request to reset your Mentora AI password. Click the button below to choose a new one. This link expires in 1 hour.
    </p>

    <a href="${resetUrl}" style="${BUTTON_STYLE}">
      Reset Password
    </a>

    <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 28px 0 0;">
      If the button doesn't work, copy and paste this link into your browser:<br />
      <a href="${resetUrl}" style="color: #22D3EE; word-break: break-all;">${resetUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0;" />

    <p style="color: #475569; font-size: 12px; line-height: 1.6; margin: 0;">
      If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
    </p>
  </div>
</div>
`

export const passwordChangedTemplate = () => `
<div style="${EMAIL_WRAPPER_STYLE}">
  <div style="${CARD_STYLE}">
    <p style="color: #22D3EE; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px;">
      Mentora AI
    </p>

    <h1 style="color: #ffffff; font-size: 20px; margin: 0 0 16px;">
      Your password was changed
    </h1>

    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
      This is a confirmation that your Mentora AI account password was just changed. You've been signed out of all devices as a precaution — you'll need to log in again with your new password.
    </p>

    <hr style="border: none; border-top: 1px solid #1e293b; margin: 0 0 28px;" />

    <p style="color: #f87171; font-size: 13px; line-height: 1.6; margin: 0;">
      If you didn't make this change, your account may be compromised — reset your password immediately using the "Forgot password?" link on the login page.
    </p>
  </div>
</div>
`

export const welcomeTemplate = (name) => `
<div style="${EMAIL_WRAPPER_STYLE}">
  <div style="${CARD_STYLE}">
    <p style="color: #22D3EE; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px;">
      Mentora AI
    </p>

    <h1 style="color: #ffffff; font-size: 20px; margin: 0 0 16px;">
      Welcome, ${name} 👋
    </h1>

    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
      Your Mentora AI account is ready. Pick any concept you think you understand, and start explaining it — the AI will ask exactly the questions that expose where your understanding breaks down.
    </p>

    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="${BUTTON_STYLE}">
      Start Your First Session
    </a>
  </div>
</div>
`