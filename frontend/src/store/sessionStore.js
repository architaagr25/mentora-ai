import { create } from 'zustand'
import api from '../api/index.js'
import socket, {
  joinSession as socketJoinSession,
  sendMessage as socketSendMessage,
  requestScore as socketRequestScore,
  endSession as socketEndSession,
} from '../socket/socketClient.js'

const useSessionStore = create((set, get) => ({
  // ─────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────
  currentSession: null,
  messages: [],
  streamingMessage: '',
  // The AI response being built chunk by chunk
  // Shown as a temporary bubble while AI is typing
  isStreaming: false,
  scores: [],
  latestScore: null,
  isScoring: false,
  isJoining: false,
  // true while joining/loading a session
  error: null,
  xpToast: null,
  // Brief toast shown when XP is earned — { amount, totalXp }

  // ─────────────────────────────────────────
  // CREATE SESSION
  // Creates a new session via HTTP then joins via socket
  // ─────────────────────────────────────────
  createSession: async (topic, mode = 'text') => {
    try {
      set({ error: null, isJoining: true })

      // Create session in DB via REST API
      const response = await api.post('/sessions', { topic, mode })
      const session = response.data.session

      set({ currentSession: session })

      // Join the session room via socket
      socketJoinSession(session._id)

      return session
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to create session'
      set({ error: message, isJoining: false })
      return null
    }
  },

  // ─────────────────────────────────────────
  // JOIN EXISTING SESSION
  // For when user navigates back to an active session
  // ─────────────────────────────────────────
  joinExistingSession: (sessionId) => {
    set({ error: null, isJoining: true })
    socketJoinSession(sessionId)
  },

  // ─────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────
  sendMessage: (content) => {
    if (get().isStreaming) return
    // Don't allow sending while AI is responding
    socketSendMessage(content)
  },

  // ─────────────────────────────────────────
  // REQUEST SCORE
  // ─────────────────────────────────────────
  requestScore: () => {
    if (get().isScoring) return
    set({ isScoring: true })
    socketRequestScore()
  },

  // ─────────────────────────────────────────
  // END SESSION
  // ─────────────────────────────────────────
  endSession: () => {
    socketEndSession()
  },

  // ─────────────────────────────────────────
  // RESET
  // Called when leaving the session page
  // Clears all session state
  // ─────────────────────────────────────────
  resetSession: () => {
    set({
      currentSession: null,
      messages: [],
      streamingMessage: '',
      isStreaming: false,
      scores: [],
      latestScore: null,
      isScoring: false,
      isJoining: false,
      error: null,
    })
  },

  // ─────────────────────────────────────────
  // SOCKET EVENT HANDLERS
  // Called from the socket listener setup
  // ─────────────────────────────────────────

  handleSessionJoined: (data) => {
    set({
      currentSession: {
        _id: data.sessionId,
        topic: data.topic,
        status: 'active',
      },
      messages: data.messages || [],
      scores: data.scores || [],
      latestScore:
        data.scores && data.scores.length > 0
          ? data.scores[data.scores.length - 1]
          : null,
      isJoining: false,
    })
  },

  handleUserMessageSaved: (data) => {
    set((state) => ({
      messages: [...state.messages, data.message],
      isStreaming: true,
      streamingMessage: '',
      // Start streaming state — AI is about to respond
    }))
  },

  handleAIChunk: (data) => {
    set((state) => ({
      streamingMessage: state.streamingMessage + data.text,
    }))
  },

  handleAIDone: (data) => {
    set((state) => ({
      messages: [...state.messages, data.message],
      // Add the complete AI message to the messages array
      streamingMessage: '',
      // Clear the streaming buffer
      isStreaming: false,
    }))
  },

  handleScoringStarted: () => {
    set({ isScoring: true })
  },

  handleScoreResult: (data) => {
    set({
      scores: data.allScores,
      latestScore: data.score,
      isScoring: false,
    })
  },

  handleXpEarned: (data) => {
    set({ xpToast: { amount: data.xpEarned, totalXp: data.totalXp } })
    // Auto-clear after a few seconds so it doesn't linger
    setTimeout(() => {
      set((state) =>
        state.xpToast?.totalXp === data.totalXp
          ? { xpToast: null }
          : {}
      )
    }, 4000)
  },

  handleStreakUpdated: () => {
    // Streak is on the user object (via useAuth), not session state.
    // We just need to trigger a refetch of /auth/me to get the
    // updated streak — simplest is to let the Dashboard refetch
    // on next visit, but for live update we emit a custom event
    // that useAuth can listen to.
    window.dispatchEvent(new Event('streak:updated'))
  },

  handleSessionEnded: () => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, status: 'completed' }
        : null,
    }))
  },

  handleError: (data) => {
    set({ error: data.message, isStreaming: false, isScoring: false })
  },

    clearError: () => set({ error: null }),
  clearXpToast: () => set({ xpToast: null }),

}))



// ─────────────────────────────────────────
// SOCKET EVENT LISTENERS
// Set up once — listen for all session events
// and call the appropriate store handler
// ─────────────────────────────────────────
const setupSocketListeners = () => {
  const store = useSessionStore.getState()

  socket.on('session_joined', store.handleSessionJoined)
  socket.on('user_message_saved', store.handleUserMessageSaved)
  socket.on('ai_response_chunk', store.handleAIChunk)
  socket.on('ai_response_done', store.handleAIDone)
  socket.on('scoring_started', store.handleScoringStarted)
  socket.on('score_result', store.handleScoreResult)
  socket.on('session_ended', store.handleSessionEnded)
  socket.on('error', store.handleError)
  socket.on('xp_earned', store.handleXpEarned)
  socket.on('streak_updated', store.handleStreakUpdated)
}

// Call once when the module loads
setupSocketListeners()

export default useSessionStore