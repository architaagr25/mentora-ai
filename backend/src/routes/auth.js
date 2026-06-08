import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import auth from '../middleware/auth.js'
import { loginLimiter, registerLimiter, refreshLimiter } from '../middleware/rateLimiter.js'
import { registerSchema, loginSchema } from '../validators/authValidator.js'
import { AppError } from '../middleware/errorHandler.js'
import { generateAccessToken, generateRefreshToken } from '../utils/generateTokens.js'

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
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
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
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

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