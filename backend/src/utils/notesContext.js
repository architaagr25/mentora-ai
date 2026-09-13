// backend/src/utils/notesContext.js
import { stripReservedTags } from './promptSafety.js'

// ─────────────────────────────────────────
// NOTES CONTEXT
// Until now, uploaded notes only ever reached the AI as a list of
// concept NAMES, and the scorer never saw them at all — so "testing
// from your notes" was really being judged against the model's own
// general knowledge. These helpers pass the actual note text through.
//
// Two sizes, because the two uses are different:
//  - scoring runs once per score, and accuracy needs enough material
//    to judge against, so it gets the larger excerpt
//  - the AI student runs on every single message, so it gets a smaller
//    one to keep each request light
//
// The text comes from a user-uploaded PDF, so it's untrusted: reserved
// tags are stripped, exactly like chat messages.
// ─────────────────────────────────────────

export const SCORING_NOTES_CHARS = 8000
export const STUDENT_NOTES_CHARS = 3000

export const buildNotesContext = (session, maxChars = SCORING_NOTES_CHARS) => {
  const concepts = session?.notes?.extractedConcepts?.length
    ? session.notes.extractedConcepts
    : null

  const rawText = session?.notes?.rawText
  const notesExcerpt = rawText
    ? stripReservedTags(rawText).trim().slice(0, maxChars) || null
    : null

  return { concepts, notesExcerpt }
}

// Wraps the excerpt for a prompt. Returns '' when there are no notes,
// so callers can drop it straight into a template.
export const formatNotesBlock = (notesExcerpt) =>
  notesExcerpt ? `<notes>\n${notesExcerpt}\n</notes>\n\n` : ''
