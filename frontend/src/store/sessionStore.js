import { create } from 'zustand'
import api from '../api/index.js'
import socket, {
  joinSession as socketJoinSession,
  leaveSession as socketLeaveSession,
  sendMessage as socketSendMessage,
  requestScore as socketRequestScore,
  retryResponse as socketRetryResponse,
  endSession as socketEndSession,
} from '../socket/socketClient.js'
import useAuthStore from './authStore.js'

const SCORE_DIMENSIONS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'completeness', label: 'Completeness' },
]
const SCORE_TOAST_MS = 8000

// Text of a message sent but not yet confirmed saved by the server.
// If the server rejects it (e.g. rate limited), it's handed back via
// `unsentMessage` so the page can put it back in the input box.
let pendingContent = null

// ─────────────────────────────────────────
// TYPING EFFECT
// The server sends the finished reply in one piece — it has to, since
// the duplicate check, the reply-rule check and the [UNDERSTOOD] strip
// all need the whole draft before any of it is safe to show. The
// typing itself is done here instead, so it costs nothing: the text is
// already in the browser, this only decides how fast it appears.
// ─────────────────────────────────────────
const TYPE_TICK_MS = 16
const TYPE_CHARS_PER_SECOND = 190
// However long the reply, the typing never drags past this
const TYPE_MAX_SECONDS = 2.5

let typeTimer = null
let typeBuffer = ''
let typeShown = 0
// ai_response_done that arrived while the text was still appearing
let pendingDone = null

