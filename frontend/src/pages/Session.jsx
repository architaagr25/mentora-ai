import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  GraduationCap,
  BarChart3,
  Flag,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mic,
  MessageSquare,
  FileText,
  Zap,
  Check,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import useSessionStore from '@/store/sessionStore'
import VoiceMode from '@/components/session/VoiceMode'
import SessionSummary from '@/components/session/SessionSummary'
import XpInfo from '@/components/XpInfo'
import ThemeToggle from '@/components/layout/ThemeToggle'
import StudentAvatar from '@/components/StudentAvatar'

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const getScoreColor = (score) => {
  if (score >= 8) return 'text-success'
  if (score >= 6) return 'text-highlight'
  return 'text-danger'
}

const getScoreBarColor = (score) => {
  if (score >= 8) return 'bg-success'
  if (score >= 6) return 'bg-highlight'
  return 'bg-danger'
}

// Toast copy for each XP outcome — reasons come from
// getXpBreakdown() in backend/src/utils/gamification.js
const getScoreToastTitle = (t) => {
  if (t.xpEarned > 0) return `+${t.xpEarned} XP earned`
  if (t.reason === 'below_threshold') return `Scored ${t.scorePercent}% — no XP yet`
  return `Scored ${t.scorePercent}% — no new XP`
}

const getScoreToastReason = (t) => {
  switch (t.reason) {
    case 'first_qualifying':
      return `You scored ${t.scorePercent}%: 20 XP for reaching ${t.thresholdPercent}%, plus ${
        t.scorePercent - t.thresholdPercent
      } for the points above it.`
    case 'improved':
      return `New best in this session: ${t.previousBestPercent}% → ${t.scorePercent}%. You earn the extra XP over your previous best.`
    case 'below_threshold':
      return `Reach ${t.thresholdPercent}% to start earning XP. Keep explaining, then rescore.`
    case 'not_improved':
      return `Your best in this session is still ${t.previousBestPercent}%. Beat it to earn more XP.`
    default:
      return ''
  }
}

// Banner text per sessionStore connectionStatus — statuses without an
// entry ('connected', 'connecting', 'offline') show no banner
const CONNECTION_BANNER = {
  reconnecting: 'Connection lost — reconnecting… Your conversation is saved.',
  rejoining: 'Reconnected — restoring your session…',
  failed: "Couldn't reconnect. Reload the page to continue.",
}

