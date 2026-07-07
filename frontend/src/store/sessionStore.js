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
  isStreaming: false,
  scores: [],
  latestScore: null,
  isScoring: false,
  isJoining: false,
  error: null,
  notes: null,
  // null = no notes for this session
  // { extractedConcepts: [], fileName: '', uploadedAt: '' } = has notes
  xpToast: null,
  // { amount, totalXp } — shown briefly after scoring

  // ─────────────────────────────────────────
  // CREATE SESSION
  // ─────────────────────────────────────────
  createSession: async (topic, mode = 'text') => {
    try {
      set({ error: null, isJoining: true })

      const response = await api.post('/sessions', { topic, mode })
      const session = response.data.session

      set({ currentSession: session })
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
      notes: null,
      xpToast: null,
    })
  },

  clearError: () => set({ error: null }),
  clearXpToast: () => set({ xpToast: null }),

  // ─────────────────────────────────────────
  // SOCKET EVENT HANDLERS
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
      notes: data.notes || null,
      isJoining: false,
    })
  },

  handleUserMessageSaved: (data) => {
    set((state) => ({
      messages: [...state.messages, data.message],
      isStreaming: true,
      streamingMessage: '',
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
      streamingMessage: '',
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
    setTimeout(() => {
      set((state) =>
        state.xpToast?.totalXp === data.totalXp ? { xpToast: null } : {}
      )
    }, 4000)
  },

  handleStreakUpdated: () => {
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
    // isJoining must be cleared here too — otherwise any error that
    // arrives while still joining (e.g. "Session has ended", "Not
    // authorised", "Session not found") leaves the UI stuck on the
    // "Joining session..." loading screen forever, since that check
    // runs before the error-card check in Session.jsx.
    set({ error: data.message, isStreaming: false, isScoring: false, isJoining: false })
  },
}))

// ─────────────────────────────────────────
// SOCKET EVENT LISTENERS
// Set up once when the module loads
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

setupSocketListeners()

export default useSessionStore