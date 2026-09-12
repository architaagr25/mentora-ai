import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, GraduationCap, Volume2, MessageSquare, BarChart3, Flag, ArrowLeft, Settings2, FileText } from 'lucide-react'
import useVoiceRecorder from '@/hooks/useVoiceRecorder'
import useSpeech from '@/hooks/useSpeech'
import api from '@/api'

const VOICE_STATE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing',
  WAITING: 'waiting',
  SPEAKING: 'speaking',
}

const Waveform = () => (
  <div className="flex items-center gap-1 h-8">
    {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 0.75, 0.45, 0.85].map((h, i) => (
      <motion.div
        key={i}
        className="w-1 rounded-full bg-gradient-to-t from-violet-600 to-cyan-400"
        animate={{
          scaleY: [h, h * 0.4, h * 1.2, h * 0.6, h],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.08,
          ease: 'easeInOut',
        }}
        style={{ height: '100%', originY: 1 }}
      />
    ))}
  </div>
)

const statusConfig = {
  [VOICE_STATE.IDLE]: { text: 'Tap to speak', color: 'text-slate-400' },
  [VOICE_STATE.RECORDING]: { text: 'Listening... tap to stop', color: 'text-red-400' },
  [VOICE_STATE.TRANSCRIBING]: { text: 'Transcribing...', color: 'text-cyan-400' },
  [VOICE_STATE.WAITING]: { text: 'AI student is thinking...', color: 'text-violet-400' },
  [VOICE_STATE.SPEAKING]: { text: 'AI student is speaking...', color: 'text-cyan-400' },
}

