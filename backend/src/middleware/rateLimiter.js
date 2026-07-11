import rateLimit from 'express-rate-limit'

// ─────────────────────────────────────────
// LOGIN LIMITER
// Strictest — protects against brute force
// 10 attempts per 15 minutes per IP
// ─────────────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 10,                   // max 10 requests per window
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,  // sends RateLimit-* headers in the response
  legacyHeaders: false,   // disables the old X-RateLimit-* headers
  skipSuccessfulRequests: true,
  // skipSuccessfulRequests: true means successful logins don't count
  // against the limit — only failed ones do
  // A real user logging in successfully shouldn't be penalised
})

// ─────────────────────────────────────────
// REGISTER LIMITER
// Prevents mass account creation
// 5 accounts per hour per IP
// ─────────────────────────────────────────
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  max: 5,
  message: {
    status: 'error',
    message: 'Too many accounts created from this IP. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─────────────────────────────────────────
// REFRESH TOKEN LIMITER
// Generous — the frontend calls this automatically
// when an access token expires
// 60 requests per 15 minutes per IP
// ─────────────────────────────────────────
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    status: 'error',
    message: 'Too many refresh requests. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// ─────────────────────────────────────────
// GENERAL API LIMITER
// Applied to all routes as a baseline
// 100 requests per 15 minutes per IP
// ─────────────────────────────────────────
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})


// ─────────────────────────────────────────
// PASSWORD RESET LIMITER
// Shared by both /forgot-password and /reset-password.
// Without this, someone could spam a target's inbox with reset
// emails, or brute-force guess valid reset tokens against
// /reset-password (though the token itself is 32 random bytes, so
// brute-forcing it directly is infeasible — this limiter is mainly
// to stop email-flooding abuse via /forgot-password).
// 5 attempts per 15 minutes per IP — stricter than the general
// limiter, similar in spirit to loginLimiter.
// ─────────────────────────────────────────
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many password reset attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})