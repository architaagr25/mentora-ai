import { create } from 'zustand'
import api from '../api/index.js'
import socket, {
  joinSession as socketJoinSession,
  sendMessage as socketSendMessage,
  requestScore as socketRequestScore,
  endSession as socketEndSession,
} from '../socket/socketClient.js'
import useAuthStore from './authStore.js'

const SCORE_DIMENSIONS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'completeness', label: 'Completeness' },
]
const SCORE_TOAST_MS = 8000

const useSessionStore = create((set, get) => ({
  // ─────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────
  currentSession: null,
  messages: [],
  streamingMessage: '',
  isSending: false,
  // true from the moment a message is sent until the server confirms
  // it's saved — covers the gap before isStreaming turns on
  isStreaming: false,
  scores: [],
  latestScore: null,
  isScoring: false,
  scoreError: null,
  // Scoring problems are shown inside the score panel, separately
  // from `error` (the page-level banner behind the panel)
  isJoining: false,
  error: null,
  notes: null,
  // null = no notes for this session
  // { extractedConcepts: [], fileName: '', uploadedAt: '' } = has notes
  scoreToast: null,
  // Shown briefly after every score — explains the XP result and
  // which dimensions changed since the previous score:
  // { id, xpEarned, reason, scorePercent, previousBestPercent,
  //   thresholdPercent, totalXp, deltas: [{ label, from, to }], isFirstScore }
  badgeQueue: [],
  // array of { id, name, description } waiting to be shown, one at a
  // time, as a centered modal — not a toast. If a single event earns
  // multiple badges at once, they queue up: the first is shown, and
  // closing it reveals the next, rather than showing them all together.

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
    if (get().isStreaming || get().isSending) return
    set({ isSending: true })
    socketSendMessage(content)
  },

  // ─────────────────────────────────────────
  // REQUEST SCORE
  // ─────────────────────────────────────────
  requestScore: () => {
    if (get().isScoring) return
    set({ isScoring: true, scoreError: null })
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
      isSending: false,
      isStreaming: false,
      scores: [],
      latestScore: null,
      isScoring: false,
      scoreError: null,
      isJoining: false,
      error: null,
      notes: null,
      scoreToast: null,
      badgeQueue: [],
    })
  },

  clearError: () => set({ error: null }),
  clearScoreError: () => set({ scoreError: null }),
  clearScoreToast: () => set({ scoreToast: null }),

  // Dismisses the currently-shown badge (always the front of the
  // queue) — if more badges are waiting, the next one is now at the
  // front and will render automatically on the next tick.
  dismissCurrentBadge: () => {
    set((state) => ({ badgeQueue: state.badgeQueue.slice(1) }))
  },

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
      isSending: false,
      isStreaming: true,
      streamingMessage: '',
      // A new message changes what can be scored — drop any stale
      // "explain more" message from the score panel
      scoreError: null,
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
    const previous = get().latestScore

    // Which dimensions moved since the previous score — this is the
    // "why did my score change" part of the toast
    const deltas = previous
      ? SCORE_DIMENSIONS.map(({ key, label }) => ({
          label,
          from: previous[key],
          to: data.score[key],
        })).filter((d) => d.from !== d.to)
      : []

    const toastId = Date.now()
    set({
      scores: data.allScores,
      latestScore: data.score,
      isScoring: false,
      scoreToast: data.xp
        ? { ...data.xp, id: toastId, deltas, isFirstScore: !previous }
        : null,
    })

    // Keep the XP shown on the Dashboard / Profile in sync without
    // waiting for a reload
    if (data.xp?.xpEarned > 0) {
      useAuthStore.setState((state) =>
        state.user ? { user: { ...state.user, xp: data.xp.totalXp } } : {}
      )
    }

    setTimeout(() => {
      set((state) => (state.scoreToast?.id === toastId ? { scoreToast: null } : {}))
    }, SCORE_TOAST_MS)
  },

  handleBadgesEarned: (data) => {
    // Append rather than overwrite — if a badge-earning event fires
    // while a previous badge modal is still showing (e.g. two scoring
    // actions in quick succession), the new ones join the back of the
    // queue instead of replacing whatever's already waiting.
    set((state) => ({ badgeQueue: [...state.badgeQueue, ...data.badges] }))
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
    set({
      error: data.message,
      isSending: false,
      isStreaming: false,
      isScoring: false,
      isJoining: false,
    })
  },

  handleScoreError: (data) => {
    set((state) => {
      const update = { scoreError: data.message, isScoring: false }
      // The server sends its latest score so a stale client view (e.g.
      // one missing messageCountAtScore) resyncs and the rescore
      // button disables itself correctly
      if (data.latestScore) {
        update.latestScore = data.latestScore
        update.scores = state.scores.length
          ? [...state.scores.slice(0, -1), data.latestScore]
          : [data.latestScore]
      }
      return update
    })
  },

  // A dropped connection means no reply is coming — unlock the input
  // rather than leaving it stuck waiting forever
  handleDisconnect: () => {
    set({ isSending: false, isStreaming: false, streamingMessage: '', isScoring: false })
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
  socket.on('score_error', store.handleScoreError)
  socket.on('disconnect', store.handleDisconnect)
  socket.on('streak_updated', store.handleStreakUpdated)
  socket.on('badges_earned', store.handleBadgesEarned)
}

setupSocketListeners()

export default useSessionStore