// backend/src/services/badgeService.js
import { BADGES } from '../constants/badges.js'

// ─────────────────────────────────────────
// COMPUTE USER STATS
// Builds the stats object badges.js's criteria functions expect.
// Called fresh each time badges are checked, rather than maintaining
// running counters on the User model — some of these (bestAvgScore,
// hasPerfectScore) need a full scan of score history anyway, and this
// only runs at two points (after scoring, after streak update), so
// recomputing is cheap and avoids any risk of derived data drifting
// out of sync with the source sessions.
// ─────────────────────────────────────────
export const computeUserStats = (user, sessions) => {
  const completedSessions = sessions.filter((s) => s.status === 'completed').length

  let bestAvgScore = null
  let hasPerfectScore = false

  sessions.forEach((session) => {
    if (!session.scores) return
    session.scores.forEach((score) => {
      const avg = (score.accuracy + score.clarity + score.completeness) / 3
      const avgPercent = avg * 10 // convert 0-10 scale to 0-100

      if (bestAvgScore === null || avgPercent > bestAvgScore) {
        bestAvgScore = avgPercent
      }
      if (score.accuracy === 10 && score.clarity === 10 && score.completeness === 10) {
        hasPerfectScore = true
      }
    })
  })

  return {
    completedSessions,
    totalSessions: sessions.length,
    streak: user.streak,
    xp: user.xp,
    bestAvgScore,
    hasPerfectScore,
  }
}

// ─────────────────────────────────────────
// CHECK FOR NEW BADGES
// Returns only badges that are (a) satisfied by current stats and
// (b) not already stored on the user — i.e. genuinely newly earned
// by this check. Does NOT save anything to the DB itself; the caller
// decides when/how to persist (see the route/socket wiring in 1d).
// ─────────────────────────────────────────
export const checkForNewBadges = (user, sessions) => {
  const stats = computeUserStats(user, sessions)
  const alreadyEarned = new Set(user.badges || [])

  return BADGES.filter(
    (badge) => !alreadyEarned.has(badge.id) && badge.criteria(stats)
  )
}