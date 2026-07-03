import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import useSessionStore from '@/store/sessionStore'
import VoiceMode from '@/components/session/VoiceMode'

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const getScoreColor = (score) => {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  return 'text-red-400'
}

const getScoreBarColor = (score) => {
  if (score >= 8) return 'from-green-500 to-cyan-500'
  if (score >= 6) return 'from-yellow-500 to-orange-500'
  return 'from-red-500 to-pink-500'
}

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

  const {
    currentSession,
    messages,
    streamingMessage,
    isStreaming,
    scores,
    latestScore,
    isScoring,
    isJoining,
    error,
    notes,
    sendMessage,
    requestScore,
    endSession,
    joinExistingSession,
    resetSession,
    clearError,
    xpToast,
    clearXpToast,
  } = useSessionStore()

  const [input, setInput] = useState('')
  const [showScorePanel, setShowScorePanel] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
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
      joinExistingSession(id)
    }
    return () => {
      resetSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ─── AUTO-SCROLL ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

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
  
  const isEnded = currentSession?.status === 'completed'
  const userMessageCount = messages.filter((m) => m.role === 'user').length
  const showScoreButton = userMessageCount >= 2 || latestScore !== null

  // ─── HANDLERS ───
  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming || isEnded) return
    sendMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEndSession = async () => {
    setIsEnding(true)
    endSession()
    setTimeout(() => {
      setIsEnding(false)
      setShowEndConfirm(false)
      navigate('/dashboard')
    }, 1200)
  }

  // ─── LOADING STATE ───
  if (isJoining && !currentSession) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center animate-pulse">
            <GraduationCap size={24} className="text-white" />
          </div>
          <p className="text-slate-500 text-sm">Joining session...</p>
        </div>
      </div>
    )
  }

  // ─── ERROR STATE ───
  if (error && !currentSession) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex items-center justify-center px-4">
        <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Couldn't load session</h3>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#080D1A] flex overflow-hidden">

      {/* ─── LEFT INFO PANEL (desktop only) ─── */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 border-r border-slate-800 bg-[#0D1426] flex-col p-6 h-screen overflow-y-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors text-sm mb-8 w-fit"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mb-4">
          <GraduationCap size={22} className="text-white" />
        </div>

        <h1 className="text-white font-bold text-lg leading-snug mb-2">
          {currentSession?.topic || 'Loading...'}
        </h1>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit mb-6 ${
            isEnded
              ? 'bg-slate-700 text-slate-400'
              : 'bg-green-500/20 text-green-400'
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isEnded ? 'bg-slate-500' : 'bg-green-400 animate-pulse'
            }`}
          />
          {isEnded ? 'Completed' : 'Active session'}
        </span>

        <div className="space-y-3 mb-8">

  {/* Notes scope card */}
{hasNotes && (
  <div
    onClick={() => setShowNotesModal(true)}
    className="bg-[#080D1A] border border-cyan-500/20 rounded-xl p-4 cursor-pointer hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-200"
  >
    <div className="flex items-center gap-2 mb-2">
      <FileText size={14} className="text-cyan-400" />
      <p className="text-cyan-400 text-xs font-medium">
        Testing from your notes
      </p>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {notes.extractedConcepts.slice(0, 6).map((c, i) => (
        <span
          key={i}
          className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20"
        >
          {c}
        </span>
      ))}
      {notes.extractedConcepts.length > 6 && (
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">
          +{notes.extractedConcepts.length - 6} more
        </span>
      )}
    </div>
  </div>
)}
          

          {latestScore && (
            <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-2">Latest Scores</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'ACC', value: latestScore.accuracy },
                  { label: 'CLR', value: latestScore.clarity },
                  { label: 'CMP', value: latestScore.completeness },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-slate-600 text-xs mb-0.5">{s.label}</p>
                    <p className={`text-sm font-bold ${getScoreColor(s.value)}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past scores — max 2 shown, view all opens score panel */}
          {scores.length > 1 && (
            <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-500 text-xs">Past Scores</p>
                {scores.length > 3 && (
                  <button
                    onClick={() => {
                      setScrollToAttempts(true)
                      setShowScorePanel(true)
                    }}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    View all
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {scores.slice(0, -1).reverse().slice(0, 2).map((s, i) => (
                  <div key={i} className={i > 0 ? 'pt-3 border-t border-slate-800' : ''}>
                    <p className="text-slate-600 text-xs mb-2">{formatDate(s.scoredAt)}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'ACC', value: s.accuracy },
                        { label: 'CLR', value: s.clarity },
                        { label: 'CMP', value: s.completeness },
                      ].map((sc) => (
                        <div key={sc.label}>
                          <p className="text-slate-600 text-xs mb-0.5">{sc.label}</p>
                          <p className={`text-sm font-bold ${getScoreColor(sc.value)}`}>
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
                    className="w-full text-xs text-slate-500 hover:text-violet-400 transition-colors pt-2 border-t border-slate-800"
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
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              voiceMode
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {voiceMode ? (
              <><MessageSquare size={16} />Switch to Text</>
            ) : (
              <><Mic size={16} />Switch to Voice</>
            )}
          </button>

          {showScoreButton && (
            <button
              onClick={() => setShowScorePanel(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
            >
              <BarChart3 size={16} />
              {latestScore ? 'View Score' : 'Get Score'}
            </button>
          )}
          {!isEnded && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Flag size={16} />
              End Session
            </button>
          )}
        </div>
      </aside>

      {/* ─── MAIN CHAT COLUMN ─── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* ─── TOP BAR (mobile + tablet) ─── */}
        {!voiceMode && (
        <header className="lg:hidden flex-shrink-0 border-b border-slate-800 bg-[#0D1426]">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm md:text-base truncate">
                  {currentSession?.topic || 'Loading...'}
                </p>
               <div className="flex items-center gap-2">
  <p className="text-slate-500 text-xs">
    {isEnded ? 'Session completed' : 'Active session'}
  </p>
  {hasNotes && (
  <button
    onClick={() => setShowNotesModal(true)}
    className="flex items-center gap-1 text-cyan-400 text-xs hover:text-cyan-300 transition-colors"
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors ${
                  voiceMode
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {voiceMode ? <MessageSquare size={16} /> : <Mic size={16} />}
              </button>

              {showScoreButton && (
                <button
                  onClick={() => setShowScorePanel(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
                >
                  <BarChart3 size={16} />
                  <span className="hidden sm:inline">
                    {latestScore ? 'Score' : 'Get Score'}
                  </span>
                </button>
              )}

              {!isEnded && (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Flag size={16} />
                  <span className="hidden sm:inline">End</span>
                </button>
              )}
            </div>
          </div>
        </header>
        )}

        {/* ─── ERROR BANNER ─── */}
        <AnimatePresence>
          {error && currentSession && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex-shrink-0 bg-red-500/10 border-b border-red-500/20"
            >
              <div className="px-4 py-2 flex items-center justify-between gap-2 text-red-400 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {error}
                </div>
                <button
                  onClick={clearError}
                  className="text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── CHAT AREA / VOICE MODE ─── */}
        {voiceMode ? (
         <VoiceMode
            messages={messages}
            isStreaming={isStreaming}
            streamingMsg={streamingMessage}
            onSendMessage={sendMessage}
            isEnded={isEnded}
            latestAiMessage={latestAiMessage}
            showScoreButton={showScoreButton}
            onSwitchToText={() => toggleVoiceMode(false)}
            onOpenScore={() => setShowScorePanel(true)}
            onEndSession={() => setShowEndConfirm(true)}
            onNavigateBack={() => navigate('/dashboard')}
            topic={currentSession?.topic}
            latestScore={latestScore}
            sessionError={error}
            hasNotes={hasNotes}
            
          />
        ) : (
          <>
            {/* ─── CHAT AREA ─── */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

                {messages.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mb-4">
                      <GraduationCap size={24} className="text-violet-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">
                      Teach me about {currentSession?.topic}
                    </h3>
                    <p className="text-slate-400 text-sm max-w-sm">
                      Start explaining the concept like you're teaching someone who's never heard of it. I'll ask questions as I go.
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <GraduationCap size={14} className="text-white" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-md">
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'
                            : 'bg-slate-800/80 text-slate-200 border border-slate-700/40'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.createdAt && (
                        <span
                          className={`text-slate-600 text-xs ${
                            msg.role === 'user' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </span>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <span className="text-slate-500 text-xs pt-2 flex-shrink-0">You</span>
                    )}
                  </motion.div>
                ))}

                {isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={14} className="text-white" />
                    </div>
                    {streamingMessage ? (
                      <div className="max-w-[85%] sm:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words bg-slate-800/80 text-slate-200 border border-slate-700/40">
                        {streamingMessage}
                        <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1 animate-pulse align-middle" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-cyan-400 text-sm px-4 py-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        AI student is thinking...
                      </div>
                    )}
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ─── INPUT BAR ─── */}
            <div className="flex-shrink-0 border-t border-slate-800 bg-[#0D1426]">
              <div className="max-w-3xl mx-auto px-4 py-3">
                {isEnded ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-slate-500 text-sm">
                    <CheckCircle2 size={16} className="text-green-400" />
                    This session has ended. Start a new session to continue teaching this topic.
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Explain the concept..."
                      rows={1}
                      maxLength={2000}
                      disabled={isStreaming}
                      className="flex-1 resize-none px-4 py-3 rounded-xl bg-[#080D1A] border border-slate-700 hover:border-slate-600 focus:border-violet-500 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isStreaming}
                      className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isStreaming ? (
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
        {showScorePanel && (
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
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-[#0D1426] border-l border-slate-800 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
                <h2 className="text-white font-bold text-lg">Mastery Score</h2>
                <button
                  onClick={() => setShowScorePanel(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                {!isEnded && (
                  <button
                    onClick={requestScore}
                    disabled={isScoring || userMessageCount === 0}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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
                )}

                {latestScore ? (
                  <div className="space-y-5">
                    <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-4 space-y-4">
                      <p className="text-slate-500 text-xs mb-1">Latest result</p>
                      {[
                        { label: 'Accuracy', value: latestScore.accuracy },
                        { label: 'Clarity', value: latestScore.clarity },
                        { label: 'Completeness', value: latestScore.completeness },
                      ].map((s) => (
                        <div key={s.label}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-slate-300">{s.label}</span>
                            <span className={`font-bold ${getScoreColor(s.value)}`}>
                              {s.value}/10
                            </span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(s.value / 10) * 100}%` }}
                              transition={{ duration: 0.6 }}
                              className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(s.value)}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {latestScore.feedback && (
                      <div>
                        <p className="text-white font-semibold text-sm mb-2">Feedback</p>
                        <p className="text-slate-400 text-sm leading-relaxed bg-[#080D1A] border border-slate-800 rounded-xl p-4">
                          {latestScore.feedback}
                        </p>
                      </div>
                    )}

                    {latestScore.gaps && latestScore.gaps.length > 0 && (
                      <div>
                        <p className="text-white font-semibold text-sm mb-3">Gaps found</p>
                        <div className="space-y-2.5">
                          {latestScore.gaps.map((gap, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                              <span className="text-slate-400 text-sm">{gap}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All attempts */}
                    <div ref={allAttemptsRef}>
                      <p className="text-white font-semibold text-sm mb-3">
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
                              className={`rounded-xl px-4 py-3 border ${
                                isLatest
                                  ? 'bg-violet-600/10 border-violet-500/30'
                                  : 'bg-[#080D1A] border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 text-xs">
                                  {formatDate(s.scoredAt)}
                                </span>
                                <div className="flex items-center gap-2">
                                  {isLatest && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">
                                      latest
                                    </span>
                                  )}
                                  <span className={`text-sm font-bold ${getScoreColor(avg)}`}>
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
                                    <p className="text-slate-600 text-xs mb-0.5">{sc.label}</p>
                                    <p className={`text-sm font-bold ${getScoreColor(sc.value)}`}>
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
                    <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center mx-auto mb-3">
                      <BarChart3 size={20} className="text-violet-400" />
                    </div>
                    <p className="text-slate-400 text-sm">
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
        {showEndConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isEnding && setShowEndConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div className="bg-[#0D1426] border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                      <Flag size={18} className="text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">End session?</h2>
                  </div>
                  <button
                    onClick={() => !isEnding && setShowEndConfirm(false)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  This session will be marked as completed and you won't be able to continue teaching this topic in it. You can always start a new session.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    disabled={isEnding}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEndSession}
                    disabled={isEnding}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isEnding ? (
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
<div className="bg-[#0D1426] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-cyan-400" />
              <h2 className="text-white font-bold text-lg">Notes Concepts</h2>
            </div>
            <button
              onClick={() => setShowNotesModal(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* File name */}
          {notes?.fileName && (
            <p className="text-slate-500 text-xs mb-4">
              From: {notes.fileName}
            </p>
          )}

          {/* All concepts */}
<div className="flex flex-col gap-2 overflow-y-auto flex-1">
            {notes?.extractedConcepts.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#080D1A] border border-slate-800"
              >
                <span className="text-cyan-500 text-xs font-bold w-5 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-slate-200 text-sm">{c}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-600 text-xs mt-4 text-center">
            The AI will quiz you on these concepts during this session
          </p>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>

        {/* ─── XP TOAST ─── */}
      <AnimatePresence>
        {xpToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[60] bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl px-5 py-3 shadow-2xl shadow-orange-500/30 flex items-center gap-3"
          >
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-white font-bold text-sm">+{xpToast.amount} XP earned!</p>
              <p className="text-white/80 text-xs">Total: {xpToast.totalXp} XP</p>
            </div>
            <button
              onClick={clearXpToast}
              className="text-white/60 hover:text-white transition-colors ml-2"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Session