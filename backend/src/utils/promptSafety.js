// backend/src/utils/promptSafety.js

// ─────────────────────────────────────────
// PROMPT SAFETY HELPERS
// User-written text is placed inside XML-style tags when it's sent to
// the model, so the model can tell "content to evaluate" apart from
// "instructions". That only works if the user can't write those tags
// themselves — otherwise a message could close the transcript early
// and append fake instructions or fake turns after it.
// ─────────────────────────────────────────

// Matches opening/closing <transcript> and <message> tags, tolerant of
// case, whitespace and attributes: <transcript>, </ Transcript >,
// <message role="student">, <MESSAGE/>, etc.
const RESERVED_TAG_PATTERN = /<\s*\/?\s*(transcript|message)\b[^>]*>/gi

export const stripReservedTags = (text) => String(text ?? '').replace(RESERVED_TAG_PATTERN, '')
