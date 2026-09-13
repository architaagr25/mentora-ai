import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Session from '../models/Session.js'
import { getAIStudentResponseStream } from '../services/aiService.js'
import { scoreSession } from '../services/scoringService.js'
import logger from '../utils/logger.js'
import { calculateStreakUpdate, getXpBreakdown } from '../utils/gamification.js'
import { checkForNewBadges } from '../services/badgeService.js'
import { MIN_USER_MESSAGES_TO_SCORE } from '../constants/scoring.js'
import { messageRateLimiter, scoreRateLimiter } from './socketRateLimit.js'
import { AI_LIMIT_MESSAGE } from '../config/ai.js'
import { buildNotesContext, STUDENT_NOTES_CHARS } from '../utils/notesContext.js'
// ─────────────────────────────────────────
// INITIALIZE SOCKET
// Called once from app.js with the io instance
// Sets up authentication middleware and event handlers
// ─────────────────────────────────────────
const initializeSocket = (io) => {
  // ─────────────────────────────────────────
  // SOCKET AUTHENTICATION MIDDLEWARE
  // Runs before any connection is established
  // Verifies the JWT token passed by the client
  // ─────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token

      if (!token) {
        return next(new Error('Authentication required'))
        // next(error) rejects the connection
        // next() with no args allows it
      }

      // Verify the JWT — same as HTTP auth middleware
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

      // Fetch the user and attach to socket
      const user = await User.findById(decoded.userId).select(
        '-passwordHash -refreshTokens'
      )

      if (!user) {
        return next(new Error('User not found'))
      }

      // Attach user to socket — available in all event handlers
      socket.user = user
      next()
    } catch (err) {
      next(new Error('Invalid token'))
    }
  })

  // ─────────────────────────────────────────
  // STREAM AN AI REPLY FOR THE LAST USER MESSAGE
  // Shared by send_message and retry_response, so a retry produces a
  // reply exactly the way the original send would have.
  // Callers own the socket.isGenerating flag around this.
  // ─────────────────────────────────────────
  const streamAIReply = async (socket, session) => {
    logger.info(
      `Sending ${session.messages.length} messages to Gemini. Last 2: ${JSON.stringify(session.messages.slice(-2))}`
    )

    // Concepts + a short extract of the uploaded notes, so the AI
    // student can spot what's missing rather than only reacting to
    // what was said. Empty when no notes were uploaded.
    const notes = buildNotesContext(session, STUDENT_NOTES_CHARS)

    await getAIStudentResponseStream(
      session.topic,
      session.messages,
      {
        onChunk: (chunkText) => {
          // Emit chunk to the client in real time
          socket.emit('ai_response_chunk', { text: chunkText })
        },

        onComplete: async (fullText) => {
          // Save the complete AI response to DB
          session.messages.push({
            role: 'assistant',
            content: fullText,
          })
          await session.save()

          const aiMessage = session.messages[session.messages.length - 1]

          // Tell client the AI is done
          socket.emit('ai_response_done', { message: aiMessage })

          logger.info(`AI response complete for session ${socket.sessionId}`)
        },

        onError: (errMessage, quotaExceeded) => {
          // canRetry tells the client to offer a Retry button: the user's
          // message is saved, only the reply is missing
          socket.emit('error', {
            message: quotaExceeded
              ? AI_LIMIT_MESSAGE
              : 'AI student is unavailable. Please try again.',
            canRetry: true,
          })
          logger.error(`AI stream error: ${errMessage}`)
        },
      },
      notes
    )
  }

  // ─────────────────────────────────────────
  // CONNECTION EVENT
  // Fires when a client successfully connects
  // ─────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} — user: ${socket.user.email}`)

    // ─────────────────────────────────────────
    // JOIN SESSION
    // Client joins a room for a specific session
    // Must be called before sending messages
    // ─────────────────────────────────────────
    socket.on('join_session', async (data) => {
      try {
        const { sessionId } = data

        if (!sessionId) {
          return socket.emit('error', { message: 'Session ID required' })
        }

        // Verify the session exists and belongs to this user
        const session = await Session.findById(sessionId)

        if (!session) {
          return socket.emit('error', { message: 'Session not found' })
        }

        if (session.userId.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'Not authorised' })
        }

        if (session.status !== 'active') {
          return socket.emit('error', { message: 'Session has ended' })
        }

        // Join the Socket.io room for this session
        // Room name format: "session:abc123"
        const roomName = `session:${sessionId}`
        socket.join(roomName)

        // Store sessionId on socket for use in other handlers
        socket.sessionId = sessionId
        socket.roomName = roomName

        logger.info(`User ${socket.user.email} joined session ${sessionId}`)

        // Confirm to client they joined successfully
        // Send existing messages so they can restore the chat
        socket.emit('session_joined', {
          sessionId,
          topic: session.topic,
          messages: session.messages,
          scores: session.scores,
          latestScore: session.latestScore,
          // Send concepts to frontend so it can show the notes badge.
          // We deliberately exclude rawText — it's large and the frontend doesn't need it.
          notes: session.notes
            ? {
                extractedConcepts: session.notes.extractedConcepts,
                fileName: session.notes.fileName,
                uploadedAt: session.notes.uploadedAt,
              }
            : null,
        })
      } catch (err) {
        logger.error(`join_session error: ${err.message}`)
        socket.emit('error', { message: 'Failed to join session' })
      }
    })

    // ─────────────────────────────────────────
    // SEND MESSAGE
    // User sends a message → save it → stream AI response
    // ─────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { content } = data

        // Validate
        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message cannot be empty' })
        }

        if (content.length > 2000) {
          return socket.emit('error', { message: 'Message too long' })
        }

        if (!socket.sessionId) {
          return socket.emit('error', { message: 'Join a session first' })
        }

        // One send at a time. The client blocks this too, but a second
        // message arriving mid-reply would run two Gemini calls against
        // the same session and save the turns out of order.
        if (socket.isGenerating) {
          return socket.emit('error', {
            message: 'Wait for the AI student to finish replying.',
          })
        }

        // Claimed here, BEFORE the first await — not later, next to the
        // Gemini call. The DB fetch and save take a few hundred ms, and
        // a second message arriving in that window would sail past the
        // check above. `finally` at the end of the handler releases it.
        socket.isGenerating = true

        // Checked after validation (so rejected messages don't use up
        // the allowance) but before any DB or Gemini work
        const rate = messageRateLimiter(socket.user._id)
        if (!rate.allowed) {
          logger.warn(`Message rate limit hit — user ${socket.user._id}`)
          return socket.emit('error', {
            message: `You're sending messages too quickly. Please wait ${rate.retryAfterSeconds} seconds and try again.`,
          })
        }

        // Fetch the session
        const session = await Session.findById(socket.sessionId)

        if (!session || session.status !== 'active') {
          return socket.emit('error', { message: 'Session not found or ended' })
        }

        // Step 1 — Save user message to DB
        session.messages.push({ role: 'user', content: content.trim() })
        await session.save()

        // Update streak — any message counts as daily activity
        const { streak, lastActiveDate } = calculateStreakUpdate(
          socket.user.lastActiveDate,
          socket.user.streak
        )
        if (
          streak !== socket.user.streak ||
          lastActiveDate.getTime() !==
            new Date(socket.user.lastActiveDate || 0).setHours(0, 0, 0, 0)
        ) {
          await User.findByIdAndUpdate(socket.user._id, {
            streak,
            lastActiveDate,
          })
          socket.user.streak = streak
          socket.user.lastActiveDate = lastActiveDate
          socket.emit('streak_updated', { streak })

          // Streak just changed — check for streak-based badges.
          // Only runs on an actual streak change (not every message),
          // avoiding an extra Sessions query on every single send.
          const allSessions = await Session.find({
            userId: socket.user._id,
          }).select('-messages')
          const newBadges = checkForNewBadges(socket.user, allSessions)
          if (newBadges.length > 0) {
            await User.findByIdAndUpdate(socket.user._id, {
              $addToSet: { badges: { $each: newBadges.map((b) => b.id) } },
            })
            // Keep the in-memory socket.user in sync — see the same
            // comment in request_score above for why this is required.
            socket.user.badges = [
              ...(socket.user.badges || []),
              ...newBadges.map((b) => b.id),
            ]
            socket.emit('badges_earned', {
              badges: newBadges.map((b) => ({
                id: b.id,
                name: b.name,
                description: b.description,
              })),
            })
          }
        }

        const userMessage = session.messages[session.messages.length - 1]

        // Step 2 — Emit the saved user message back to confirm it was saved
        socket.emit('user_message_saved', { message: userMessage })

        // Step 3 — Stream AI response
        await streamAIReply(socket, session)
      } catch (err) {
        logger.error(`send_message error: ${err.message}`)
        socket.emit('error', { message: 'Failed to send message' })
      } finally {
        // Released however the handler ended — reply sent, validation
        // rejected, or an error thrown — so a send can never be
        // permanently blocked for this connection
        socket.isGenerating = false
      }
    })

    // ─────────────────────────────────────────
    // RETRY RESPONSE
    // The user's message was saved but the AI reply failed (Gemini
    // error, quota, connection dropped mid-reply). Regenerates the
    // reply for the last user message — nothing is re-saved.
    // ─────────────────────────────────────────
    socket.on('retry_response', async () => {
      try {
        if (!socket.sessionId) {
          return socket.emit('error', { message: 'Join a session first' })
        }

        if (socket.isGenerating) {
          return socket.emit('error', {
            message: 'Wait for the AI student to finish replying.',
          })
        }

        // Claimed before the first await — same reasoning as send_message
        socket.isGenerating = true

        const rate = messageRateLimiter(socket.user._id)
        if (!rate.allowed) {
          logger.warn(`Retry rate limit hit — user ${socket.user._id}`)
          return socket.emit('error', {
            message: `You're sending messages too quickly. Please wait ${rate.retryAfterSeconds} seconds and try again.`,
          })
        }

        const session = await Session.findById(socket.sessionId)

        if (!session || session.status !== 'active') {
          return socket.emit('error', { message: 'Session not found or ended' })
        }

        // Only valid when the conversation is waiting on a reply
        const lastMessage = session.messages[session.messages.length - 1]
        if (!lastMessage || lastMessage.role !== 'user') {
          return socket.emit('error', { message: 'There is nothing to retry.' })
        }

        // Tells the client to show the "thinking" state — there's no
        // user_message_saved event this time, since nothing was sent
        socket.emit('ai_reply_started')

        await streamAIReply(socket, session)
      } catch (err) {
        logger.error(`retry_response error: ${err.message}`)
        socket.emit('error', {
          message: 'Could not retry. Please try again.',
          canRetry: true,
        })
      } finally {
        socket.isGenerating = false
      }
    })

    // ─────────────────────────────────────────
    // REQUEST SCORE
    // User requests scoring for current session
    // ─────────────────────────────────────────
    socket.on('request_score', async () => {
      // Scoring problems go to 'score_error' (shown inside the score
      // panel), not the generic 'error' (the page-level banner behind
      // it). latestScore lets the client resync if its view was stale.
      const emitScoreError = (message, session = null) =>
        socket.emit('score_error', {
          message,
          latestScore: session?.scores?.[session.scores.length - 1] ?? null,
        })

      try {
        if (!socket.sessionId) {
          return emitScoreError('Join a session first')
        }

        const rate = scoreRateLimiter(socket.user._id)
        if (!rate.allowed) {
          logger.warn(`Score rate limit hit — user ${socket.user._id}`)
          return emitScoreError(
            `You're requesting scores too quickly. Please wait ${rate.retryAfterSeconds} seconds and try again.`
          )
        }

        const session = await Session.findById(socket.sessionId)

        if (!session || session.status !== 'active') {
          return emitScoreError('Session not found or ended')
        }

        const userMessages = session.messages.filter(
          (msg) => msg.role === 'user'
        )

        if (userMessages.length < MIN_USER_MESSAGES_TO_SCORE) {
          return emitScoreError(
            `Send at least ${MIN_USER_MESSAGES_TO_SCORE} messages before requesting a score.`,
            session
          )
        }

        if (!session.hasNewMessagesSinceLastScore()) {
          return emitScoreError(
            'Explain a bit more before requesting a new score.',
            session
          )
        }

        // Tell client scoring has started so they can show a loading state
        socket.emit('scoring_started')

        // Scoring gets the larger notes excerpt — accuracy is judged
        // against the student's own notes where they cover a point
        const scoringResult = await scoreSession(
          session.topic,
          session.messages,
          buildNotesContext(session)
        )

        if (!scoringResult.success) {
          return emitScoreError(
            scoringResult.quotaExceeded
              ? AI_LIMIT_MESSAGE
              : 'Scoring failed. Please try again.',
            session
          )
        }

        // Only XP above this session's previous best is awarded —
        // the breakdown also carries the "why" for the client toast
        const xp = getXpBreakdown(scoringResult.scores, session.scores)

        // Save score snapshot
        session.scores.push({
          ...scoringResult.scores,
          messageCountAtScore: userMessages.length,
        })
        await session.save()
        let userForBadgeCheck = socket.user
        if (xp.xpEarned > 0) {
          const updatedUser = await User.findByIdAndUpdate(
            socket.user._id,
            { $inc: { xp: xp.xpEarned } },
            { new: true }
          )
          socket.user.xp = updatedUser.xp
          userForBadgeCheck = updatedUser
        }

        // Send score result to client
        // Send the saved snapshot (not the raw scoring result) so the
        // client gets messageCountAtScore for its rescore guard
        socket.emit('score_result', {
          score: session.scores[session.scores.length - 1],
          totalScores: session.scores.length,
          allScores: session.scores,
          xp: { ...xp, totalXp: socket.user.xp },
        })

        // Check for newly-earned badges now that this score is saved
        const allSessions = await Session.find({
          userId: socket.user._id,
        }).select('-messages')
        const newBadges = checkForNewBadges(userForBadgeCheck, allSessions)
        if (newBadges.length > 0) {
          await User.findByIdAndUpdate(socket.user._id, {
            $addToSet: { badges: { $each: newBadges.map((b) => b.id) } },
          })
          // socket.user is cached in memory for the lifetime of this
          // socket connection — the DB write above doesn't refresh it.
          // Without this, checkForNewBadges would keep re-awarding the
          // same badge every time this handler runs on the same
          // connection, since it'd always see the stale (pre-award)
          // badges list. Same pattern already used for xp/streak below.
          socket.user.badges = [
            ...(socket.user.badges || []),
            ...newBadges.map((b) => b.id),
          ]
          socket.emit('badges_earned', {
            badges: newBadges.map((b) => ({
              id: b.id,
              name: b.name,
              description: b.description,
            })),
          })
        }
      } catch (err) {
        logger.error(`request_score error: ${err.message}`)
        emitScoreError('Scoring failed. Please try again.')
      }
    })

    // ─────────────────────────────────────────
    // END SESSION
    // User ends the session — marks it completed
    // ─────────────────────────────────────────
    socket.on('end_session', async () => {
      try {
        if (!socket.sessionId) {
          return socket.emit('error', { message: 'Join a session first' })
        }

        const session = await Session.findById(socket.sessionId)

        if (!session) {
          return socket.emit('error', { message: 'Session not found' })
        }

        if (session.status !== 'active') {
          return socket.emit('error', { message: 'Session already ended' })
        }

        const durationMs = Date.now() - session.createdAt.getTime()
        session.duration = Math.floor(durationMs / 1000)
        session.status = 'completed'
        // Clear raw text when session ends — keeps the DB lean.
        // Concepts stay permanently for scoring reference.
        if (session.notes) {
          session.notes.rawText = null
        }
        await session.save()

        socket.emit('session_ended', {
          sessionId: socket.sessionId,
          duration: session.duration,
        })

        // Completing a session can unlock session-count badges
        // (e.g. "First Steps" at 1 completed session) — this was
        // previously only checked after scoring or a streak update,
        // so completing your very first session never triggered it.
        const allSessions = await Session.find({
          userId: socket.user._id,
        }).select('-messages')
        const newBadges = checkForNewBadges(socket.user, allSessions)
        if (newBadges.length > 0) {
          await User.findByIdAndUpdate(socket.user._id, {
            $addToSet: { badges: { $each: newBadges.map((b) => b.id) } },
          })
          // Keep the in-memory socket.user in sync — see the same
          // comment in request_score above for why this is required.
          socket.user.badges = [
            ...(socket.user.badges || []),
            ...newBadges.map((b) => b.id),
          ]
          socket.emit('badges_earned', {
            badges: newBadges.map((b) => ({
              id: b.id,
              name: b.name,
              description: b.description,
            })),
          })
        }

        // Leave the room
        socket.leave(socket.roomName)
        socket.sessionId = null
        socket.roomName = null
      } catch (err) {
        logger.error(`end_session error: ${err.message}`)
        socket.emit('error', { message: 'Failed to end session' })
      }
    })

    // ─────────────────────────────────────────
    // DISCONNECT
    // Fires when client disconnects
    // ─────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} — reason: ${reason}`)
      // Session stays active in DB — user can reconnect and continue
    })
  })
}

export default initializeSocket
