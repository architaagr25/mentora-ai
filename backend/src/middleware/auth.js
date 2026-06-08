import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { AppError } from './errorHandler.js'

const auth = async (req, res, next) => {
  try {
    // ─────────────────────────────────────────
    // Step 1: Get the token from the header
    // The Authorization header looks like: "Bearer eyJhbGci..."
    // We split on the space and take the second part
    // ─────────────────────────────────────────
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please log in.', 401)
    }

    const token = authHeader.split(' ')[1]

    // ─────────────────────────────────────────
    // Step 2: Verify the token
    // jwt.verify checks:
    // - Is the signature valid? (was it signed with our secret?)
    // - Has the token expired?
    // If either check fails it throws an error
    // Our errorHandler already handles JsonWebTokenError and TokenExpiredError
    // ─────────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    // decoded is now: { userId: '660...', iat: 1234567890, exp: 1234568790 }
    // iat = issued at (unix timestamp)
    // exp = expiry (unix timestamp)

    // ─────────────────────────────────────────
    // Step 3: Find the user in the database
    // We use the userId from the token payload
    // .select('-passwordHash -refreshTokens') excludes those fields
    // Even though toJSON() strips them, it's good practice to not fetch them at all
    // ─────────────────────────────────────────
    const user = await User.findById(decoded.userId).select(
      '-passwordHash -refreshTokens'
    )

    if (!user) {
      // Token was valid but user was deleted after the token was issued
      throw new AppError('User no longer exists.', 401)
    }

    // ─────────────────────────────────────────
    // Step 4: Attach user to the request object
    // Every route handler that uses this middleware
    // can now access req.user to know who is making the request
    // ─────────────────────────────────────────
    req.user = user

    next()
  } catch (err) {
    next(err)
    // Passes the error to our errorHandler middleware
    // JWT errors (JsonWebTokenError, TokenExpiredError)
    // are already handled there
  }
}

export default auth