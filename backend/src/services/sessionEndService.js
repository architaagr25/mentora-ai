// backend/src/services/sessionEndService.js
import User from '../models/User.js'
import logger from '../utils/logger.js'
import { scoreSession } from './scoringService.js'
import { ensureKeyPoints } from './keyPointsService.js'
import { recordGapsForScore } from './gapService.js'
import { buildNotesContext } from '../utils/notesContext.js'
import { getXpBreakdown } from '../utils/gamification.js'
import { MIN_USER_MESSAGES_TO_SCORE } from '../constants/scoring.js'

// ─────────────────────────────────────────
// FINISH A SESSION
// Ending used to just flip the status, so anything explained after the
// last "Get Score" was never judged — and a session ended without ever
// scoring showed nothing at all. Now the last stretch of teaching is
// scored first, and the wrap-up the client shows is built from it.
//
// Shared by the socket handler and POST /api/sessions/:id/end so the
// two can't drift apart.
// ─────────────────────────────────────────

// True when the user has said enough, and said something new, since the
// last score
export const needsFinalScore = (session) => {
  const userMessages = session.messages.filter((m) => m.role === 'user')
  return (
    userMessages.length >= MIN_USER_MESSAGES_TO_SCORE &&
    session.hasNewMessagesSinceLastScore()
  )
}

// Scores the unscored messages and saves the snapshot. Returns
// { scored, xp } — scored is false when there was nothing new to score
// or the AI call failed, which must never block the session from
// ending. Mutates `session` (caller saves it).
const scoreBeforeEnding = async (session, user) => {
  if (!needsFinalScore(session)) return { scored: false, xp: null }

  try {
    const notesContext = buildNotesContext(session)
    const keyPoints = await ensureKeyPoints(session, notesContext)
    const result = await scoreSession(session.topic, session.messages, {
      ...notesContext,
      keyPoints,
    })

    if (!result.success) {
      logger.warn(`Final score for session ${session._id} failed: ${result.error}`)
      return { scored: false, xp: null }
    }

    const userMessageCount = session.messages.filter((m) => m.role === 'user').length
    const xp = getXpBreakdown(result.scores, session.scores)

    session.scores.push({ ...result.scores, messageCountAtScore: userMessageCount })

    if (xp.xpEarned > 0) {
      const updated = await User.findByIdAndUpdate(
        user._id,
        { $inc: { xp: xp.xpEarned } },
        { new: true }
      )
      user.xp = updated.xp
    }

    await recordGapsForScore(session, result.scores.gaps, { score: result.scores })

    return { scored: true, xp: { ...xp, totalXp: user.xp } }
  } catch (err) {
    // Ending the session matters more than scoring it
    logger.error(`Final score for session ${session._id} errored: ${err.message}`)
    return { scored: false, xp: null }
  }
}

// Scores what's left, marks the session completed and returns the
// wrap-up the client shows. Throws only on a database failure.
export const finalizeSession = async (session, user) => {
  const { scored, xp } = await scoreBeforeEnding(session, user)

  session.duration = Math.floor((Date.now() - session.createdAt.getTime()) / 1000)
  session.status = 'completed'
  // Raw notes text is only needed while teaching — concepts stay
  if (session.notes) session.notes.rawText = null

  await session.save()

  const finalScore = session.scores.length
    ? session.scores[session.scores.length - 1]
    : null

  logger.info(
    `Session ${session._id} completed (${session.duration}s, ${scored ? 'auto-scored' : 'no new score'})`
  )

  return {
    sessionId: String(session._id),
    duration: session.duration,
    // Which of the key points the final score covered — the session is
    // completed now, so the key points themselves are no longer hidden
    finalScore,
    keyPoints: session.keyPoints ?? [],
    autoScored: scored,
    xp,
  }
}

export default finalizeSession
