// backend/src/services/gapService.js
import Gap from '../models/Gap.js'
import Session from '../models/Session.js'
import logger from '../utils/logger.js'

// Trimmed, lowercase, single spaces — "TCP  Handshake " and
// "tcp handshake" become the same key
export const normaliseKey = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

// Gap text also ignores a trailing full stop, which the scorer adds
// inconsistently
const gapTextKey = (text) => normaliseKey(text).replace(/[.!\s]+$/, '')

const cleanGapText = (text) =>
  String(text ?? '')
    .trim()
    .replace(/\s+/g, ' ')

// ─────────────────────────────────────────
// RECORD GAPS FOR A SCORE
// Called after every saved score — the socket and REST score paths
// both use this, so they can't drift apart.
//
// 1. Every gap in the new score is upserted as open. A gap the user
//    had resolved is reopened: the scorer found it again.
// 2. This session's other open gaps came from an earlier score of the
//    same session and are missing from the latest one — the user fixed
//    them, so they're resolved. Only the latest score of a session
//    counts; earlier attempts don't keep gaps alive.
//
// 3. In a practice session (focusGapId set), the focus gap is resolved
//    when the score averages PRACTICE_RESOLVE_AVERAGE or more and the
//    gap isn't among the new gaps — see resolvePractisedGap().
//
// score is the new score ({ accuracy, clarity, completeness }); it's
// only needed for step 3. Returns { recorded, resolved, focusGapResolved }.
// Never throws — a score is already saved by the time this runs, and a
// gap-tracking failure shouldn't turn it into a scoring error.
// ─────────────────────────────────────────
export const recordGapsForScore = async (
  session,
  gaps,
  { seenAt = new Date(), score = null } = {}
) => {
  try {
    const topicKey = normaliseKey(session.topic)

    // De-duplicate within this score
    const unique = new Map()
    for (const gap of Array.isArray(gaps) ? gaps : []) {
      const text = cleanGapText(gap)
      const textKey = gapTextKey(text)
      if (textKey && !unique.has(textKey)) unique.set(textKey, text)
    }

    if (unique.size > 0) {
      await Gap.bulkWrite(
        [...unique].map(([textKey, text]) => ({
          updateOne: {
            filter: { userId: session.userId, topicKey, textKey },
            update: {
              $set: {
                topic: cleanGapText(session.topic),
                text,
                status: 'open',
                sessionId: session._id,
                lastSeenAt: seenAt,
                resolvedAt: null,
                resolvedBy: null,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      )
    }

    // Everything just written has lastSeenAt === seenAt, so "older than
    // seenAt" is exactly this session's gaps the latest score dropped.
    // A practice session's focus gap is left out: once an earlier score
    // in this session reported it, it would otherwise be closed here
    // without the PRACTICE_RESOLVE_AVERAGE check in step 3.
    const { modifiedCount } = await Gap.updateMany(
      {
        userId: session.userId,
        sessionId: session._id,
        status: 'open',
        lastSeenAt: { $lt: seenAt },
        ...(session.focusGapId ? { _id: { $ne: session.focusGapId } } : {}),
      },
      { $set: { status: 'resolved', resolvedAt: seenAt, resolvedBy: 'rescore' } }
    )

    const focusGapResolved = await resolvePractisedGap(session, score, {
      topicKey,
      newGapKeys: unique,
      seenAt,
    })

    return { recorded: unique.size, resolved: modifiedCount, focusGapResolved }
  } catch (err) {
    logger.error(`Recording gaps for session ${session._id} failed: ${err.message}`)
    return { recorded: 0, resolved: 0, focusGapResolved: false }
  }
}

// A practice session must average at least this (out of 10) for its
// focus gap to count as fixed
export const PRACTICE_RESOLVE_AVERAGE = 8

const resolvePractisedGap = async (session, score, { topicKey, newGapKeys, seenAt }) => {
  if (!session.focusGapId || !score) return false

  const average = (score.accuracy + score.clarity + score.completeness) / 3
  if (!(average >= PRACTICE_RESOLVE_AVERAGE)) return false

  const gap = await Gap.findOne({
    _id: session.focusGapId,
    userId: session.userId,
    status: 'open',
  })
  if (!gap) return false

  // Reported again by this score — the upsert above kept it open
  if (gap.topicKey === topicKey && newGapKeys.has(gap.textKey)) return false

  gap.status = 'resolved'
  gap.resolvedAt = seenAt
  gap.resolvedBy = 'practice'
  await gap.save()
  logger.info(`Practice session ${session._id} resolved gap ${gap._id}`)
  return true
}

// ─────────────────────────────────────────
// BACKFILL
// Scores saved before the Gap collection existed have gaps only inside
// session.scores. The first time a user with no Gap documents opens the
// Concepts page, their sessions' latest scores are merged in memory —
// oldest first, so the newest session's wording and casing win — and
// written in ONE bulkWrite. (Replaying scores one by one cost two
// database round trips per session, which made the first visit slow.)
// ─────────────────────────────────────────
export const backfillGapsForUser = async (userId) => {
  if (await Gap.exists({ userId })) return

  const sessions = await Session.find({ userId, 'scores.0': { $exists: true } })
    .select('topic scores')
    .lean()

  const latestScores = sessions
    .map((session) => ({ session, score: session.scores[session.scores.length - 1] }))
    .sort((a, b) => new Date(a.score.scoredAt) - new Date(b.score.scoredAt))

  // Only latest scores are used, so every backfilled gap is open
  const merged = new Map()
  for (const { session, score } of latestScores) {
    const topicKey = normaliseKey(session.topic)
    for (const gap of Array.isArray(score.gaps) ? score.gaps : []) {
      const text = cleanGapText(gap)
      const textKey = gapTextKey(text)
      if (!textKey) continue
      merged.set(`${topicKey}\n${textKey}`, {
        topicKey,
        textKey,
        topic: cleanGapText(session.topic),
        text,
        sessionId: session._id,
        lastSeenAt: new Date(score.scoredAt),
      })
    }
  }

  if (merged.size === 0) return

  try {
    await Gap.bulkWrite(
      [...merged.values()].map(({ topicKey, textKey, ...fields }) => ({
        updateOne: {
          filter: { userId, topicKey, textKey },
          update: { $setOnInsert: { ...fields, status: 'open', resolvedAt: null, resolvedBy: null } },
          upsert: true,
        },
      })),
      { ordered: false }
    )
    logger.info(`Backfilled ${merged.size} gap(s) for user ${userId} from ${latestScores.length} session(s)`)
  } catch (err) {
    // Two tabs backfilling at once can collide on the unique index —
    // the other request wrote the same gaps, so this is safe to ignore
    if (err.code !== 11000) logger.error(`Gap backfill for user ${userId} failed: ${err.message}`)
  }
}
