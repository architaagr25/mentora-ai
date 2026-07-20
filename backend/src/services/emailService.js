// backend/src/services/emailService.js
import logger from '../utils/logger.js'

// ─────────────────────────────────────────
// BREVO — CALLED DIRECTLY VIA THEIR REST API
// Deliberately bypasses the @getbrevo/brevo SDK entirely — the
// installed version turned out to be a newer SDK generation
// (exports: Brevo, BrevoClient, BrevoEnvironment, ...) with a
// completely different shape than the class-based helpers
// (TransactionalEmailsApi, SendSmtpEmail) used in older versions.
// Calling the documented REST endpoint directly with fetch() avoids
// depending on any particular SDK version's export structure — it
// only relies on Brevo's stable HTTP API contract.
// ─────────────────────────────────────────

const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email'

// Must exactly match the address verified in Brevo's dashboard
// (Settings → Senders & IP → Senders) — sends will fail otherwise.
const FROM_ADDRESS = {
  email: process.env.EMAIL_FROM,
  name: 'Mentora AI',
}

// ─────────────────────────────────────────
// SEND EMAIL
// Same signature as before — every caller (forgot-password, welcome,
// password-changed) is unaffected. Never throws; returns
// { success, error } so callers can decide what to tell the user
// without an unhandled exception.
// ─────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await fetch(BREVO_SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: FROM_ADDRESS,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      const message = errorBody.message || `Brevo API returned ${response.status}`
      logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${message}`)
      return { success: false, error: message }
    }

    return { success: true }
  } catch (err) {
    logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${err.message}`)
    return { success: false, error: err.message }
  }
}