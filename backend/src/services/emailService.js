// backend/src/services/emailService.js
import * as brevo from '@getbrevo/brevo'
import logger from '../utils/logger.js'

// ─────────────────────────────────────────
// BREVO CLIENT
// Sends via HTTPS API, not SMTP — avoids Render's outbound SMTP
// port-blocking (the same reason Gmail SMTP via Nodemailer worked
// locally but hung until timeout in production).
//
// Unlike Resend's free/unverified-domain tier — which only allows
// sending to the address you signed up with — Brevo allows verifying
// a single email address you own (click a confirmation link sent to
// that inbox) and then send to ANY recipient, no domain required.
//
// Created lazily (on first use) rather than at module import time,
// so this doesn't depend on dotenv.config() having already run in
// whichever file imports this module first.
// ─────────────────────────────────────────
let apiInstance = null

const getBrevoClient = () => {
  if (!apiInstance) {
    apiInstance = new brevo.TransactionalEmailsApi()
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY
    )
  }
  return apiInstance
}

// Must exactly match the address verified in Brevo's dashboard
// (Settings → Senders & IP → Senders) — sends will fail otherwise.
const FROM_ADDRESS = {
  email: process.env.EMAIL_FROM,
  name: 'Mentora AI',
}

// ─────────────────────────────────────────
// SEND EMAIL
// Same signature as the previous Resend version — every caller
// (forgot-password, welcome, password-changed) is unaffected by
// this swap. Never throws; returns { success, error } so callers
// can decide what to tell the user without an unhandled exception.
// ─────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  try {
    // Passing a plain object instead of constructing brevo.SendSmtpEmail()
    // — the SDK's exported class shape has changed across versions and
    // "new brevo.SendSmtpEmail()" isn't reliably available. The API
    // client accepts a plain object with the same field names, so this
    // sidesteps depending on that specific class export entirely.
    await getBrevoClient().sendTransacEmail({
      sender: FROM_ADDRESS,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    })
    return { success: true }
  } catch (err) {
    const message = err.response?.body?.message || err.message
    logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${message}`)
    return { success: false, error: message }
  }
}