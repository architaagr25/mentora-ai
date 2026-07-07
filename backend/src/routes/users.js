// backend/src/routes/users.js
import express from 'express'
import User from '../models/User.js'
import auth from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { updateProfileSchema, changePasswordSchema } from '../validators/userValidator.js'
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

    const { name, email } = result.data

    // If email is changing, check no other account already has it.
    // The schema itself has a unique index, but checking explicitly
    // first lets us return a clean 409 with a clear message instead
    // of a raw duplicate-key error bubbling up from Mongoose.
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } })
      if (existing) {
        throw new AppError('An account with that email already exists', 409)
      }
    }

    // Only touch fields that were actually provided —
    // req.user is a Mongoose document here (attached by auth middleware),
    // so we can mutate + save directly rather than findByIdAndUpdate,
    // keeping this consistent with how other routes handle req.user
    if (name !== undefined) req.user.name = name
    if (email !== undefined) req.user.email = email

    await req.user.save()

    res.status(200).json({
      status: 'success',
      user: req.user.toJSON(),
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

    // Changing your password invalidates all existing refresh tokens —
    // forces re-login everywhere else you're signed in. This is a
    // deliberate security choice (in case the password change was
    // prompted by a compromised session) — remove this line if you'd
    // rather leave other devices logged in.
    user.refreshTokens = []

    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully. Please log in again.',
    })
  } catch (err) {
    next(err)
  }
})

export default router