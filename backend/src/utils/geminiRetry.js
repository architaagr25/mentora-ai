// backend/src/utils/geminiRetry.js
import logger from './logger.js'

// ─────────────────────────────────────────
// RETRY A GEMINI CALL ON TRANSIENT OVERLOAD
// Gemini returns 503 / UNAVAILABLE ("model is overloaded") under load.
// That usually clears within a second or two, so it's worth retrying.
//
// Deliberately does NOT retry:
//  - 429 (quota exhausted) — a short wait won't help, and retrying
//    burns more of the daily allowance
//  - 4xx request errors — the same request would fail the same way
// ─────────────────────────────────────────

const DEFAULT_DELAYS_MS = [1500, 3000] // one retry after 1.5s, another after 3s

const isOverloaded = (err) =>
  err?.code === 503 ||
  err?.status === 503 ||
  Boolean(err?.message?.includes('503')) ||
  Boolean(err?.message?.includes('UNAVAILABLE')) ||
  Boolean(err?.message?.toLowerCase?.().includes('overloaded'))

// Quota/rate-limit errors — exported so callers can tell users
// "the AI has hit its limit" instead of a generic failure
export const isQuotaExceeded = (err) =>
  err?.code === 429 ||
  err?.status === 429 ||
  Boolean(err?.message?.includes('429')) ||
  Boolean(err?.message?.includes('RESOURCE_EXHAUSTED'))

export const withGeminiRetry = async (fn, { delaysMs = DEFAULT_DELAYS_MS, label = 'Gemini' } = {}) => {
  let attempt = 0

  for (;;) {
    try {
      return await fn()
    } catch (err) {
      if (!isOverloaded(err) || attempt >= delaysMs.length) throw err

      const delay = delaysMs[attempt]
      attempt += 1
      logger.info(
        `${label} overloaded (503) — retry ${attempt}/${delaysMs.length} in ${delay}ms`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
