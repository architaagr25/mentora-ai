// backend/src/routes/badges.js
import express from 'express'
import { BADGES } from '../constants/badges.js'

const router = express.Router()

// ─────────────────────────────────────────
// GET /api/badges
// Returns the full list of possible badges (id, name, description).
// No auth required — this is static reference data describing what
// badges exist, not anything about a specific user. Which of these
// a user has actually earned comes from `user.badges` (already
// returned by /auth/me and /users/me), not from this endpoint.
//
// `criteria` is deliberately stripped — it's a function (not
// serializable as JSON anyway) and there's no reason to expose the
// exact unlock logic to the client.
// ─────────────────────────────────────────
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    badges: BADGES.map(({ id, name, description }) => ({ id, name, description })),
  })
})

export default router