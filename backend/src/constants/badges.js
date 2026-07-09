// backend/src/constants/badges.js

// ─────────────────────────────────────────
// BADGE DEFINITIONS
// Each badge's `criteria` is a pure function of a `stats` object —
// it doesn't know or care *when* it's being checked (after scoring,
// after a streak update, etc). This keeps badge logic centralized
// here instead of scattered across routes/socket handlers.
//
// `stats` shape (computed by badgeService.js):
// {
//   completedSessions: number,
//   totalSessions: number,
//   streak: number,
//   xp: number,
//   bestAvgScore: number | null,   // 0-100, best average score across all scored sessions
//   hasPerfectScore: boolean,      // any single score attempt with 10/10/10
// }
// ─────────────────────────────────────────

export const BADGES = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first session',
    criteria: (stats) => stats.completedSessions >= 1,
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Complete 5 sessions',
    criteria: (stats) => stats.completedSessions >= 5,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 25 sessions',
    criteria: (stats) => stats.completedSessions >= 25,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Reach a 7-day streak',
    criteria: (stats) => stats.streak >= 7,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Reach a 30-day streak',
    criteria: (stats) => stats.streak >= 30,
  },
  {
    id: 'sharp_mind',
    name: 'Sharp Mind',
    description: 'Score 90% or higher average on any session',
    criteria: (stats) => stats.bestAvgScore !== null && stats.bestAvgScore >= 90,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Score a perfect 10/10/10 on any session',
    criteria: (stats) => stats.hasPerfectScore === true,
  },
  {
    id: 'rising_star',
    name: 'Rising Star',
    description: 'Reach 100 total XP',
    criteria: (stats) => stats.xp >= 100,
  },
  {
    id: 'xp_machine',
    name: 'XP Machine',
    description: 'Reach 500 total XP',
    criteria: (stats) => stats.xp >= 500,
  },
]

// Quick lookup by id — used when rendering a user's earned badges,
// so we only ever store badge IDs on the User model, not full
// badge objects (avoids duplicating name/description in the DB).
export const BADGES_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]))