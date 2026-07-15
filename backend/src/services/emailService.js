// backend/src/services/emailService.js
import { Resend } from 'resend'
import logger from '../utils/logger.js'

// ─────────────────────────────────────────
// RESEND CLIENT
// Sends via HTTPS API rather than raw SMTP — this matters because
// Render (and many cloud hosts) block outbound SMTP ports (25, 465,
// 587) by default to prevent their infrastructure being used for
// spam. Nodemailer + Gmail SMTP worked locally but hung until
// timeout on Render for exactly this reason. An HTTPS-based email
// API sidesteps the restriction entirely since it's just a normal
// web request, not an SMTP socket connection.
//
// Created lazily (on first use), same reasoning as before: importing
// this module shouldn't depend on dotenv.config() having already run
// in whichever file imported it first.
// ─────────────────────────────────────────
let resendClient = null

const getResendClient = () => {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Resend's free tier only allows sending from their shared test
// domain unless you verify your own domain with them. Since this
// project doesn't have a custom domain, we send from their test
// address — this can be swapped to a verified custom domain address
// later without changing anything else in this file.
const FROM_ADDRESS = 'Mentora AI <onboarding@resend.dev>'

// ─────────────────────────────────────────
// SEND EMAIL
// Same signature as before — every caller (forgot-password route,
// future welcome/password-changed emails) is unaffected by this
// swap. Never throws; returns { success, error } so callers can
// decide what to tell the user without an unhandled exception.
// ─────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const { error } = await getResendClient().emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })

    if (error) {
      logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${error.message}`)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${err.message}`)
    return { success: false, error: err.message }
  }
}