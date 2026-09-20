// backend/src/utils/emailTemplates.js
import { getAppUrl } from './appUrl.js'

// ─────────────────────────────────────────
// EMAIL TEMPLATES
// Plain inline-styled HTML (no external CSS/Tailwind) since email
// clients have inconsistent CSS support — inline styles are the only
// reliably-rendered option across Gmail, Outlook, Apple Mail, etc.
//
// Every template returns { html, text }. The plain-text version is
// not decoration: a mail with no text/plain part scores worse with
// spam filters, and it is what a watch, a screen reader or a
// text-only client actually shows. Callers spread it straight into
// sendEmail: sendEmail({ to, subject, ...welcomeTemplate(name) }).
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// ESCAPING
// Anything that came from a user (so far: their name) is interpolated
// into HTML that gets sent from our verified sender address. A name
// like `<a href="http://evil">Click here</a>` would otherwise arrive
// as a live link in an email that looks like it came from us.
// ─────────────────────────────────────────
export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const SPAM_NOTICE = `
  <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
    Don't see this in your inbox? Check your spam or junk folder.
  </p>
`
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

export const resetPasswordTemplate = (resetUrl) => ({
  html: `
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
    ${SPAM_NOTICE}
  </div>
</div>
`,
  text: `Reset your Mentora AI password

We received a request to reset your Mentora AI password. Open the link below to choose a new one. This link expires in 1 hour.

${resetUrl}

If you didn't request a password reset, you can safely ignore this email — your password will not be changed.

— Mentora AI`,
})

export const passwordChangedTemplate = () => ({
  html: `
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
    ${SPAM_NOTICE}
  </div>
</div>
`,
  text: `Your Mentora AI password was changed

This is a confirmation that your Mentora AI account password was just changed. You've been signed out of all devices as a precaution — you'll need to log in again with your new password.

If you didn't make this change, your account may be compromised — reset your password immediately using the "Forgot password?" link on the login page.

— Mentora AI`,
})

export const welcomeTemplate = (name) => {
  // getAppUrl() is read here, not at module load, so it sees the
  // environment dotenv put in place rather than an empty process.env
  const dashboardUrl = `${getAppUrl()}/dashboard`
  const safeName = escapeHtml(name)

  return {
    html: `
<div style="${EMAIL_WRAPPER_STYLE}">
  <div style="${CARD_STYLE}">
    <p style="color: #22D3EE; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 24px;">
      Mentora AI
    </p>

    <h1 style="color: #ffffff; font-size: 20px; margin: 0 0 16px;">
      Welcome, ${safeName} 👋
    </h1>

    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
      Your Mentora AI account is ready. Pick any concept you think you understand, and start explaining it — the AI will ask exactly the questions that expose where your understanding breaks down.
    </p>

    <a href="${dashboardUrl}" style="${BUTTON_STYLE}">
      Start Your First Session
    </a>
    ${SPAM_NOTICE}
  </div>
</div>
`,
    // The name is plain text here, so it needs no escaping — it only
    // had to be escaped where it landed inside HTML
    text: `Welcome, ${name}

Your Mentora AI account is ready. Pick any concept you think you understand, and start explaining it — the AI will ask exactly the questions that expose where your understanding breaks down.

Start your first session: ${dashboardUrl}

— Mentora AI`,
  }
}
