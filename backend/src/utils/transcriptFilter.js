// backend/src/utils/transcriptFilter.js

// ─────────────────────────────────────────
// TRANSCRIPT FILTER
// Decides whether Gemini's transcription output is real speech, or
// the model saying "there was nothing to transcribe" in some form.
//
// Deliberately narrow: an earlier version matched words like "sorry",
// "there is no", "blank" or "silence" anywhere in the text, which
// silently threw away real explanations ("Sorry, I meant the second
// step…", "There is no upper limit…"). Every check here looks at the
// *whole* transcript or its *start*, never at a word in the middle.
// ─────────────────────────────────────────

// The sentinel the transcription prompt asks for, alone — tolerating
// case, a space instead of the underscore, missing brackets, and stray
// punctuation around it: "[NO_SPEECH]", "no speech.", "[No Speech]"
const SENTINEL_ONLY = /^\W*\[?\s*no[_ ]speech\s*\]?\W*$/i

// A bare timestamp like "00:03" or "[0:00:12]" — the model sometimes
// returns one for a silent clip
const TIMESTAMP_ONLY = /^\[?\d{1,2}:\d{2}(:\d{2})?\]?$/

// The model refusing or reporting no audio, rather than transcribing.
// Only checked against the START of a short transcript, and each
// pattern needs audio/transcription wording — so a speaker who opens
// with "Sorry," or "There is no…" in a real explanation is kept.
const REFUSAL_MAX_LENGTH = 200
const CANNOT = "(?:can'?t|cannot|can not|couldn'?t|could not|am unable to|was unable to)"
const REFUSAL_AT_START = [
  /^as an ai\b/i,
  new RegExp(
    `^(i'?m sorry|sorry|unfortunately)[,.]?\\s+(but\\s+)?i\\s+${CANNOT}\\s+(transcribe|hear|make out|detect|process)\\b`,
    'i'
  ),
  new RegExp(
    `^i\\s+${CANNOT}\\s+(transcribe|process)\\s+(this|the|that|your)?\\s*(audio|recording|clip|file)\\b`,
    'i'
  ),
  /^(the\s+)?(audio|recording|clip)\s+(is|was|seems|appears)\s+(to be\s+)?(silent|empty|blank|inaudible|unclear)\b/i,
  /^there\s+(is|was|'s)\s+no\s+(discernible\s+|audible\s+|clear\s+)?(speech|audio|voice)\b/i,
  /^no\s+(discernible\s+|audible\s+)?speech\s+(was\s+)?(detected|found)\b/i,
]

// Fewer than this many letters/digits can't be a real answer.
// 2 (not 3) so short real replies like "No" / "OK" survive.
const MIN_ALPHANUMERIC_CHARS = 2

// Returns { transcript } for real speech, or { transcript: '', reason }
// when rejected. reason: 'no_speech' | 'too_short'
export const filterTranscript = (raw) => {
  const transcript = String(raw ?? '').trim()

  if (transcript.length === 0) return { transcript: '', reason: 'no_speech' }
  if (SENTINEL_ONLY.test(transcript)) return { transcript: '', reason: 'no_speech' }
  if (TIMESTAMP_ONLY.test(transcript)) return { transcript: '', reason: 'no_speech' }

  if (
    transcript.length <= REFUSAL_MAX_LENGTH &&
    REFUSAL_AT_START.some((pattern) => pattern.test(transcript))
  ) {
    return { transcript: '', reason: 'no_speech' }
  }

  const alphanumericCount = transcript.replace(/[^a-zA-Z0-9]/g, '').length
  if (alphanumericCount === 0) return { transcript: '', reason: 'no_speech' } // e.g. "..."
  if (alphanumericCount < MIN_ALPHANUMERIC_CHARS) return { transcript: '', reason: 'too_short' }

  return { transcript }
}
