// backend/src/socket/socketRateLimit.js

// ─────────────────────────────────────────
// SOCKET RATE LIMITER
// express-rate-limit only covers HTTP routes — socket events bypass it
// entirely, and every send_message / request_score is a Gemini call.
// This is a small in-memory sliding-window limiter for socket events.
//
// Keyed by USER id, not socket id, so opening several tabs doesn't
// multiply the allowance.
//
// In-memory is fine for a single server instance (the current Render
// setup). If the backend is ever scaled to multiple instances, each
// would keep its own counts — move this to Redis at that point.
// ─────────────────────────────────────────

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

export const createSocketRateLimiter = ({ windowMs, max }) => {
  // userId → timestamps (ms) of allowed events inside the window
  const hits = new Map()

  // Drop users with no recent events so the map can't grow forever
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - windowMs
    for (const [key, timestamps] of hits) {
      if (timestamps[timestamps.length - 1] <= cutoff) hits.delete(key)
    }
  }, CLEANUP_INTERVAL_MS)
  cleanup.unref() // don't keep the process alive just for this timer

  // Records the event if allowed. Returns:
  //   { allowed: true }
  //   { allowed: false, retryAfterSeconds } — when the oldest event in
  //   the window expires and a slot frees up
  return (userId) => {
    const key = String(userId)
    const now = Date.now()
    const recent = (hits.get(key) || []).filter((t) => t > now - windowMs)

    if (recent.length >= max) {
      hits.set(key, recent)
      const retryAfterMs = recent[0] + windowMs - now
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
    }

    recent.push(now)
    hits.set(key, recent)
    return { allowed: true }
  }
}

// ─────────────────────────────────────────
// LIMITERS USED BY sessionSocket.js
// ─────────────────────────────────────────

// A real teaching conversation is well under this — a message every
// 3 seconds for a full minute is already faster than anyone types
export const messageRateLimiter = createSocketRateLimiter({ windowMs: 60 * 1000, max: 20 })

// Stricter: scoring is the heaviest Gemini call, and the rescore rule
// already requires new messages between scores
export const scoreRateLimiter = createSocketRateLimiter({ windowMs: 60 * 1000, max: 5 })
