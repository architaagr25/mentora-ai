import express from 'express'
import Session from '../models/Session.js'
import auth from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'
import { createSessionSchema } from '../validators/sessionValidator.js'
import { transcribeAudio } from '../services/aiService.js'
import { MIN_USER_MESSAGES_TO_SCORE } from '../constants/scoring.js'
import { transcribeLimiter } from '../middleware/rateLimiter.js'
import { AI_LIMIT_MESSAGE } from '../config/ai.js'
import { normaliseKey } from '../services/gapService.js'
import Gap from '../models/Gap.js'
import {
  scoreSessionAndAward,
  endSessionAndAward,
  SCORE_BLOCKED,
} from '../services/sessionService.js'
import multer from 'multer'
import { extractTextFromPdf, extractConceptsFromText } from '../services/notesService.js'

const router = express.Router()

router.use(auth)

// PDF upload middleware
// memoryStorage keeps the file in RAM as req.file.buffer
// We never write to disk
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new AppError('Only PDF files are allowed', 400))
    }
  },
})
 
// ─────────────────────────────────────────
// POST /api/sessions/:id/notes
// Upload PDF notes for a session.
// Must be called before the first message is sent.
// ─────────────────────────────────────────
router.post('/:id/notes', uploadPdf.single('pdf'), async (req, res, next) => {
  try {
    // uploadPdf.single('pdf') means we expect one file
    // uploaded under the field name 'pdf'
    if (!req.file) {
      throw new AppError('No PDF file provided', 400)
    }
 
    const session = await Session.findById(req.params.id)
    if (!session) throw new AppError('Session not found', 404)
 
    // Make sure this session belongs to the logged-in user
    if (session.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorised', 403)
    }
 
    if (session.status !== 'active') {
      throw new AppError('Session has ended', 400)
    }
 
    // Notes must be uploaded before the conversation starts.
    // Once messages exist the AI persona is already set —
    // changing the concept scope mid-conversation would be confusing.
    if (session.messages.length > 0) {
      throw new AppError(
        'Notes must be uploaded before the conversation starts',
        400
      )
    }
 
    // Step 1: Extract text from the PDF buffer
    const textResult = await extractTextFromPdf(req.file.buffer)
    if (!textResult.success) {
      throw new AppError(textResult.error, 422)
      // 422 Unprocessable Entity — the request was valid but
      // the content couldn't be processed (bad PDF, scanned, etc.)
    }
 
    // Step 2: Extract concepts from the text using Gemini
    const conceptsResult = await extractConceptsFromText(
      session.topic,
      textResult.text
    )
    if (!conceptsResult.success) {
      throw new AppError(conceptsResult.error, conceptsResult.quotaExceeded ? 429 : 422)
    }
 
    // Step 3: Save everything to the session
    session.notes = {
      extractedConcepts: conceptsResult.concepts,
      rawText: textResult.text,
      fileName: req.file.originalname,
      uploadedAt: new Date(),
    }
    await session.save()
 
    // Return notes metadata to the frontend.
    // We deliberately exclude rawText — no need to send
    // potentially large text back over the wire.
    res.status(200).json({
      status: 'success',
      notes: {
        extractedConcepts: conceptsResult.concepts,
        fileName: req.file.originalname,
        uploadedAt: session.notes.uploadedAt,
        pageCount: textResult.pageCount,
      },
    })
  } catch (err) {
    next(err)
  }
})
 
// ─────────────────────────────────────────
// POST /api/sessions
// Create a new session
// ─────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    // Everything else stays readable while unverified — the dashboard,
    // history, past sessions. Only starting a new one is held back,
    // which is also what keeps the AI quota out of reach of signups
    // on addresses nobody owns.
    if (!req.user.emailVerified) {
      throw new AppError(
        'Confirm your email before starting a session. Check your inbox for the link.',
        403
      )
    }

    const result = createSessionSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        errors: result.error.flatten().fieldErrors,
      })
    }

    const { mode, audience, focusGapId } = result.data
    let { topic } = result.data

    // Practice session for one gap — it must be this user's gap, and
    // the session is always on the gap's own topic
    let focus = {}
    if (focusGapId) {
      const gap = await Gap.findOne({ _id: focusGapId, userId: req.user._id })
      if (!gap) throw new AppError('Gap not found', 404)
      topic = gap.topic

      // Practising a gap continues the session already open on this
      // topic instead of starting an empty duplicate: what was taught
      // so far is the context for closing the gap, and History would
      // otherwise fill up with a new blank session per Practise click.
      const activeSessions = await Session.find({
        userId: req.user._id,
        status: 'active',
      }).sort({ updatedAt: -1 })
      const sameTopic = activeSessions.find(
        (s) => normaliseKey(s.topic) === normaliseKey(gap.topic)
      )

      if (sameTopic) {
        sameTopic.focusGapId = gap._id
        sameTopic.focusGapText = gap.text
        await sameTopic.save()
        return res.status(200).json({ status: 'success', session: sameTopic, resumed: true })
      }

      focus = { focusGapId: gap._id, focusGapText: gap.text }
    }

    const session = await Session.create({
      userId: req.user._id,
      topic,
      mode,
      audience,
      ...focus,
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

    // Scoring, XP, gaps and badges all live in the service, shared with
    // the socket path
    const result = await scoreSessionAndAward(session, req.user)

    if (!result.ok) {
      if (result.reason === SCORE_BLOCKED.TOO_FEW_MESSAGES) {
        throw new AppError(
          `Send at least ${MIN_USER_MESSAGES_TO_SCORE} messages before requesting a score.`,
          400
        )
      }
      if (result.reason === SCORE_BLOCKED.NO_NEW_MESSAGES) {
        throw new AppError('Explain a bit more before requesting a new score.', 400)
      }
      if (result.quotaExceeded) throw new AppError(AI_LIMIT_MESSAGE, 429)
      throw new AppError('Scoring failed. Please try again.', 500)
    }

    res.status(200).json({
      status: 'success',
      score: result.score,
      totalScores: result.totalScores,
      allScores: result.allScores,
      xpEarned: result.xp.xpEarned,
      totalXp: result.xp.totalXp,
      xp: result.xp,
      focusGapResolved: result.focusGapResolved,
      newBadges: result.newBadges,
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

    // Scores anything taught since the last score, completes the
    // session and awards what it earned (shared with the socket path)
    const { summary, newBadges } = await endSessionAndAward(session, req.user)

    res.status(200).json({
      status: 'success',
      session,
      summary,
      newBadges,
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
router.post('/transcribe', transcribeLimiter, async (req, res, next) => {
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
      // 429 so the client shows this message as-is (see VoiceMode.jsx)
      if (result.quotaExceeded) throw new AppError(AI_LIMIT_MESSAGE, 429)
      throw new AppError('Transcription failed. Please try again.', 500)
    }

    res.status(200).json({
      status: 'success',
      transcript: result.transcript,
      // Only set when the transcript was rejected: 'no_speech' | 'too_short'
      // — lets the client explain why nothing was sent
      reason: result.reason ?? null,
    })
  } catch (err) {
    next(err)
  }
})
export default router