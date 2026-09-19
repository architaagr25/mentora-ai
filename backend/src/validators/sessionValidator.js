import { z } from 'zod'

// ─────────────────────────────────────────
// TOPIC
// The topic ends up inside every prompt (the student's, the scorer's,
// key points, notes extraction), so it is cleaned before anything else:
// control characters and line breaks collapse to single spaces, since a
// multi-line topic could otherwise read as prose — or as instructions —
// in the prompt. It must also contain a real letter: "1234" and "!!!"
// are not topics. Keep the cap in line with TOPIC_MAX_CHARS in
// utils/promptSafety.js.
// ─────────────────────────────────────────
const topicRule = z
  .string({ required_error: 'Topic is required' })
  .transform((value) =>
    value
      // eslint-disable-next-line no-control-regex -- stripping them is the point
      .replace(/[\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
  .pipe(
    z
      .string()
      .min(2, 'Topic must be at least 2 characters')
      .max(120, 'Topic cannot exceed 120 characters')
      .regex(/\p{L}/u, 'Topic must contain a word')
  )

// ─────────────────────────────────────────
// CREATE SESSION
// User picks a topic and optionally a mode
// ─────────────────────────────────────────
export const createSessionSchema = z
  .object({
    // Optional only when focusGapId is given: a practice session always
    // takes its topic from the gap, so the client doesn't have to send
    // one back (and an older, longer topic can't fail this rule).
    topic: topicRule.optional(),
    mode: z
      .enum(['text', 'voice'])
      .default('text'),
      // If mode is not provided it defaults to 'text'
      // .default() in Zod means the field is optional
      // and falls back to this value if missing
    // Who the AI student should act like — changes its vocabulary and
    // question style only
    audience: z.enum(['child', 'peer', 'interviewer']).default('peer'),
    // Optional — starts a practice session focused on one open gap.
    // The session's topic is then taken from the gap.
    focusGapId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'Invalid gap id')
      .optional(),
  })
  .refine((data) => Boolean(data.topic || data.focusGapId), {
    message: 'Topic is required',
    path: ['topic'],
  })

// ─────────────────────────────────────────
// SEND MESSAGE
// User sends a message during the session
// ─────────────────────────────────────────
export const sendMessageSchema = z.object({
  content: z
    .string({ required_error: 'Message content is required' })
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters')
    .trim(),
})
