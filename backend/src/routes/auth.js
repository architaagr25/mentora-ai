import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import auth from '../middleware/auth.js'
import { loginLimiter, registerLimiter, refreshLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js'
import { registerSchema, loginSchema } from '../validators/authValidator.js'
import { AppError } from '../middleware/errorHandler.js'
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens.js'
import crypto from 'crypto'
import { z } from 'zod'
import { sendEmail } from '../services/emailService.js'
import { resetPasswordTemplate, welcomeTemplate } from '../utils/emailTemplates.js'
import logger from '../utils/logger.js'

const router = express.Router()

// ─────────────────────────────────────────
// COOKIE OPTIONS
// httpOnly: true — JavaScript cannot read this cookie
// secure: true in production — only sent over HTTPS
// sameSite: 'strict' — cookie not sent on cross-site requests
// maxAge — how long the cookie lives in milliseconds
// ─────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,               // required when sameSite is 'none'
  sameSite: 'none',           // required for cross-domain cookies (Vercel <-> Render)
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

// ─────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    // Step 1: Validate input
    const result = registerSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { name, email, password } = result.data
    // result.data has already been trimmed and lowercased by Zod

    // Step 2: Check if email already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError('An account with that email already exists', 409)
    }

    // Step 3: Hash the password
    // 12 is the salt rounds — higher = more secure but slower
    // 12 is the industry standard balance point
    const passwordHash = await bcrypt.hash(password, 12)

    // Step 4: Generate tokens
    // We need the userId for the token payload
    // But we don't have the userId until after we save to DB
    // So we save first, then generate tokens
    const user = await User.create({ name, email, passwordHash })

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    // Step 5: Store refresh token in DB
    user.refreshTokens.push(refreshToken)
    await user.save()

    // Step 6: Send refresh token as httpOnly cookie
   // Step 6: Send refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

    // Fire-and-forget welcome email — same reasoning as the
    // password-changed email: registration has already succeeded,
    // no reason to make the user wait on an email round-trip.
    sendEmail({
      to: user.email,
      subject: 'Welcome to Mentora AI',
      html: welcomeTemplate(user.name),
    })

    // Step 7: Send response
    // user.toJSON() automatically strips passwordHash and refreshTokens
    res.status(201).json({
      status: 'success',
      accessToken,
      user: user.toJSON(),
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    // Step 1: Validate input
    const result = loginSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { email, password } = result.data

    // Step 2: Find user
    // We need passwordHash for comparison so we explicitly select it back
    // Remember — toJSON strips it but select('-passwordHash') would exclude it from the query
    // Here we need it so we don't exclude it
    const user = await User.findOne({ email }).select('+passwordHash')

    if (!user) {
      // Important: same error message whether email or password is wrong
      // Never tell an attacker which one failed — that's information leakage
      throw new AppError('Invalid email or password', 401)
    }

    // Step 3: Compare password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401)
    }

    // Step 4: Generate tokens
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    // Step 5: Store refresh token
    // A user can be logged in on multiple devices
    // So we push rather than replace
    user.refreshTokens.push(refreshToken)
    await user.save()

    // Step 6: Set cookie and respond
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

    res.status(200).json({
      status: 'success',
      accessToken,
      user: user.toJSON(),
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/auth/refresh-token
// ─────────────────────────────────────────
router.post('/refresh-token', refreshLimiter, async (req, res, next) => {
  try {
    // Step 1: Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
      throw new AppError('No refresh token provided', 401)
    }

    // Step 2: Verify the JWT signature and expiry
    let decoded
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch {
      throw new AppError('Invalid or expired refresh token', 401)
    }

    // Step 3: Check token is in the whitelist
    // Find user who has this exact refresh token stored
    const user = await User.findOne({
      _id: decoded.userId,
      refreshTokens: refreshToken,
      // MongoDB checks if refreshToken exists in the refreshTokens array
    })

    if (!user) {
      // Token was valid JWT but not in DB — possible token theft
      // Clear the cookie just in case
      res.clearCookie('refreshToken')
      throw new AppError('Refresh token is no longer valid. Please log in again.', 401)
    }

    // Step 4: Issue new access token
    const newAccessToken = generateAccessToken(user._id)

    res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (refreshToken) {
      // Remove this specific refresh token from the DB
      // $pull removes elements from an array that match the condition
      await User.updateOne(
        { refreshTokens: refreshToken },
        { $pull: { refreshTokens: refreshToken } }
      )
    }

    // Clear the cookie regardless of whether we found a token
    res.clearCookie('refreshToken', COOKIE_OPTIONS)

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/auth/forgot-password
// Always responds with the same generic message whether or not the
// email exists — this is deliberate, not an oversight. Responding
// differently ("email not found" vs "link sent") would let an
// attacker enumerate every registered email by trying addresses one
// at a time and watching which response comes back.
// ─────────────────────────────────────────
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email').toLowerCase(),
})

router.post('/forgot-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { email } = result.data
    const genericMessage =
      'If an account with that email exists, a password reset link has been sent.'

    const user = await User.findOne({ email })

    // Deliberately identical response whether or not the user exists —
    // see comment above.
    if (!user) {
      return res.status(200).json({ status: 'success', message: genericMessage })
    }

    // Generate a random raw token — this is what goes in the email.
    // Only its hash is ever stored in the database (see User.js for
    // why: a DB leak shouldn't hand out working reset links).
    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`

    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Reset your Mentora AI password',
      html: resetPasswordTemplate(resetUrl),
    })

    if (!emailResult.success) {
      // Log for debugging, but still return the generic success
      // message — telling the user "email failed to send" would
      // itself confirm the account exists, defeating the point of
      // the generic response above.
      logger.error(`Failed to send reset email to ${user.email}: ${emailResult.error}`)
    }

    res.status(200).json({ status: 'success', message: genericMessage })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/auth/reset-password
// Takes the raw token from the emailed reset link + a new password.
// Since only a hash of the token was ever stored, we hash whatever
// the client submits and look for a matching, still-valid record —
// same idea as password comparison, just with a fast hash suited to
// a high-entropy random token rather than bcrypt (suited to
// low-entropy human passwords).
// ─────────────────────────────────────────
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'New password must be at least 8 characters')
    .max(72, 'New password cannot exceed 72 characters'),
})

router.post('/reset-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { token, newPassword } = result.data

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // select() needed here since resetPasswordToken/Expires are
    // select: false by default on the schema (see User.js)
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires')

    if (!user) {
      throw new AppError('This reset link is invalid or has expired. Please request a new one.', 400)
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    user.resetPasswordToken = null
    user.resetPasswordExpires = null

    // Same security pattern as the change-password flow — invalidate
    // every existing session, since a password reset is exactly the
    // kind of event (account recovery, possibly after a compromise)
    // where old sessions shouldn't be trusted to continue silently.
    user.refreshTokens = []

    await user.save()

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. Please log in with your new password.',
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// GET /api/auth/me
// Protected — requires valid access token
// ─────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  // auth middleware already fetched the user and attached to req.user
  // Nothing to do here except return it
  res.status(200).json({
    status: 'success',
    user: req.user,
  })
})

export default router