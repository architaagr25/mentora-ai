import express from 'express'
import Session from '../models/Session.js'
import auth from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  createSessionSchema,
  sendMessageSchema,
} from '../validators/sessionValidator.js'
import { getAIStudentResponse, getAIStudentResponseStream, transcribeAudio } from '../services/aiService.js'
import { scoreSession } from '../services/scoringService.js'

const router = express.Router()

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
    const { status } = req.query

    const query = { userId: req.user._id }
    if (status === 'active' || status === 'completed') {
      query.status = status
    }

    const sessions = await Session.find(query)
      .sort({ updatedAt: -1 })
      .select('-messages')
      .limit(100)

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
// User sends a message → AI student responds
// Both messages saved to DB
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
      throw new AppError(
        'This session has ended. Start a new session to continue learning this topic.',
        400
      )
    }

    // Step 1 — Save the user message
    session.messages.push({ role: 'user', content })
    await session.save()

    // Step 2 — Get AI student response
    // Pass full message history so Claude has context
    const aiResult = await getAIStudentResponse(
      session.topic,
      session.messages
    )

    if (!aiResult.success) {
      // AI call failed — still return the user message
      // so it's not lost, but flag the AI error
      return res.status(200).json({
        status: 'partial',
        userMessage: session.messages[session.messages.length - 1],
        aiError: 'AI student is unavailable right now. Please try again.',
      })
    }

    // Step 3 — Save the AI response
    session.messages.push({
      role: 'assistant',
      content: aiResult.content,
    })
    await session.save()

    // Step 4 — Return both messages
    const messages = session.messages
    const userMessage = messages[messages.length - 2]
    const aiMessage = messages[messages.length - 1]

    res.status(201).json({
      status: 'success',
      userMessage,
      aiMessage,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/sessions/:id/score
// Request a real score for the current session
// Session stays active after scoring
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

    const userMessages = session.messages.filter(
      (msg) => msg.role === 'user'
    )

    if (userMessages.length === 0) {
      throw new AppError('No messages to score yet', 400)
    }

    // Call scoring service
    const scoringResult = await scoreSession(
      session.topic,
      session.messages
    )

    if (!scoringResult.success) {
      throw new AppError('Scoring failed. Please try again.', 500)
    }

    // Save score snapshot to session
    session.scores.push(scoringResult.scores)
    await session.save()

    res.status(200).json({
      status: 'success',
      score: scoringResult.scores,
      totalScores: session.scores.length,
      // Send all scores so frontend can show progression
      allScores: session.scores,
    })
  } catch (err) {
    next(err)
  }
})

// ─────────────────────────────────────────
// POST /api/sessions/:id/end
// End a session — marks it completed and locks it
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
// ─────────────────────────────────────────
// POST /api/sessions/transcribe
// Accepts base64 audio, returns transcript
// Used by voice mode on the frontend
// ─────────────────────────────────────────
router.post('/transcribe', async (req, res, next) => {
  try {
    const { audioBase64, mimeType } = req.body

    if (!audioBase64) {
      throw new AppError('No audio data provided', 400)
    }

    if (!mimeType) {
      throw new AppError('No mimeType provided', 400)
    }

    // Validate mimeType is audio
    if (!mimeType.startsWith('audio/')) {
      throw new AppError('Invalid mimeType — must be audio/*', 400)
    }

    const result = await transcribeAudio(audioBase64, mimeType)

    if (!result.success) {
      throw new AppError('Transcription failed. Please try again.', 500)
    }

    res.status(200).json({
      status: 'success',
      transcript: result.transcript,
    })
  } catch (err) {
    next(err)
  }
})
export default router