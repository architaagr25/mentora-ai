// backend/src/services/emailService.js
import nodemailer from 'nodemailer'
import logger from '../utils/logger.js'

// ─────────────────────────────────────────
// TRANSPORTER
// Uses Gmail SMTP via an app password (not your real Gmail password —
// see .env.example's comment: Google Account → Security → App
// Passwords).
//
// Deliberately created LAZILY (on first use) rather than at module
// import time. ES module imports execute before any other code in
// the importing file runs — so if this transporter were built at
// the top level here, and this file gets imported (even transitively,
// e.g. via auth.js) before app.js's own dotenv.config() call has run,
// process.env.EMAIL_FROM/EMAIL_PASS would still be undefined at the
// moment this file loads, permanently baking in broken credentials.
// Building it inside a function — called only when an email is
// actually being sent, well after the app has fully started — avoids
// depending on import order at all.
// ─────────────────────────────────────────
let transporter = null

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS,
      },
    })
  }
  return transporter
}
// ─────────────────────────────────────────
// SEND EMAIL
// Generic helper every specific email (password reset, welcome, etc.)
// routes through. Deliberately never throws — email is a secondary
// concern to whatever triggered it (e.g. a password reset token should
// still be generated and saved even if the email fails to send; the
// user can be told to request a new one). Returns { success, error }
// so callers can decide what to tell the user, without the failure
// ever bubbling up as an unhandled exception.
// ─────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  try {
    await getTransporter().sendMail({
      from: `"Mentora AI" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (err) {
    logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${err.message}`)
    return { success: false, error: err.message }
  }
}