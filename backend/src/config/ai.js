// backend/src/config/ai.js

// ─────────────────────────────────────────
// GEMINI MODEL
// One place for the model name, overridable with GEMINI_MODEL in .env.
// Free-tier request quotas are counted PER MODEL, so switching model
// gives a fresh daily allowance — handy while developing.
//
// A function, not a constant: modules are evaluated before app.js runs
// dotenv.config(), so reading process.env at import time would see
// nothing. Called per request instead, which also means changing the
// model only needs a server restart, not a code change.
// ─────────────────────────────────────────
// Must support audio input — voice mode transcribes through the same
// model. Verified against the API before being chosen here.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

export const getGeminiModel = () => process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL

// Shown to the user when Gemini's quota is exhausted (HTTP 429).
// Deliberately doesn't invite an immediate retry: the free tier's
// limit is per DAY, so retrying now would fail the same way.
export const AI_LIMIT_MESSAGE =
  'The AI has reached its usage limit for now. Please try again later.'