const VoiceMode = ({
  messages,
  isStreaming,
  streamingMsg,
  onSendMessage,
  isEnded,
  latestAiMessage,
  isScoreButtonDisabled,
  scoreHint,
  isConnected = true,
  onSwitchToText,
  onOpenScore,
  onEndSession,
  onNavigateBack,
  topic,
  latestScore,
  sessionError,
  hasNotes,
}) => {
  const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const spokenUpToRef = useRef('')
    const [failCount, setFailCount] = useState(0)
  const {
    error: recorderError,
    startRecording,
    stopRecording,
    cleanup,
  } = useVoiceRecorder()

const {
    speak,
    cancelSpeech,
    togglePause,
    isPaused,
    voices,
    selectedVoiceName,
    setVoice,
    previewVoice,
  } = useSpeech()
  const [showVoicePicker, setShowVoicePicker] = useState(false)
  // ─── AUTO SCROLL ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMsg])

  // ─── CLEANUP ON UNMOUNT ───
  useEffect(() => {
    return () => {
      cleanup()
      cancelSpeech()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (sessionError && (voiceState === VOICE_STATE.WAITING || voiceState === VOICE_STATE.SPEAKING)) {
      cancelSpeech()
      setTimeout(() => {
        setError(sessionError)
        setVoiceState(VOICE_STATE.IDLE)
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionError])

  // ─── CONNECTION LOST WHILE WAITING FOR A REPLY ───
  // No reply is coming on a dropped connection — go back to idle
  // instead of sitting on "AI student is thinking..." forever.
  // The reply (if the server finished it) appears once reconnected.
  useEffect(() => {
    if (!isConnected && voiceState === VOICE_STATE.WAITING) {
      setTimeout(() => setVoiceState(VOICE_STATE.IDLE), 0)
    }
  }, [isConnected, voiceState])

  // ─── SYNC VOICE STATE WITH STREAMING ───
  useEffect(() => {
    if (isStreaming && !streamingMsg) {
      setTimeout(() => setVoiceState(VOICE_STATE.WAITING), 0)
    }
    if (isStreaming && streamingMsg) {
      setTimeout(() => setVoiceState(VOICE_STATE.SPEAKING), 0)
    }
  }, [isStreaming, streamingMsg])

  // ─── SPEAK SENTENCES AS THEY STREAM IN ───
  useEffect(() => {
    if (!isStreaming || !streamingMsg) return

    const sentences = streamingMsg
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)

    if (sentences.length < 2) return

    const speakable = sentences.slice(0, -1).join(' ')

    if (speakable === spokenUpToRef.current) return

    const newPart = speakable.slice(spokenUpToRef.current.length).trim()
    if (!newPart) return

    spokenUpToRef.current = speakable
    speak(newPart)
  }, [streamingMsg, isStreaming, speak])

  // ─── SPEAK REMAINING TEXT WHEN STREAMING ENDS ───
  useEffect(() => {
    if (!latestAiMessage || isStreaming) return

    const remaining = latestAiMessage
      .slice(spokenUpToRef.current.length)
      .trim()

    spokenUpToRef.current = ''

    if (!remaining) {
      setTimeout(() => setVoiceState(VOICE_STATE.IDLE), 0)
      return
    }

    const speakRemaining = async () => {
      setTimeout(() => setVoiceState(VOICE_STATE.SPEAKING), 0)
      await speak(remaining)
      setVoiceState((prev) =>
        prev === VOICE_STATE.SPEAKING ? VOICE_STATE.IDLE : prev
      )
    }

    speakRemaining()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestAiMessage])

  
  // ─── MIC BUTTON HANDLER ───
  const handleMicTap = useCallback(async () => {
    setError(null)

    if (voiceState === VOICE_STATE.IDLE) {
      cancelSpeech()
      const started = await startRecording()
      if (started) {
        setVoiceState(VOICE_STATE.RECORDING)
      }
      return
    }

    if (voiceState === VOICE_STATE.RECORDING) {
      setVoiceState(VOICE_STATE.TRANSCRIBING)
      const result = await stopRecording()

      if (!result) {
        setError('Recording failed. Please try again.')
        setVoiceState(VOICE_STATE.IDLE)
        return
      }

      const { blob, mimeType } = result

      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64 = reader.result.split(',')[1]

          const response = await api.post('/sessions/transcribe', {
            audioBase64: base64,
            mimeType,
          })

          const { transcript, reason } = response.data

          if (!transcript || transcript.trim().length === 0) {
            const newCount = failCount + 1
            setFailCount(newCount)
            // reason comes from the backend filter: 'too_short' means
            // something was heard but not enough to use
            setError(
              newCount >= 3
                ? "Still can't hear you. Check your mic isn't muted, or switch to text mode."
                : reason === 'too_short'
                ? "That was too short to make out — nothing was sent. Try a full sentence."
                : "Didn't catch that — nothing was sent. Tap the mic and try again."
            )
            setVoiceState(VOICE_STATE.IDLE)
            return
          }

          setFailCount(0)

          // The connection dropped while recording/transcribing — the
          // store would silently refuse to send, so say so instead
          if (!isConnected) {
            setError("Connection lost — that recording wasn't sent. Try again once reconnected.")
            setVoiceState(VOICE_STATE.IDLE)
            return
          }

          setVoiceState(VOICE_STATE.WAITING)
          onSendMessage(transcript)
        } catch (err) {
          const status = err.response?.status
          // Rate limited (429) or recording too large (413) — not a
          // transcription failure, so show the server's explanation and
          // don't count it towards the "keeps failing" message
          if (status === 429 || status === 413) {
            setError(
              err.response?.data?.message ||
                (status === 429
                  ? 'Too many voice messages — please wait a moment.'
                  : 'That recording is too long. Try a shorter one.')
            )
            setVoiceState(VOICE_STATE.IDLE)
            return
          }

          const newCount = failCount + 1
          setFailCount(newCount)
          setError(
            newCount >= 3
              ? 'Voice transcription keeps failing. Try switching to text mode.'
              : 'Transcription failed. Please try again.'
          )
          setVoiceState(VOICE_STATE.IDLE)
        }
      }

      reader.readAsDataURL(blob)
    }
}, [voiceState, startRecording, stopRecording, cancelSpeech, onSendMessage, failCount, isConnected])
  const micDisabled =
    isEnded ||
    // Can't start a new recording while offline — but a recording
    // already in progress can still be stopped
    (!isConnected && voiceState === VOICE_STATE.IDLE) ||
    voiceState === VOICE_STATE.TRANSCRIBING ||
    voiceState === VOICE_STATE.WAITING ||
    voiceState === VOICE_STATE.SPEAKING

  const status = statusConfig[voiceState]

  return (
    <div className="flex flex-col h-full">

      {/* ─── MOBILE TOP BAR ─── */}
      <header className="lg:hidden flex-shrink-0 border-b border-slate-800 bg-[#0D1426]">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          {/* Left — back + topic */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onNavigateBack}
              className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {topic || 'Voice Mode'}
              </p>
              <div className="flex items-center gap-2">
  <p className="text-slate-500 text-xs">
    {isEnded ? 'Session completed' : 'Voice session'}
  </p>
  {hasNotes && (
    <span className="flex items-center gap-1 text-cyan-400 text-xs">
      <FileText size={10} />
      From notes
    </span>
  )}
</div>
            </div>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Switch to text */}
            <button
              onClick={onSwitchToText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Text</span>
            </button>

            {/* Score */}
            <button
              onClick={onOpenScore}
              disabled={isScoreButtonDisabled}
              title={isScoreButtonDisabled ? scoreHint : undefined}
              aria-label={isScoreButtonDisabled ? scoreHint : 'Score'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-600/20"
            >
              <BarChart3 size={16} />
              <span className="hidden sm:inline">
                {latestScore ? 'Score' : 'Get Score'}
              </span>
            </button>

            {/* End session */}
            {!isEnded && (
              <button
                onClick={onEndSession}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Flag size={16} />
                <span className="hidden sm:inline">End</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── MESSAGE HISTORY ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mb-4">
              <GraduationCap size={24} className="text-violet-400" />
            </div>
            <p className="text-white font-semibold mb-2">Voice mode ready</p>
            <p className="text-slate-400 text-sm max-w-xs">
              Tap the mic button below and start explaining. I'll ask questions when you stop.
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
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/40'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <span className="text-slate-500 text-xs pt-2 flex-shrink-0">You</span>
            )}
          </motion.div>
        ))}

        {/* Streaming AI response */}
        {isStreaming && streamingMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 justify-start"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={14} className="text-white" />
            </div>
            <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-slate-800/80 text-slate-200 border border-slate-700/40">
              {streamingMsg}
              <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1 animate-pulse align-middle" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── VOICE CONTROLS ─── */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-[#0D1426] px-4 py-6">

        {/* Error */}
        <AnimatePresence>
          {(error || recorderError) && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-xs text-center mb-4"
            >
              {error || recorderError}
            </motion.p>
          )}
        </AnimatePresence>
{/* Voice picker toggle */}
        {voices.length > 0 && (
          <div className="flex justify-center mb-2">
            <button
              onClick={() => setShowVoicePicker((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Settings2 size={12} />
              Voice settings
            </button>
          </div>
        )}

        {/* Voice picker dropdown */}
        <AnimatePresence>
          {showVoicePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 max-h-40 overflow-y-auto bg-[#080D1A] border border-slate-800 rounded-xl p-2"
            >
              {voices.map((v) => (
                <button
                  key={v.name}
                  onClick={() => {
                    setVoice(v.name)
                    previewVoice(v.name)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    selectedVoiceName === v.name
                      ? 'bg-violet-600/20 text-violet-400'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{v.name.replace(/^Microsoft |^Google /, '')}</span>
                  {selectedVoiceName === v.name && (
                    <span className="text-violet-400 flex-shrink-0 ml-2">✓</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Waveform + pause/resume */}
        <div className="flex flex-col items-center gap-2 mb-4 min-h-12">
          <AnimatePresence>
            {voiceState === VOICE_STATE.SPEAKING && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-2"
              >
                {!isPaused && <Waveform />}
                {isPaused && (
                  <p className="text-slate-500 text-xs">Paused</p>
                )}
                <button
                  onClick={togglePause}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mic button */}
        <div className="flex flex-col items-center gap-3">
          <motion.button
            onClick={handleMicTap}
            disabled={micDisabled && !isPaused}
            whileTap={(!micDisabled || isPaused) ? { scale: 0.95 } : {}}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 disabled:cursor-not-allowed ${
              voiceState === VOICE_STATE.RECORDING
                ? 'bg-red-500 shadow-lg shadow-red-500/40'
                : voiceState === VOICE_STATE.SPEAKING
                ? 'bg-cyan-500/20 border-2 border-cyan-500/40'
                : micDisabled
                ? 'bg-slate-800 opacity-50'
                : 'bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-500/30'
            }`}
          >
            {voiceState === VOICE_STATE.RECORDING && (
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            {voiceState === VOICE_STATE.TRANSCRIBING ||
            voiceState === VOICE_STATE.WAITING ? (
              <Loader2 size={28} className="text-white animate-spin" />
            ) : voiceState === VOICE_STATE.SPEAKING ? (
              <Volume2 size={28} className="text-cyan-400" />
            ) : voiceState === VOICE_STATE.RECORDING ? (
              <MicOff size={28} className="text-white" />
            ) : (
              <Mic size={28} className="text-white" />
            )}
          </motion.button>

          <p className={`text-sm font-medium transition-colors ${status.color}`}>
            {isEnded ? 'Session ended' : status.text}
          </p>
        </div>

        
      </div>
    </div>
  )
}

export default VoiceMode