const stopTypewriter = () => {
  if (typeTimer) clearInterval(typeTimer)
  typeTimer = null
  typeBuffer = ''
  typeShown = 0
  pendingDone = null
}

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
  canRetry: false,
  // true when the last user message got no reply (the AI call failed,
  // or the connection dropped mid-reply) — the page offers a Retry
  isJoining: false,
  error: null,
  unsentMessage: null,
  // text of a message the server rejected — restored to the input box
  studentUnderstood: false,
  // true once the AI student says it understands (it adds a hidden
  // marker, stripped server-side). The page then offers to score or
  // carry on — it never scores on its own.
  sessionSummary: null,
  // End-of-session wrap-up from the server: final score, key points and
  // which of them were covered. Set when session_ended arrives.
  focusGap: null,
  // { id, text } in a practice session started from a gap, plus
  // resolved: true once a score in this session closes it
  notes: null,
  // null = no notes for this session
  // { extractedConcepts: [], fileName: '', uploadedAt: '' } = has notes
  coveredConcepts: [],
  // concepts from the notes the AI judges as already taught — refreshed
  // by the server every few messages
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

  connectionStatus: socket.connected ? 'connected' : 'connecting',
  // 'connecting'   — first connection after load/login
  // 'connected'    — live; safe to send
  // 'reconnecting' — connection dropped; socket.io is retrying
  // 'rejoining'    — back online, waiting for the session room re-join
  // 'failed'       — couldn't re-authenticate; the user must reload
  // 'offline'      — deliberately disconnected (logout)
  // Sending is only allowed while 'connected': anything emitted while
  // offline would be flushed on reconnect BEFORE the room is re-joined,
  // and the server would reject it with "Join a session first".

  // ─────────────────────────────────────────
  // CREATE SESSION
  // ─────────────────────────────────────────
  createSession: async (topic, mode = 'text', audience = 'peer') => {
    try {
      set({ error: null, isJoining: true })

      const response = await api.post('/sessions', { topic, mode, audience })
      const session = response.data.session

      set({ currentSession: session })
      socketJoinSession(session._id)

      return session
    } catch (err) {
      // Validation problems come back as { errors: { topic: [...] } },
      // everything else as { message }. Without the first branch a bad
      // topic showed only "Failed to create session".
      const data = err.response?.data
      const fieldError = Object.values(data?.errors ?? {})
        .flat()
        .filter(Boolean)[0]
      const message = fieldError || data?.message || 'Failed to create session'
      set({ error: message, isJoining: false })
      return null
    }
  },

  // ─────────────────────────────────────────
  // JOIN EXISTING SESSION
  // ─────────────────────────────────────────
  // options.focus marks a visit that came from "Practise this gap"
  joinExistingSession: (sessionId, options) => {
    set({ error: null, isJoining: true })
    socketJoinSession(sessionId, options)
  },

  // ─────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────
  sendMessage: (content) => {
    const { isStreaming, isSending, connectionStatus } = get()
    if (isStreaming || isSending || connectionStatus !== 'connected') return
    pendingContent = content
    set({ isSending: true, unsentMessage: null, studentUnderstood: false })
    socketSendMessage(content)
  },

  // ─────────────────────────────────────────
  // RETRY THE AI REPLY
  // The user's message is already saved — this only asks for the
  // missing reply, so nothing is sent again.
  // ─────────────────────────────────────────
  retryResponse: () => {
    const { isStreaming, isSending, canRetry, connectionStatus } = get()
    if (isStreaming || isSending || !canRetry || connectionStatus !== 'connected') return
    set({ isSending: true, canRetry: false, error: null })
    socketRetryResponse()
  },

  // ─────────────────────────────────────────
  // REQUEST SCORE
  // ─────────────────────────────────────────
  requestScore: () => {
    if (get().isScoring || get().connectionStatus !== 'connected') return
    set({ isScoring: true, scoreError: null, studentUnderstood: false })
    socketRequestScore()
  },

  // ─────────────────────────────────────────
  // END SESSION
  // ─────────────────────────────────────────
  endSession: () => {
    if (get().connectionStatus !== 'connected') return
    socketEndSession()
  },

  // ─────────────────────────────────────────
  // RESET
  // Called when leaving the session page
  // ─────────────────────────────────────────
  resetSession: () => {
    socketLeaveSession()
    stopTypewriter()
    pendingContent = null
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
      canRetry: false,
      isJoining: false,
      error: null,
      unsentMessage: null,
      notes: null,
      focusGap: null,
      sessionSummary: null,
      studentUnderstood: false,
      coveredConcepts: [],
      scoreToast: null,
      badgeQueue: [],
    })
  },

  clearError: () => set({ error: null }),
  clearUnsentMessage: () => set({ unsentMessage: null }),
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
      focusGap: data.focusGap || null,
      coveredConcepts: data.coveredConcepts || [],
      // A trailing user message means the reply never arrived (the AI
      // failed, or the page was closed mid-reply) — offer Retry
      canRetry: data.messages?.[data.messages.length - 1]?.role === 'user',
      isJoining: false,
      // After a reconnect this is the moment it's safe to send again.
      // The messages above come fresh from the DB, so an AI reply that
      // finished while we were offline shows up here too.
      connectionStatus: socket.connected ? 'connected' : get().connectionStatus,
    })
  },

  handleUserMessageSaved: (data) => {
    pendingContent = null
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
    typeBuffer += data.text
    if (typeTimer) return

    typeTimer = setInterval(() => {
      const total = typeBuffer.length
      // Steady pace, but quicker for a long reply so it still lands
      // within TYPE_MAX_SECONDS
      const perTick = Math.max(
        Math.ceil((TYPE_CHARS_PER_SECOND * TYPE_TICK_MS) / 1000),
        Math.ceil(total / ((TYPE_MAX_SECONDS * 1000) / TYPE_TICK_MS))
      )
      typeShown = Math.min(total, typeShown + perTick)
      set({ streamingMessage: typeBuffer.slice(0, typeShown) })

      if (typeShown < total) return

      // Caught up: either finish the reply, or idle until more arrives
      if (pendingDone) {
        const done = pendingDone
        stopTypewriter()
        get().commitAIMessage(done)
        return
      }
      clearInterval(typeTimer)
      typeTimer = null
    }, TYPE_TICK_MS)
  },

  // Swaps the animated bubble for the saved message
  commitAIMessage: (data) => {
    set((state) => ({
      messages: [...state.messages, data.message],
      streamingMessage: '',
      isStreaming: false,
      canRetry: false,
      studentUnderstood: Boolean(data.understood),
    }))
  },

  handleAIDone: (data) => {
    // If the text is still appearing, let it finish first — otherwise
    // the bubble would jump to the full reply mid-sentence
    if (typeTimer && typeShown < typeBuffer.length) {
      pendingDone = data
      return
    }
    stopTypewriter()
    get().commitAIMessage(data)
  },

  dismissUnderstood: () => set({ studentUnderstood: false }),

  // Sent when a retry starts — there's no user message to save this
  // time, so this is what switches the UI into the "thinking" state
  handleAIReplyStarted: () => {
    stopTypewriter()
    set({ isSending: false, isStreaming: true, streamingMessage: '' })
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

    // This score closed the practice session's focus gap
    if (data.focusGapResolved) {
      set((state) =>
        state.focusGap ? { focusGap: { ...state.focusGap, resolved: true } } : {}
      )
    }

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

  handleMemoryUpdated: (data) => {
    set({ coveredConcepts: data.coveredConcepts || [] })
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

  // data is the wrap-up built by the server (sessionEndService.js):
  // { sessionId, duration, finalScore, keyPoints, autoScored, xp }.
  // Stored so the session page can show a summary instead of bouncing
  // the user to the dashboard.
  handleSessionEnded: (data) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, status: 'completed' }
        : null,
      sessionSummary: data ?? null,
      latestScore: data?.finalScore ?? state.latestScore,
      scores: data?.finalScore
        ? [...state.scores.filter((s) => s.scoredAt !== data.finalScore.scoredAt), data.finalScore]
        : state.scores,
    }))
  },

 handleError: (data) => {
    // isJoining must be cleared here too — otherwise any error that
    // arrives while still joining (e.g. "Session has ended", "Not
    // authorised", "Session not found") leaves the UI stuck on the
    // "Joining session..." loading screen forever, since that check
    // runs before the error-card check in Session.jsx.
    // If this error rejected a message that was never saved, hand its
    // text back so the user doesn't have to retype it
    const unsentMessage = get().isSending ? pendingContent : null
    pendingContent = null

    set((state) => ({
      error: data.message,
      ...(unsentMessage ? { unsentMessage } : {}),
      // The server sets canRetry when the message was saved but the
      // reply failed — the user can ask for the reply again
      canRetry: Boolean(data.canRetry),
      isSending: false,
      isStreaming: false,
      isScoring: false,
      isJoining: false,
      // A failed re-join (e.g. the session was ended in another tab)
      // still means we're online — unlock and show the error instead
      // of an endless "restoring session" banner
      connectionStatus:
        state.connectionStatus === 'rejoining' ? 'connected' : state.connectionStatus,
    }))
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

  // ─────────────────────────────────────────
  // CONNECTION STATUS HANDLERS
  // ─────────────────────────────────────────

  handleConnect: () => {
    // In a session, socketClient re-emits join_session on connect —
    // wait for session_joined before allowing sends again
    set({ connectionStatus: get().currentSession ? 'rejoining' : 'connected' })
  },

  // A dropped connection means no reply is coming — clear the
  // waiting states rather than leaving them stuck forever. Sending
  // stays blocked (via connectionStatus) until we're back.
  handleDisconnect: (reason) => {
    // A dropped connection ends the reply — stop mid-animation
    stopTypewriter()
    set((state) => ({
      isSending: false,
      isStreaming: false,
      streamingMessage: '',
      isScoring: false,
      // A reply cut off by the drop leaves the last message unanswered.
      // The re-join refreshes this from the database either way.
      canRetry: state.isStreaming || state.isSending || state.canRetry,
      // 'io client disconnect' = we disconnected on purpose (logout)
      connectionStatus: reason === 'io client disconnect' ? 'offline' : 'reconnecting',
    }))
  },

  handleAuthFailed: () => {
    set({ connectionStatus: 'failed' })
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
  socket.on('ai_reply_started', store.handleAIReplyStarted)
  socket.on('memory_updated', store.handleMemoryUpdated)
  socket.on('scoring_started', store.handleScoringStarted)
  socket.on('score_result', store.handleScoreResult)
  socket.on('session_ended', store.handleSessionEnded)
  socket.on('error', store.handleError)
  socket.on('score_error', store.handleScoreError)
  socket.on('connect', store.handleConnect)
  socket.on('disconnect', store.handleDisconnect)
  // Fired by socketClient when re-authentication keeps failing
  window.addEventListener('socket:auth_failed', store.handleAuthFailed)
  socket.on('streak_updated', store.handleStreakUpdated)
  socket.on('badges_earned', store.handleBadgesEarned)
}

setupSocketListeners()

export default useSessionStore