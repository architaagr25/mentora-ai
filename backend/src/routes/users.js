// backend/src/routes/users.js
import express from 'express'
import User from '../models/User.js'
import auth from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { disconnectUserSockets } from '../socket/userSockets.js'
import { updateProfileSchema, changePasswordSchema } from '../validators/userValidator.js'
import { sendEmail } from '../services/emailService.js'
import {
  emailChangeConfirmTemplate,
  emailChangeNoticeTemplate,
  passwordChangedTemplate,
} from '../utils/emailTemplates.js'
import { getAppUrl } from '../utils/appUrl.js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const router = express.Router()

// Every route below requires a logged-in user —
// same pattern as sessions.js
router.use(auth)

// ─────────────────────────────────────────
// PATCH /api/users/me
// Update the logged-in user's own name and/or email.
// ─────────────────────────────────────────
router.patch('/me', async (req, res, next) => {
  try {
    const result = updateProfileSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { name, email, currentPassword } = result.data

    // The form posts the email on every save, so "sent an email" and
    // "wants a different email" are not the same thing — only a real
    // difference sets the confirmation flow going.
    const wantsEmailChange = email !== undefined && email !== req.user.email

    if (wantsEmailChange) {
      // A live session is not enough to move an account to another
      // address. Someone who sat down at an unlocked laptop could
      // otherwise point the account at their own inbox and take it
      // over through "forgot password" at their leisure.
      if (!currentPassword) {
        throw new AppError('Enter your current password to change your email', 400)
      }

      // auth middleware leaves passwordHash out of req.user
      const withHash = await User.findById(req.user._id).select('+passwordHash')
      const isMatch = await withHash.comparePassword(currentPassword)
      if (!isMatch) {
        throw new AppError('Current password is incorrect', 401)
      }

      // The unique index would catch this too, but a clean 409 reads
      // better than a raw duplicate-key error from Mongoose.
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } })
      if (existing) {
        throw new AppError('An account with that email already exists', 409)
      }
    }

    // A rename applies straight away — req.user is a Mongoose document
    // here (attached by the auth middleware), so we mutate and save
    // rather than findByIdAndUpdate, as the other routes do
    if (name !== undefined) req.user.name = name

    let pendingEmail = null

    if (wantsEmailChange) {
      // Held in escrow: the account keeps its current address until
      // someone opens the link sent to the new one. Only the hash is
      // stored, same as the password-reset token.
      const rawToken = crypto.randomBytes(32).toString('hex')
      req.user.pendingEmail = email
      req.user.emailChangeToken = crypto.createHash('sha256').update(rawToken).digest('hex')
      req.user.emailChangeExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      pendingEmail = email

      const confirmUrl = `${getAppUrl()}/confirm-email/${rawToken}`
      const previousEmail = req.user.email

      await req.user.save()

      // Fire-and-forget, like every other email here: the request has
      // already been recorded, and a Brevo outage should not turn into
      // a failed profile save.
      sendEmail({
        to: email,
        subject: 'Confirm your new Mentora AI email address',
        ...emailChangeConfirmTemplate(confirmUrl),
      })

      // The old address gets told as well. If the request did not come
      // from the owner, this is the last message that still reaches
      // them — so it goes out whether or not the change is confirmed.
      sendEmail({
        to: previousEmail,
        subject: 'Someone asked to change your Mentora AI email',
        ...emailChangeNoticeTemplate(email),
      })
    } else {
      await req.user.save()
    }

    res.status(200).json({
      status: 'success',
      user: req.user.toJSON(),
      pendingEmail,
      message: pendingEmail
        ? `Check ${pendingEmail} for a confirmation link. Your email stays the same until you open it.`
        : undefined,
    })
  } catch (err) {
    next(err)
  }
})




// ─────────────────────────────────────────
// POST /api/users/change-password
// Requires the current password to prevent someone with
// just a live session (but not the actual password) from
// locking the real owner out of their account.
// ─────────────────────────────────────────
router.post('/change-password', async (req, res, next) => {
  try {
    const result = changePasswordSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { currentPassword, newPassword } = result.data

    // auth middleware excludes passwordHash from req.user —
    // re-fetch with it included so we can verify currentPassword
    const user = await User.findById(req.user._id).select('+passwordHash')

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401)
    }

  user.passwordHash = await bcrypt.hash(newPassword, 12)

    // Any outstanding reset link is now stale. Left in place, a link
    // requested before this change would still work for the rest of
    // its hour — so someone who had asked for a reset (or who had
    // reached the mailbox) could undo the change that was made to
    // lock them out.
    user.resetPasswordToken = null
    user.resetPasswordExpires = null

    // A pending email change goes with it. The notice sent to the
    // old address tells the owner to change their password if the
    // request was not theirs — that promise only holds if doing so
    // actually cancels the move.
    user.pendingEmail = null
    user.emailChangeToken = null
    user.emailChangeExpires = null

    // Changing your password invalidates all existing refresh tokens —
    // forces re-login everywhere else you're signed in. This is a
    // deliberate security choice (in case the password change was
    // prompted by a compromised session) — remove this line if you'd
    // rather leave other devices logged in.
    user.refreshTokens = []

    await user.save()

    // Drop any live socket as well — a changed password should end
    // sessions on other devices, not just stop them refreshing
    disconnectUserSockets(user._id)

    // Notify the account owner regardless of who made this change —
    // the important case is when it *wasn't* them (compromised
    // account). Deliberately fire-and-forget: email failure shouldn't
    // block or fail the actual password change, which has already
    // succeeded at this point.
    sendEmail({
      to: user.email,
      subject: 'Your Mentora AI password was changed',
      ...passwordChangedTemplate(),
    })

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully. Please log in again.',
    })
  } catch (err) {
    next(err)
  }
})
export default router