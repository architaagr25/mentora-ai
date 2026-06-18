// ─────────────────────────────────────────
// XP CALCULATION
// Awards XP when a score crosses the 70% threshold.
// Base 20 XP + 1 XP per percentage point above 70%.
// A perfect 100% score gives 50 XP total.
// ─────────────────────────────────────────
export const calculateXpForScore = (scores) => {
  // scores = { accuracy, clarity, completeness } each 0-10
  const avgOutOf10 = (scores.accuracy + scores.clarity + scores.completeness) / 3
  const avgPercent = avgOutOf10 * 10 // convert to 0-100 scale

  if (avgPercent < 70) {
    return 0
  }

  const baseXp = 20
  const bonusXp = Math.round(avgPercent - 70) // 0 to 30
  return baseXp + bonusXp
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