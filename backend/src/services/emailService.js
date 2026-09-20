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

// Brevo is a third-party HTTP call on a request path. Without a
// deadline a hung connection would hold the request open until
// Node's own socket timeout — minutes, not seconds.
const SEND_TIMEOUT_MS = 10_000

// Must exactly match the address verified in Brevo's dashboard
// (Settings → Senders & IP → Senders) — sends will fail otherwise.
// Read per-send rather than at module load: this module is imported
// through the route files, which are imported at the top of app.js,
// i.e. BEFORE dotenv.config() runs. Captured at load time, the
// sender address was undefined on any machine that keeps its
// configuration in .env rather than in real environment variables.
const fromAddress = () => ({
  email: process.env.EMAIL_FROM,
  name: 'Mentora AI',
})

// ─────────────────────────────────────────
// STARTUP CHECK
// Email failures are quiet by design (nothing is allowed to fail a
// registration or a password change), so a missing key would
// otherwise only show up as mail that silently never arrives.
// ─────────────────────────────────────────
export const checkEmailConfig = () => {
  const missing = ['BREVO_API_KEY', 'EMAIL_FROM'].filter((key) => !process.env[key])

  if (missing.length) {
    logger.warn(
      `Email is not configured — ${missing.join(' and ')} missing. ` +
        'Welcome, password-reset and password-changed emails will not be sent.'
    )
  }

  return { ok: missing.length === 0, missing }
}

// ─────────────────────────────────────────
// SEND EMAIL
// Same signature as before plus `text`, the plain-text part. Never
// throws; returns { success, error } so callers can decide what to
// tell the user without an unhandled exception.
// ─────────────────────────────────────────
export const sendEmail = async ({ to, subject, html, text }) => {
  const timeout = AbortSignal.timeout(SEND_TIMEOUT_MS)

  try {
    const response = await fetch(BREVO_SEND_EMAIL_URL, {
      method: 'POST',
      signal: timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: fromAddress(),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        // Sent only when a caller supplies one — Brevo rejects an
        // empty textContent rather than ignoring it
        ...(text ? { textContent: text } : {}),
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
    const message =
      err.name === 'TimeoutError' || err.name === 'AbortError'
        ? `Brevo did not respond within ${SEND_TIMEOUT_MS / 1000}s`
        : err.message
    logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${message}`)
    return { success: false, error: message }
  }
}
