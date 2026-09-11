// ─────────────────────────────────────────
// XP CALCULATION
// A score's XP value: 0 below 70%, otherwise base 20 XP + 1 XP per
// percentage point above 70% (a perfect 100% is worth 50 XP).
// ─────────────────────────────────────────
export const XP_THRESHOLD_PERCENT = 70
const BASE_XP = 20

// scores = { accuracy, clarity, completeness } each 0-10
const scorePercentOf = (scores) =>
  Math.round(((scores.accuracy + scores.clarity + scores.completeness) / 3) * 10)

const xpValueOf = (scores) => {
  const avgPercent = scorePercentOf(scores)
  if (avgPercent < XP_THRESHOLD_PERCENT) return 0
  return BASE_XP + (avgPercent - XP_THRESHOLD_PERCENT) // 20 to 50
}

// XP awarded for a new score in a session = how much it beats the
// session's previous best. A session's total XP therefore always
// equals the XP value of its single best score (max 50), so
// rescoring the same explanation can never farm XP.
//
// Returns the amount plus the "why", so the client can explain it:
//   reason: 'first_qualifying' | 'improved' | 'below_threshold' | 'not_improved'
export const getXpBreakdown = (newScores, previousScores = []) => {
  const scorePercent = scorePercentOf(newScores)
  const xpValue = xpValueOf(newScores)

  const previousBestPercent = previousScores.length
    ? Math.max(...previousScores.map(scorePercentOf))
    : null
  const previousBestXp = Math.max(0, ...previousScores.map(xpValueOf))

  const xpEarned = Math.max(0, xpValue - previousBestXp)

  let reason
  if (xpEarned > 0) reason = previousBestXp === 0 ? 'first_qualifying' : 'improved'
  else if (previousBestXp > 0) reason = 'not_improved' // already earned; didn't beat best
  else reason = 'below_threshold' // nothing in this session has reached 70% yet

  return {
    xpEarned,
    reason,
    scorePercent,
    previousBestPercent,
    thresholdPercent: XP_THRESHOLD_PERCENT,
  }
}

// ─────────────────────────────────────────
// STREAK CALCULATION
// Call this whenever the user does qualifying
// activity (sending a message). Compares today's
// date to lastActiveDate and updates streak.
// ─────────────────────────────────────────
export const calculateStreakUpdate = (lastActiveDate, currentStreak) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!lastActiveDate) {
    // First ever activity
    return { streak: 1, lastActiveDate: today }
  }

  const last = new Date(lastActiveDate)
  last.setHours(0, 0, 0, 0)

  const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Already counted today — no change
    return { streak: currentStreak, lastActiveDate: last }
  }

  if (diffDays === 1) {
    // Consecutive day — increment streak
    return { streak: currentStreak + 1, lastActiveDate: today }
  }

  // Missed a day or more — reset streak to 1 (today counts)
  return { streak: 1, lastActiveDate: today }
}