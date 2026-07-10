import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Session from '../models/Session.js'
import { getAIStudentResponseStream } from '../services/aiService.js'
import { scoreSession } from '../services/scoringService.js'
import logger from '../utils/logger.js'
import { calculateStreakUpdate, calculateXpForScore } from '../utils/gamification.js'
import { checkForNewBadges } from '../services/badgeService.js'
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
        if (streak !== socket.user.streak || lastActiveDate.getTime() !== new Date(socket.user.lastActiveDate || 0).setHours(0,0,0,0)) {
          await User.findByIdAndUpdate(socket.user._id, { streak, lastActiveDate })
          socket.user.streak = streak
          socket.user.lastActiveDate = lastActiveDate
          socket.emit('streak_updated', { streak })

          // Streak just changed — check for streak-based badges.
          // Only runs on an actual streak change (not every message),
          // avoiding an extra Sessions query on every single send.
          const allSessions = await Session.find({ userId: socket.user._id }).select('-messages')
          const newBadges = checkForNewBadges(socket.user, allSessions)
          if (newBadges.length > 0) {
            await User.findByIdAndUpdate(socket.user._id, {
              $addToSet: { badges: { $each: newBadges.map((b) => b.id) } },
            })
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
        // Emit each chunk as it arrives
        logger.info(`Sending ${session.messages.length} messages to Gemini. Last 2: ${JSON.stringify(session.messages.slice(-2))}`)
        // Pull concepts from session notes if they exist
const concepts = session.notes?.extractedConcepts?.length > 0
  ? session.notes.extractedConcepts
  : null
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

              logger.info(
                `AI response complete for session ${socket.sessionId}`
              )
            },

            onError: (errMessage) => {
              socket.emit('error', {
                message: 'AI student is unavailable. Please try again.',
              })
              logger.error(`AI stream error: ${errMessage}`)
            },
          },
          concepts 
        )
      } catch (err) {
        logger.error(`send_message error: ${err.message}`)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // ─────────────────────────────────────────
    // REQUEST SCORE
    // User requests scoring for current session
    // ─────────────────────────────────────────
    socket.on('request_score', async () => {
      try {
        if (!socket.sessionId) {
          return socket.emit('error', { message: 'Join a session first' })
        }

        const session = await Session.findById(socket.sessionId)

        if (!session || session.status !== 'active') {
          return socket.emit('error', { message: 'Session not found or ended' })
        }

        const userMessages = session.messages.filter(
          (msg) => msg.role === 'user'
        )

        if (userMessages.length === 0) {
          return socket.emit('error', { message: 'No messages to score yet' })
        }

        // Tell client scoring has started so they can show a loading state
        socket.emit('scoring_started')

        const scoringResult = await scoreSession(
          session.topic,
          session.messages
        )

        if (!scoringResult.success) {
          return socket.emit('error', { message: 'Scoring failed. Please try again.' })
        }

        // Save score snapshot
        session.scores.push(scoringResult.scores)
        await session.save()

 // Award XP if this score crosses the 70% threshold
        const xpEarned = calculateXpForScore(scoringResult.scores)
        let userForBadgeCheck = socket.user
        if (xpEarned > 0) {
          const updatedUser = await User.findByIdAndUpdate(
            socket.user._id,
            { $inc: { xp: xpEarned } },
            { new: true }
          )
          socket.user.xp = updatedUser.xp
          userForBadgeCheck = updatedUser
          socket.emit('xp_earned', { xpEarned, totalXp: updatedUser.xp })
        }

        // Send score result to client
        socket.emit('score_result', {
          score: scoringResult.scores,
          totalScores: session.scores.length,
          allScores: session.scores,
        })

        // Check for newly-earned badges now that this score is saved
        const allSessions = await Session.find({ userId: socket.user._id }).select('-messages')
        const newBadges = checkForNewBadges(userForBadgeCheck, allSessions)
        if (newBadges.length > 0) {
          await User.findByIdAndUpdate(socket.user._id, {
            $addToSet: { badges: { $each: newBadges.map((b) => b.id) } },
          })
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
        socket.emit('error', { message: 'Scoring failed' })
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
        const allSessions = await Session.find({ userId: socket.user._id }).select('-messages')
        const newBadges = checkForNewBadges(socket.user, allSessions)
        if (newBadges.length > 0) {
          await User.findByIdAndUpdate(socket.user._id, {
            $addToSet: { badges: { $each: newBadges.map((b) => b.id) } },
          })
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
      logger.info(
        `Socket disconnected: ${socket.id} — reason: ${reason}`
      )
      // Session stays active in DB — user can reconnect and continue
    })
  })
}

export default initializeSocket