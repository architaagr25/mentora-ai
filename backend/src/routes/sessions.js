import express from 'express'
import Session from '../models/Session.js'
import auth from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  createSessionSchema,
  sendMessageSchema,
} from '../validators/sessionValidator.js'

const router = express.Router()

// All session routes require authentication
router.use(auth)

// ─────────────────────────────────────────
// POST /api/sessions
// Create a new session
// ─────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const result = createSessionSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { topic, mode } = result.data

    const session = await Session.create({
      userId: req.user._id,
      topic,
      mode,
    })

    res.status(201).json({
      status: 'success',
      session,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// GET /api/sessions
// Get all sessions for the logged in user
// ─────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      // Sort by updatedAt not createdAt
      // So recently continued sessions appear first
      .select('-messages')
      .limit(50)

    res.status(200).json({
      status: 'success',
      count: sessions.length,
      sessions,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// GET /api/sessions/:id
// Get a single session with full messages
// ─────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)

    if (!session) {
      throw new AppError('Session not found', 404)
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorised to access this session', 403)
    }

    res.status(200).json({
      status: 'success',
      session,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/sessions/:id/message
// Add a message to a session
// Only active sessions can receive messages
// ─────────────────────────────────────────
router.post('/:id/message', async (req, res, next) => {
  try {
    const result = sendMessageSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { content } = result.data

    const session = await Session.findById(req.params.id)

    if (!session) {
      throw new AppError('Session not found', 404)
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorised to access this session', 403)
    }

    if (session.status !== 'active') {
      throw new AppError('This session has ended. Start a new session to continue learning this topic.', 400)
    }

    session.messages.push({ role: 'user', content })
    await session.save()

    const newMessage = session.messages[session.messages.length - 1]

    res.status(201).json({
      status: 'success',
      message: newMessage,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/sessions/:id/score
// Request a score snapshot for the current session
// Session stays active — user can keep chatting
// Multiple scores can be requested over time
// ─────────────────────────────────────────
router.post('/:id/score', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)

    if (!session) {
      throw new AppError('Session not found', 404)
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorised to access this session', 403)
    }

    if (session.status !== 'active') {
      throw new AppError('Cannot score a completed session', 400)
    }

    if (session.messages.length === 0) {
      throw new AppError('No messages to score yet', 400)
    }

    // Scoring logic will be added in Phase 4B
    // when we integrate Claude Haiku
    // For now return a placeholder
    const scoreSnapshot = {
      accuracy: null,
      clarity: null,
      completeness: null,
      gaps: [],
      feedback: 'Scoring will be available in Phase 4B',
      scoredAt: new Date(),
    }

    session.scores.push(scoreSnapshot)
    await session.save()

    res.status(200).json({
      status: 'success',
      score: scoreSnapshot,
      totalScores: session.scores.length,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/sessions/:id/end
// End a session — marks it completed and locks it
// User explicitly chose to end this session
// ─────────────────────────────────────────
router.post('/:id/end', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)

    if (!session) {
      throw new AppError('Session not found', 404)
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorised to access this session', 403)
    }

    if (session.status !== 'active') {
      throw new AppError('This session has already ended', 400)
    }

    // Calculate duration
    const durationMs = Date.now() - session.createdAt.getTime()
    session.duration = Math.floor(durationMs / 1000)
    session.status = 'completed'

    await session.save()

    res.status(200).json({
      status: 'success',
      session,
    })
  } catch (err) {
    next(err)
  }
})

export default router