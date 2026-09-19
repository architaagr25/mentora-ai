// backend/src/services/sessionService.js
import Session from '../models/Session.js'
import User from '../models/User.js'
import logger from '../utils/logger.js'
import { scoreSession } from './scoringService.js'
import { ensureKeyPoints } from './keyPointsService.js'
import { recordGapsForScore } from './gapService.js'
import { checkForNewBadges } from './badgeService.js'
import { buildNotesContext } from '../utils/notesContext.js'
import { getXpBreakdown } from '../utils/gamification.js'
import { MIN_USER_MESSAGES_TO_SCORE } from '../constants/scoring.js'

// ─────────────────────────────────────────
// SESSION SERVICE
// Scoring a session and ending one both mean the same several things:
// call the AI, save a snapshot, award XP, update the gap list, check
// badges. That whole sequence used to be written out twice — once in
// the socket handler and once in the REST route — which is how they
// drifted apart before (the REST end route never cleared notes.rawText).
// Both paths now call these two functions and only differ in how they
// report the result to the client.
// ─────────────────────────────────────────

// Why a score couldn't be produced. Callers map these to their own
// error shape (a thrown AppError over REST, a 'score_error' event over
// the socket), so the wording stays where the user-facing text lives.
export const SCORE_BLOCKED = {
  TOO_FEW_MESSAGES: 'too_few_messages',
  NO_NEW_MESSAGES: 'no_new_messages',
  AI_FAILED: 'ai_failed',
}

// Newly-earned badges, saved and also folded into the in-memory user.
// That last part matters for the socket: socket.user lives for the
// whole connection, so without it the same badge would be re-awarded
// on every score in that session.
export const awardNewBadges = async (user) => {
  const allSessions = await Session.find({ userId: user._id }).select('-messages')
  const earned = checkForNewBadges(user, allSessions)
  if (earned.length === 0) return []

  await User.findByIdAndUpdate(user._id, {
    $addToSet: { badges: { $each: earned.map((b) => b.id) } },
  })
  user.badges = [...(user.badges || []), ...earned.map((b) => b.id)]

  return earned.map((b) => ({ id: b.id, name: b.name, description: b.description }))
}

// Adds XP to the user and keeps the in-memory copy in step
const awardXp = async (user, xpEarned) => {
  if (xpEarned <= 0) return user.xp
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $inc: { xp: xpEarned } },
    { new: true }
  )
  user.xp = updated.xp
  return updated.xp
}

// Whether this session can be scored at all. Separate from the scoring
// itself so a caller can check before putting a loading state on screen.
export const checkCanScore = (session) => {
  const userMessages = session.messages.filter((msg) => msg.role === 'user')

  if (userMessages.length < MIN_USER_MESSAGES_TO_SCORE) {
    return { ok: false, reason: SCORE_BLOCKED.TOO_FEW_MESSAGES }
  }
  if (!session.hasNewMessagesSinceLastScore()) {
    return { ok: false, reason: SCORE_BLOCKED.NO_NEW_MESSAGES }
  }
  return { ok: true }
}

// ─────────────────────────────────────────
// SCORE A SESSION AND AWARD WHAT IT EARNED
// Returns { ok: false, reason } when it can't be scored, otherwise the
// saved snapshot plus everything the client needs to react.
// ─────────────────────────────────────────
export const scoreSessionAndAward = async (session, user) => {
  const gate = checkCanScore(session)
  if (!gate.ok) return gate

  const userMessages = session.messages.filter((msg) => msg.role === 'user')

  // Scoring gets the larger notes excerpt — accuracy is judged against
  // the student's own notes where they cover a point. Key points are the
  // fixed completeness yardstick, generated once and reused.
  const notesContext = buildNotesContext(session)
  const keyPoints = await ensureKeyPoints(session, notesContext)
  const result = await scoreSession(session.topic, session.messages, {
    ...notesContext,
    keyPoints,
  })

  if (!result.success) {
    return {
      ok: false,
      reason: SCORE_BLOCKED.AI_FAILED,
      quotaExceeded: Boolean(result.quotaExceeded),
    }
  }

  // Only XP above this session's previous best is awarded — the
  // breakdown also carries the "why" for the client toast
  const xp = getXpBreakdown(result.scores, session.scores)

  session.scores.push({ ...result.scores, messageCountAtScore: userMessages.length })
  await session.save()

  // Keeps the Concepts page's open/resolved gaps in step with this
  // score — awaited so the page is current if opened straight away
  const gapResult = await recordGapsForScore(session, result.scores.gaps, {
    score: result.scores,
  })

  const totalXp = await awardXp(user, xp.xpEarned)
  const newBadges = await awardNewBadges(user)

  return {
    ok: true,
    score: session.scores[session.scores.length - 1],
    allScores: session.scores,
    totalScores: session.scores.length,
    xp: { ...xp, totalXp },
    focusGapResolved: gapResult.focusGapResolved,
    newBadges,
  }
}

// ─────────────────────────────────────────
// FINISH A SESSION
// Ending used to just flip the status, so anything explained after the
// last "Get Score" was never judged — and a session ended without ever
// scoring showed nothing at all. Now the last stretch of teaching is
// scored first, and the wrap-up the client shows is built from it.
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

// Scores the unscored messages. Returns { scored, xp } — scored is
// false when there was nothing new to score or the AI call failed,
// which must never block the session from ending. Mutates `session`
// (the caller saves it).
const scoreBeforeEnding = async (session, user) => {
  if (!needsFinalScore(session)) return { scored: false, xp: null }

  try {
    const result = await scoreSessionAndAward(session, user)
    if (!result.ok) {
      logger.warn(`Final score for session ${session._id} skipped: ${result.reason}`)
      return { scored: false, xp: null }
    }
    return { scored: true, xp: result.xp, newBadges: result.newBadges }
  } catch (err) {
    // Ending the session matters more than scoring it
    logger.error(`Final score for session ${session._id} errored: ${err.message}`)
    return { scored: false, xp: null }
  }
}

// Scores what's left, marks the session completed and returns the
// wrap-up the client shows. Throws only on a database failure.
export const endSessionAndAward = async (session, user) => {
  const { scored, xp, newBadges: scoreBadges } = await scoreBeforeEnding(session, user)

  session.duration = Math.floor((Date.now() - session.createdAt.getTime()) / 1000)
  session.status = 'completed'
  // Raw notes text is only needed while teaching — concepts stay
  if (session.notes) session.notes.rawText = null

  await session.save()

  // Completing a session can unlock session-count badges (e.g. "First
  // Steps" at one completed session), so this runs after the save
  const newBadges = [...(scoreBadges ?? []), ...(await awardNewBadges(user))]

  const finalScore = session.scores.length
    ? session.scores[session.scores.length - 1]
    : null

  logger.info(
    `Session ${session._id} completed (${session.duration}s, ${scored ? 'auto-scored' : 'no new score'})`
  )

  return {
    summary: {
      sessionId: String(session._id),
      duration: session.duration,
      // The session is completed now, so the key points are no longer
      // hidden — this is where they're finally revealed
      finalScore,
      keyPoints: session.keyPoints ?? [],
      autoScored: scored,
      xp,
    },
    newBadges,
  }
}
