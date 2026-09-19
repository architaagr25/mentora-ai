import { z } from 'zod'

// ─────────────────────────────────────────
// CREATE SESSION
// User picks a topic and optionally a mode
// ─────────────────────────────────────────
export const createSessionSchema = z.object({
  topic: z
    .string({ required_error: 'Topic is required' })
    .min(2, 'Topic must be at least 2 characters')
    .max(200, 'Topic cannot exceed 200 characters')
    .trim(),
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