// Keep in sync with MIN_USER_MESSAGES_TO_SCORE in
// backend/src/constants/scoring.js
const MIN_USER_MESSAGES_TO_SCORE = 2

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─────────────────────────────────────────
// SESSION PAGE
// ─────────────────────────────────────────
const Session = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Back goes to wherever the session was opened from (History,
  // Concepts, Dashboard). Pages pass it in navigation state; a direct
  // link or a reload falls back to the dashboard.
  const backTo = location.state?.from ?? '/dashboard'
  // Only a visit opened from "Practise this gap" keeps the gap focus
  const isPracticeVisit = location.state?.focus === true

const {
    currentSession,
    messages,
    streamingMessage,
    isSending,
    isStreaming,
    scores,
    latestScore,
    isScoring,
    scoreError,
    clearScoreError,
    isJoining,
    error,
    notes,
    sendMessage,
    requestScore,
    endSession,
    joinExistingSession,
    resetSession,
    clearError,
    scoreToast,
    clearScoreToast,
    connectionStatus,
    unsentMessage,
    clearUnsentMessage,
    canRetry,
    retryResponse,
    coveredConcepts,
    focusGap,
    sessionSummary,
    studentUnderstood,
    dismissUnderstood,
  } = useSessionStore()

  const [input, setInput] = useState('')
  const [showScorePanel, setShowScorePanel] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  // Ending is done the moment the wrap-up arrives — derived rather than
  // set from an effect, so the modals close in the same render
  const endInFlight = isEnding && !sessionSummary
  const hasNotes = notes && notes.extractedConcepts?.length > 0
  const [showNotesModal, setShowNotesModal] = useState(false)
const [voiceMode, setVoiceMode] = useState(() => {
    try {
      return localStorage.getItem('mentora_voice_mode') === 'true'
    } catch {
      return false
    }
  })
    const [latestAiMessage, setLatestAiMessage] = useState(null)
    const [scrollToAttempts, setScrollToAttempts] = useState(false)

const lastSpokenIdRef = useRef(null)

  const messagesEndRef = useRef(null)
  // The chat's scrolling box — auto-scroll moves this, not the page
  const chatScrollRef = useRef(null)
  const textareaRef = useRef(null)

  const allAttemptsRef = useRef(null)


  const toggleVoiceMode = (val) => {
    const next = typeof val === 'function' ? val(voiceMode) : val
    setVoiceMode(next)
    try {
      localStorage.setItem('mentora_voice_mode', String(next))
    } catch {
      // silent
    }
  }
  // ─── JOIN SESSION ON MOUNT ───
  useEffect(() => {
    if (id) {
      joinExistingSession(id, { focus: isPracticeVisit })
    }
    return () => {
      resetSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ─── RESTORE A REJECTED MESSAGE ───
  // The box is cleared on send; if the server rejected the message
  // (e.g. rate limited), put the text back — unless the user has
  // already started typing something new.
  useEffect(() => {
    if (!unsentMessage) return
    const timer = setTimeout(() => {
      setInput((current) => (current.trim() ? current : unsentMessage))
      clearUnsentMessage()
    }, 0)
    return () => clearTimeout(timer)
  }, [unsentMessage, clearUnsentMessage])

  // ─── AUTO-SCROLL ───
  // Opening a session jumps straight to the newest message before the
  // first paint (a layout effect), so the chat never shows its top and
  // then races down. Only messages arriving after that scroll smoothly.
  const scrolledSessionIdRef = useRef(null)
  useLayoutEffect(() => {
    const container = chatScrollRef.current
    if (!container || messages.length === 0) return
    const sessionId = currentSession?._id
    const isFirstScroll = scrolledSessionIdRef.current !== sessionId
    // To the box's very bottom (past its padding), so the newest message
    // sits right above the message box. 'instant' also overrides the
    // site-wide smooth scrolling in index.css.
    // While the reply is still appearing the text grows every frame, so
    // smooth scrolling would queue dozens of animations against itself
    const isTyping = streamingMessage.length > 0
    container.scrollTo({
      top: container.scrollHeight,
      behavior: isFirstScroll || isTyping ? 'instant' : 'smooth',
    })
    scrolledSessionIdRef.current = sessionId
  }, [messages, streamingMessage, currentSession?._id])

  // ─── AUTO-GROW TEXTAREA ───
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // ─── TRACK LATEST AI MESSAGE FOR TTS ───
  // Only fires when a genuinely new assistant message
  // arrives — not when voice mode is toggled on
  const hasInitializedVoiceRef = useRef(false)

  useEffect(() => {
    if (!voiceMode) {
      hasInitializedVoiceRef.current = false
      return
    }

    // Wait until messages have actually loaded before deciding
    // what counts as "already seen" — on refresh, messages
    // arrive async via socket, so don't act on an empty array
    if (messages.length === 0) return

    // First time voice mode is active AND messages exist —
    // mark current last message as already seen, don't speak it
    if (!hasInitializedVoiceRef.current) {
      hasInitializedVoiceRef.current = true
      const lastMsg = messages[messages.length - 1]
      if (lastMsg && lastMsg.role === 'assistant') {
        lastSpokenIdRef.current = lastMsg._id || lastMsg.content
      }
      return
    }

    // After initialization — only speak genuinely new messages
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    const msgId = lastMsg._id || lastMsg.content
    if (msgId === lastSpokenIdRef.current) return
    lastSpokenIdRef.current = msgId
    setTimeout(() => setLatestAiMessage(lastMsg.content), 0)
  }, [messages, voiceMode])

  // A score error belongs to the panel — drop it once the panel closes
  useEffect(() => {
    if (!showScorePanel) clearScoreError()
  }, [showScorePanel, clearScoreError])

  useEffect(() => {
    if (showScorePanel && scrollToAttempts) {
      // Small delay lets the slide-in animation start first
      const timer = setTimeout(() => {
        allAttemptsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setScrollToAttempts(false)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [showScorePanel, scrollToAttempts])
  
  // Concepts the AI judges as already taught (from the session memory)
  const isConceptCovered = (concept) => coveredConcepts.includes(concept)
  const coveredCount = notes?.extractedConcepts
    ? notes.extractedConcepts.filter(isConceptCovered).length
    : 0

  const isEnded = currentSession?.status === 'completed'
  const userMessageCount = messages.filter((m) => m.role === 'user').length
  // Waiting on the AI: from the moment a message is sent until the
  // reply has finished streaming. The input is read-only meanwhile.
  const isAwaitingReply = isSending || isStreaming
  // Anything sent while offline would be rejected after reconnecting
  // (see connectionStatus in sessionStore) — lock input until we're back
  const isConnected = connectionStatus === 'connected'
  const isInputLocked = isAwaitingReply || !isConnected

  // ─── SCORING AVAILABILITY ───
  // Both rules mirror the backend guards in request_score.
  const messagesNeededToScore = Math.max(0, MIN_USER_MESSAGES_TO_SCORE - userMessageCount)
  // A new score needs new explanation since the last one. Older
  // scores saved before messageCountAtScore existed are rescorable.
  const hasNewSinceLastScore =
    !latestScore ||
    latestScore.messageCountAtScore == null ||
    userMessageCount > latestScore.messageCountAtScore
  const canRequestScore = messagesNeededToScore === 0 && hasNewSinceLastScore
  const scoreHint =
    messagesNeededToScore > 0
      ? `Send at least ${MIN_USER_MESSAGES_TO_SCORE} messages to get a score — ${messagesNeededToScore} more to go.`
      : !hasNewSinceLastScore
      ? 'Explain more to rescore — a new score needs something new since the last one.'
      : null
  // The sidebar / top-bar button only opens the score panel, so it's
  // disabled only while there's nothing to show and nothing to score yet
  const isScoreButtonDisabled = !latestScore && messagesNeededToScore > 0

  // ─── HANDLERS ───
  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isInputLocked || isEnded) return
    sendMessage(trimmed)
    setInput('')
    // Keep the cursor in the box even when sending via the button
    textareaRef.current?.focus()
  }

  // When the input unlocks (AI reply finished, or connection is back),
  // put the cursor back in the box — unless the user deliberately
  // moved focus somewhere else meanwhile (e.g. opened the score panel).
  const wasInputLockedRef = useRef(false)
  useEffect(() => {
    if (isInputLocked) {
      wasInputLockedRef.current = true
      return
    }
    if (!wasInputLockedRef.current) return
    wasInputLockedRef.current = false
    const active = document.activeElement
    if (!active || active === document.body || active === textareaRef.current) {
      textareaRef.current?.focus()
    }
  }, [isInputLocked])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEndSession = async () => {
    setIsEnding(true)
    endSession()

    // Ending now scores whatever was taught since the last score, so it
    // can take a few seconds. The confirm modal stays on "Ending..."
    // until session_ended arrives (see the effect below); this only
    // unsticks the button if the reply never comes.
    setTimeout(() => setIsEnding(false), 30000)
  }

  // Navigate to Dashboard only once the badge queue is empty AND we
  // were in the middle of ending a session — this fires right after
  // the confirm modal closes (isEnding flips false) if there's no
  // badge to show, or waits until the last badge is dismissed if
  // there is one.

  // ─── LOADING STATE ───
  if (isJoining && !currentSession) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* A turning ring, not a pulsing logo — the pulse is kept for the
              things on this page that are genuinely live. */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-line border-t-accent animate-spin" />
            <GraduationCap size={20} className="text-accent" />
          </div>
          <p className="text-muted text-sm">Joining session...</p>
        </div>
      </div>
    )
  }

 // ─── ERROR STATE ───
  if (error && !currentSession) {
    // Special-case: the backend rejects join_session for completed
    // sessions with this exact message. Rather than show a generic
    // error, point the user to where they can actually view it —
    // the History page's read-only detail panel.
    const isEndedSession = error === 'Session has ended'

    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-surface border border-line rounded-lg p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-lg bg-danger-soft border border-danger/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-danger" />
          </div>
          <h3 className="text-ink font-semibold mb-2">
            {isEndedSession ? 'This session has ended' : "Couldn't load session"}
          </h3>
          <p className="text-muted text-sm mb-6">
            {isEndedSession
              ? 'Completed sessions can no longer be continued, but you can still review the transcript and scores from your session history.'
              : error}
          </p>
          <button
            onClick={() => navigate(isEndedSession ? '/history' : '/dashboard')}
            className="px-5 py-2.5 rounded-lg font-semibold  text-sm"
          >
            {isEndedSession ? 'View in History' : 'Back to Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-bg flex overflow-hidden">
      <ThemeToggle floating />

      {/* ─── LEFT INFO PANEL (desktop only) ─── */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 border-r border-line bg-surface flex-col p-6 h-screen overflow-y-auto">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-2 text-ink hover:text-accent transition-colors text-sm mb-8 w-fit"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4">
          <GraduationCap size={22} className="text-on-accent" />
        </div>

        <h1 className="text-ink font-semibold text-lg leading-snug mb-2">
          {currentSession?.topic || 'Loading...'}
        </h1>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit mb-6 ${
            isEnded
              ? 'bg-surface-2 text-muted'
              : 'bg-success-soft text-success'
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isEnded ? 'bg-muted' : 'bg-success animate-pulse'
            }`}
          />
          {isEnded ? 'Completed' : 'Active session'}
        </span>

        <div className="space-y-3 mb-8">

  {/* Practice focus card — session started from "Practise this gap" */}
  {focusGap && (
    <div
      className={`rounded-lg p-4 border ${
        focusGap.resolved
          ? 'bg-success-soft border-success/30'
          : 'bg-bg border-accent/30'
      }`}
    >
      <p
        className={`text-xs font-semibold mb-1 ${
          focusGap.resolved ? 'text-success' : 'text-accent'
        }`}
      >
        {focusGap.resolved ? 'Gap closed ✓' : 'Practising a gap'}
      </p>
      <p className="text-muted text-xs leading-relaxed">{focusGap.text}</p>
    </div>
  )}

  {/* Notes scope card */}
{hasNotes && (
  <div
    onClick={() => setShowNotesModal(true)}
    className="bg-bg border border-line rounded-lg p-4 cursor-pointer hover:border-accent transition-colors duration-200"
  >
    <div className="flex items-center justify-between gap-2 mb-2">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-accent" />
        <p className="text-accent text-xs font-medium">
          Testing from your notes
        </p>
      </div>
      <span className="text-muted text-xs flex-shrink-0">
        {coveredCount}/{notes.extractedConcepts.length} covered
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {notes.extractedConcepts.slice(0, 6).map((c, i) => (
        <span
          key={i}
          className={`px-2 py-0.5 rounded-full text-xs border inline-flex items-center gap-1 ${
            isConceptCovered(c)
              ? 'bg-success-soft text-success border-success/30'
              : 'bg-accent-soft text-accent border-accent/30'
          }`}
        >
          {isConceptCovered(c) && <Check size={10} />}
          {c}
        </span>
      ))}
      {notes.extractedConcepts.length > 6 && (
        <span className="px-2 py-0.5 rounded-full bg-surface-2 text-muted text-xs">
          +{notes.extractedConcepts.length - 6} more
        </span>
      )}
    </div>
  </div>
)}
          

          {latestScore && (
            <div className="bg-bg border border-line rounded-lg p-4">
              <p className="text-muted text-xs mb-2">Latest Scores</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'ACC', value: latestScore.accuracy },
                  { label: 'CLR', value: latestScore.clarity },
                  { label: 'CMP', value: latestScore.completeness },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-muted text-xs mb-0.5">{s.label}</p>
                    <p className={`text-sm font-semibold ${getScoreColor(s.value)}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past scores — max 2 shown, view all opens score panel */}
          {scores.length > 1 && (
            <div className="bg-bg border border-line rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted text-xs">Past Scores</p>
                {scores.length > 3 && (
                  <button
                    onClick={() => {
                      setScrollToAttempts(true)
                      setShowScorePanel(true)
                    }}
                    className="text-xs text-accent hover:text-accent transition-colors"
                  >
                    View all
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {scores.slice(0, -1).reverse().slice(0, 2).map((s, i) => (
                  <div key={i} className={i > 0 ? 'pt-3 border-t border-line' : ''}>
                    <p className="text-muted text-xs mb-2">{formatDate(s.scoredAt)}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'ACC', value: s.accuracy },
                        { label: 'CLR', value: s.clarity },
                        { label: 'CMP', value: s.completeness },
                      ].map((sc) => (
                        <div key={sc.label}>
                          <p className="text-muted text-xs mb-0.5">{sc.label}</p>
                          <p className={`text-sm font-semibold ${getScoreColor(sc.value)}`}>
                            {sc.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {scores.length > 3 && (
                  <button
                    onClick={() => {
                      setScrollToAttempts(true)
                      setShowScorePanel(true)
                    }}
                    className="w-full text-xs text-muted hover:text-accent transition-colors pt-2 border-t border-line"
                  >
                    + {scores.length - 3} more — view all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          {/* Voice/text toggle */}
          <button
            onClick={() => toggleVoiceMode((v) => !v)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              voiceMode
                ? 'bg-accent-soft text-accent hover:bg-accent/15'
                : 'bg-surface-2 text-muted hover:text-ink hover:bg-surface-2'
            }`}
          >
            {voiceMode ? (
              <><MessageSquare size={16} />Switch to Text</>
            ) : (
              <><Mic size={16} />Switch to Voice</>
            )}
          </button>

          <button
            onClick={() => setShowScorePanel(true)}
            disabled={isScoreButtonDisabled}
            title={isScoreButtonDisabled ? scoreHint : undefined}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-soft text-accent hover:bg-accent/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            {latestScore ? 'View Score' : 'Get Score'}
          </button>
          {isScoreButtonDisabled && !isEnded && (
            <p className="text-muted text-xs text-center px-1">{scoreHint}</p>
          )}
          {!isEnded && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-2 text-muted hover:text-danger hover:bg-danger-soft transition-colors"
            >
              <Flag size={16} />
              End Session
            </button>
          )}
        </div>
      </aside>

      {/* ─── MAIN CHAT COLUMN ─── */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">

        {/* ─── TOP BAR (mobile + tablet) ─── */}
        {!voiceMode && (
        <header className="lg:hidden flex-shrink-0 border-b border-line bg-surface">
          <div className="px-4 py-3 pr-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(backTo)}
                className="text-muted hover:text-ink transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-ink font-semibold text-sm md:text-base truncate">
                  {currentSession?.topic || 'Loading...'}
                </p>
               <div className="flex items-center gap-2">
  <p className="text-muted text-xs">
    {isEnded ? 'Session completed' : 'Active session'}
  </p>
  {focusGap && (
    <span
      title={focusGap.text}
      className={`text-xs ${focusGap.resolved ? 'text-success' : 'text-accent'}`}
    >
      {focusGap.resolved ? 'Gap closed ✓' : 'Practising a gap'}
    </span>
  )}
  {hasNotes && (
  <button
    onClick={() => setShowNotesModal(true)}
    className="flex items-center gap-1 text-accent text-xs hover:text-accent-hover transition-colors"
  >
    <FileText size={10} />
    From notes
  </button>
)}
</div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Voice/text toggle */}
              <button
                onClick={() => toggleVoiceMode((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  voiceMode
                    ? 'bg-accent-soft text-accent'
                    : 'bg-surface-2 text-muted hover:text-ink'
                }`}
              >
                {voiceMode ? <MessageSquare size={16} /> : <Mic size={16} />}
              </button>

              <button
                onClick={() => setShowScorePanel(true)}
                disabled={isScoreButtonDisabled}
                title={isScoreButtonDisabled ? scoreHint : undefined}
                aria-label={isScoreButtonDisabled ? scoreHint : 'Score'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium bg-accent-soft text-accent hover:bg-accent/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BarChart3 size={16} />
                <span className="hidden sm:inline">
                  {latestScore ? 'Score' : 'Get Score'}
                </span>
              </button>

              {!isEnded && (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium bg-surface-2 text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                >
                  <Flag size={16} />
                  <span className="hidden sm:inline">End</span>
                </button>
              )}
            </div>
          </div>
        </header>
        )}

        {/* ─── CONNECTION BANNER ─── */}
        <AnimatePresence>
          {currentSession && CONNECTION_BANNER[connectionStatus] && (
            <motion.div
              role="status"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0 bg-highlight-soft border-b border-highlight/30"
            >
              <div className="px-4 py-2 flex items-center justify-between gap-2 text-highlight text-sm">
                <div className="flex items-center gap-2">
                  {connectionStatus === 'failed' ? (
                    <WifiOff size={14} className="flex-shrink-0" />
                  ) : (
                    <Loader2 size={14} className="flex-shrink-0 animate-spin" />
                  )}
                  {CONNECTION_BANNER[connectionStatus]}
                </div>
                {connectionStatus === 'failed' && (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1 text-highlight hover:text-highlight transition-colors flex-shrink-0 text-xs font-medium"
                  >
                    <RefreshCw size={12} />
                    Reload
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── ERROR BANNER ─── */}
        <AnimatePresence>
          {error && currentSession && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0 bg-danger-soft border-b border-danger/30"
            >
              <div className="px-4 py-2 flex items-center justify-between gap-2 text-danger text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {error}
                </div>
                <button
                  onClick={clearError}
                  className="text-danger/70 hover:text-danger transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── CHAT AREA / VOICE MODE ─── */}
        {/* Once the session is ended the wrap-up replaces the chat:
            final score, gaps, and the key points reveal */}
        {sessionSummary ? (
          <SessionSummary
            summary={sessionSummary}
            topic={currentSession?.topic}
            onBackToDashboard={() => navigate('/dashboard')}
            onViewHistory={() => navigate('/history')}
          />
        ) : voiceMode ? (
         <VoiceMode
            messages={messages}
            isStreaming={isStreaming}
            streamingMsg={streamingMessage}
            onSendMessage={sendMessage}
            isEnded={isEnded}
            latestAiMessage={latestAiMessage}
            isScoreButtonDisabled={isScoreButtonDisabled}
            scoreHint={scoreHint}
            isConnected={isConnected}
            isSending={isSending}
            canRetry={canRetry}
            onRetry={retryResponse}
            onSwitchToText={() => toggleVoiceMode(false)}
            onOpenScore={() => setShowScorePanel(true)}
            onEndSession={() => setShowEndConfirm(true)}
            onNavigateBack={() => navigate(backTo)}
            topic={currentSession?.topic}
            latestScore={latestScore}
            sessionError={error}
            hasNotes={hasNotes}
            
          />
        ) : (
          <>
            {/* ─── CHAT AREA ─── */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

                {messages.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-lg bg-accent-soft flex items-center justify-center mb-4">
                      <GraduationCap size={24} className="text-accent" />
                    </div>
                    <h3 className="text-ink font-semibold mb-2">
                      Teach me about {currentSession?.topic}
                    </h3>
                    <p className="text-muted text-sm max-w-sm">
                      Start explaining the concept like you're teaching someone who's never heard of it. I'll ask questions as I go.
                    </p>
                    <p className="text-muted text-xs mt-3">
                      You can get a score after {MIN_USER_MESSAGES_TO_SCORE} messages.
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div
                    key={msg._id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <StudentAvatar />
                    )}
                    <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-md">
                      <div
                        className={`px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          msg.role === 'user'
                            ? 'bg-surface-2 text-ink'
                            : 'bg-surface-2/80 text-ink border border-line/40'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.createdAt && (
                        <span
                          className={`text-muted text-xs ${
                            msg.role === 'user' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <span className="text-muted text-xs pt-2 flex-shrink-0">You</span>
                    )}
                  </motion.div>
                ))}

                {/* The last message got no reply — offer to ask again */}
                {canRetry && !isAwaitingReply && !isEnded && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2 py-2"
                  >
                    <p className="text-muted text-xs text-center">
                      The AI student didn't reply to your last message.
                    </p>
                    <button
                      onClick={retryResponse}
                      disabled={!isConnected}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface-2 text-ink hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} />
                      Retry
                    </button>
                  </motion.div>
                )}

                {isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 justify-start"
                  >
                    <StudentAvatar />
                    {streamingMessage ? (
                      <div className="max-w-[85%] sm:max-w-md px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap break-words bg-surface-2/80 text-ink border border-line/40">
                        {streamingMessage}
                        <span className="inline-block w-1.5 h-4 bg-accent ml-1 animate-pulse align-middle" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-accent text-sm px-4 py-3">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        AI student is thinking...
                      </div>
                    )}
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* The student said it understands — offer to score or carry
                on. Never scores by itself: the teacher decides. */}
            {studentUnderstood && !isEnded && (
              <div className="flex-shrink-0 border-t border-success/30 bg-success-soft">
                <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <p className="text-sm text-ink flex items-center gap-2 flex-1 min-w-0">
                    <CheckCircle2 size={15} className="text-success flex-shrink-0" />
                    The AI student says it gets it. Score now, or keep going?
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setShowScorePanel(true)
                        if (!isScoreButtonDisabled) requestScore()
                        dismissUnderstood()
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold "
                    >
                      Score now
                    </button>
                    <button
                      onClick={dismissUnderstood}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      Keep going
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* ─── INPUT BAR ─── */}
            <div className="flex-shrink-0 border-t border-line bg-surface">
              <div className="max-w-3xl mx-auto px-4 py-3">
                {isEnded ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-muted text-sm">
                    <CheckCircle2 size={16} className="text-success" />
                    This session has ended. Start a new session to continue teaching this topic.
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        !isConnected
                          ? 'Waiting for connection...'
                          : isAwaitingReply
                          ? 'AI student is replying...'
                          : 'Explain the concept...'
                      }
                      rows={1}
                      maxLength={2000}
                      // readOnly rather than disabled: a disabled field
                      // loses focus, which kicked the cursor out of the
                      // box on every send. readOnly blocks typing but
                      // keeps the cursor here for when the reply ends.
                      readOnly={isInputLocked}
                      aria-busy={isInputLocked}
                      className={`input flex-1 resize-none text-sm ${
                        isInputLocked ? 'opacity-50 cursor-wait' : ''
                      }`}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isInputLocked}
                      className="btn-primary flex-shrink-0 w-11 h-11 px-0 py-0 flex items-center justify-center"
                    >
                      {isAwaitingReply ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── SCORE PANEL ─── */}
      <AnimatePresence>
        {showScorePanel && !sessionSummary && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScorePanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-surface border-l border-line z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-ink font-semibold text-lg">Mastery Score</h2>
                  <XpInfo align="left" />
                </div>
                <button
                  onClick={() => setShowScorePanel(false)}
                  className="text-muted hover:text-ink transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                {!isEnded && (
                  <div className="space-y-2">
                    <button
                      onClick={requestScore}
                      disabled={isScoring || !canRequestScore || !isConnected}
                      className="w-full py-3 rounded-lg font-semibold  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      {isScoring ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Scoring your explanation...
                        </>
                      ) : (
                        <>
                          <BarChart3 size={16} />
                          {latestScore ? 'Request New Score' : 'Score My Explanation'}
                        </>
                      )}
                    </button>
                    {!isScoring && scoreError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-danger text-xs"
                      >
                        <AlertCircle size={14} className="flex-shrink-0 mt-px" />
                        <span className="flex-1">{scoreError}</span>
                        <button
                          onClick={clearScoreError}
                          aria-label="Dismiss"
                          className="text-danger/70 hover:text-danger transition-colors flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    {!isScoring && !scoreError && scoreHint && (
                      <p className="text-muted text-xs text-center">{scoreHint}</p>
                    )}
                  </div>
                )}

                {latestScore ? (
                  <div className="space-y-5">
                    <div className="bg-bg border border-line rounded-lg p-4 space-y-4">
                      <p className="text-muted text-xs mb-1">Latest result</p>
                      {[
                        { label: 'Accuracy', value: latestScore.accuracy },
                        { label: 'Clarity', value: latestScore.clarity },
                        { label: 'Completeness', value: latestScore.completeness },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-ink">{s.label}</span>
                            <span className={`font-semibold ${getScoreColor(s.value)}`}>
                              {s.value}/10
                            </span>
                          </div>
                          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(s.value / 10) * 100}%` }}
                              transition={{ duration: 0.6 }}
                              className={`h-full rounded-full ${getScoreBarColor(s.value)}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {latestScore.feedback && (
                      <div>
                        <p className="text-ink font-semibold text-sm mb-2">Feedback</p>
                        <p className="text-muted text-sm leading-relaxed bg-bg border border-line rounded-lg p-4">
                          {latestScore.feedback}
                        </p>
                      </div>
                    )}

                    {latestScore.gaps && latestScore.gaps.length > 0 && (
                      <div>
                        <p className="text-ink font-semibold text-sm mb-3">Gaps found</p>
                        <div className="space-y-2.5">
                          {latestScore.gaps.map((gap, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-highlight mt-1.5 flex-shrink-0" />
                              <span className="text-muted text-sm">{gap}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All attempts */}
                    <div ref={allAttemptsRef}>
                      <p className="text-ink font-semibold text-sm mb-3">
                        All attempts ({scores.length})
                      </p>
                      <div className="space-y-2">
                        {[...scores].reverse().map((s, i) => {
                          const avg = Math.round(
                            (s.accuracy + s.clarity + s.completeness) / 3
                          )
                          const isLatest = i === 0
                          return (
                            <div
                              key={i}
                              className={`rounded-lg px-4 py-3 border ${
                                isLatest
                                  ? 'bg-accent-soft border-accent/30'
                                  : 'bg-bg border-line'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-muted text-xs">
                                  {formatDate(s.scoredAt)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {isLatest && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-soft text-accent font-medium">
                                      latest
                                    </span>
                                  )}
                                  <span className={`text-sm font-semibold ${getScoreColor(avg)}`}>
                                    {avg}/10 avg
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                  { label: 'ACC', value: s.accuracy },
                                  { label: 'CLR', value: s.clarity },
                                  { label: 'CMP', value: s.completeness },
                                ].map((sc) => (
                                  <div key={sc.label}>
                                    <p className="text-muted text-xs mb-0.5">{sc.label}</p>
                                    <p className={`text-sm font-semibold ${getScoreColor(sc.value)}`}>
                                      {sc.value}/10
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-lg bg-accent-soft flex items-center justify-center mx-auto mb-3">
                      <BarChart3 size={20} className="text-accent" />
                    </div>
                    <p className="text-muted text-sm">
                      No score yet. Explain a bit more, then request a score to see how well you understand {currentSession?.topic}.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── END SESSION CONFIRM MODAL ─── */}
      <AnimatePresence>
        {showEndConfirm && !sessionSummary && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !endInFlight && setShowEndConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="bg-surface border border-line rounded-lg p-6 md:p-8 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-danger-soft border border-danger/30 flex items-center justify-center flex-shrink-0">
                      <Flag size={18} className="text-danger" />
                    </div>
                    <h2 className="text-lg font-semibold text-ink">End session?</h2>
                  </div>
                  <button
                    onClick={() => !endInFlight && setShowEndConfirm(false)}
                    className="text-muted hover:text-ink transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-muted text-sm leading-relaxed mb-6">
                  This session will be marked as completed and you won't be able to continue teaching this topic in it. You can always start a new session.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    disabled={endInFlight}
                    className="btn-secondary flex-1 py-2.5 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEndSession}
                    disabled={endInFlight || !isConnected}
                    className="btn-danger flex-1 py-2.5 flex items-center justify-center gap-2 text-sm"
                  >
                    {endInFlight ? (
                      <><Loader2 size={15} className="animate-spin" />Ending...</>
                    ) : (
                      <>End session</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── NOTES MODAL ─── */}
<AnimatePresence>
  {showNotesModal && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowNotesModal(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
<div className="bg-surface border border-line rounded-lg p-6 w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-accent" />
              <h2 className="text-ink font-semibold text-lg">Notes Concepts</h2>
            </div>
            <button
              onClick={() => setShowNotesModal(false)}
              className="text-muted hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* File name */}
          {notes?.fileName && (
            <p className="text-muted text-xs mb-4">
              From: {notes.fileName}
            </p>
          )}

          {/* All concepts */}
<div className="flex flex-col gap-2 overflow-y-auto flex-1">
            {notes?.extractedConcepts.map((c, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                  isConceptCovered(c)
                    ? 'bg-success-soft border-success/30'
                    : 'bg-bg border-line'
                }`}
              >
                {isConceptCovered(c) ? (
                  <Check size={14} className="text-success w-5 flex-shrink-0" />
                ) : (
                  <span className="text-accent text-xs font-semibold w-5 flex-shrink-0">
                    {i + 1}
                  </span>
                )}
                <span
                  className={`text-sm ${isConceptCovered(c) ? 'text-success' : 'text-ink'}`}
                >
                  {c}
                </span>
                {isConceptCovered(c) && (
                  <span className="ml-auto text-success text-xs flex-shrink-0">covered</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-muted text-xs mt-4 text-center">
            {coveredCount > 0
              ? `${coveredCount} of ${notes?.extractedConcepts.length} covered so far — the AI will keep working through the rest`
              : 'The AI will quiz you on these concepts during this session'}
          </p>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>


      {/* ─── SCORE / XP TOAST ─── */}
      <AnimatePresence>
        {scoreToast && (
          <motion.div
            key={scoreToast.id}
            role="status"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 left-6 sm:left-auto sm:w-80 z-[60] rounded-lg px-5 py-4 shadow-2xl border bg-surface ${
              scoreToast.xpEarned > 0 ? 'border-highlight/40' : 'border-line'
            }`}
          >
            <div className="flex items-start gap-3">
              <Zap
                size={18}
                className={`mt-0.5 flex-shrink-0 ${
                  scoreToast.xpEarned > 0 ? 'text-highlight' : 'text-muted'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-ink font-semibold text-sm">{getScoreToastTitle(scoreToast)}</p>
                <p className="text-muted text-xs leading-relaxed mt-1">
                  {getScoreToastReason(scoreToast)}
                </p>

                {scoreToast.deltas.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {scoreToast.deltas.map((d) => (
                      <li key={d.label} className="flex items-center justify-between text-xs">
                        <span className="text-muted">{d.label}</span>
                        <span className={d.to > d.from ? 'text-success' : 'text-danger'}>
                          {d.from} → {d.to} {d.to > d.from ? '▲' : '▼'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {!scoreToast.isFirstScore && scoreToast.deltas.length === 0 && (
                  <p className="text-muted text-xs mt-2">
                    Same accuracy, clarity and completeness as your last score.
                  </p>
                )}

                <p className="text-muted text-xs mt-3">Total: {scoreToast.totalXp} XP</p>
              </div>
              <button
                onClick={clearScoreToast}
                aria-label="Dismiss"
                className="text-muted hover:text-ink transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Session