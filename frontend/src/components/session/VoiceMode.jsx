import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, GraduationCap, Volume2 } from 'lucide-react'
import useVoiceRecorder from '@/hooks/useVoiceRecorder'
import useSpeech from '@/hooks/useSpeech'
import api from '@/api'

// ─────────────────────────────────────────
// VOICE STATES
// The mic button and status text cycle
// through these states during a conversation
// ─────────────────────────────────────────
const VOICE_STATE = {
  IDLE: 'idle',               // ready to record
  RECORDING: 'recording',     // mic is active, user is speaking
  TRANSCRIBING: 'transcribing', // audio sent to Gemini, waiting for text
  WAITING: 'waiting',         // transcript sent, waiting for AI response
  SPEAKING: 'speaking',       // AI is reading response aloud
}

// ─────────────────────────────────────────
// WAVEFORM ANIMATION
// Simple animated bars shown while AI speaks
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// STATUS LABEL
// Text shown below the mic button describing
// what is currently happening
// ─────────────────────────────────────────
const statusConfig = {
  [VOICE_STATE.IDLE]: { text: 'Tap to speak', color: 'text-slate-400' },
  [VOICE_STATE.RECORDING]: { text: 'Listening... tap to stop', color: 'text-red-400' },
  [VOICE_STATE.TRANSCRIBING]: { text: 'Transcribing...', color: 'text-cyan-400' },
  [VOICE_STATE.WAITING]: { text: 'AI student is thinking...', color: 'text-violet-400' },
  [VOICE_STATE.SPEAKING]: { text: 'AI student is speaking...', color: 'text-cyan-400' },
}

// ─────────────────────────────────────────
// VOICE MODE COMPONENT
// Props:
//   messages       — full message array from sessionStore
//   isStreaming    — whether AI is currently streaming text
//   streamingMsg   — the partial streaming text
//   onSendMessage  — calls sessionStore.sendMessage(text)
//   onAiDone       — fires when ai_response_done comes in,
//                    passes the full AI message text
//   sessionId      — needed for the transcribe API call
//   isEnded        — whether session is completed
// ─────────────────────────────────────────
const VoiceMode = ({
  messages,
  isStreaming,
  streamingMsg,
  onSendMessage,
  isEnded,
  latestAiMessage,
}) => {
  const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const {
    error: recorderError,
    startRecording,
    stopRecording,
    cleanup,
  } = useVoiceRecorder()

  const {speak, cancelSpeech } = useSpeech()

  // ─────────────────────────────────────────
  // AUTO-SCROLL messages
  // ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMsg])

  // ─────────────────────────────────────────
  // CLEANUP on unmount
  // Stop recording + cancel speech if user
  // switches back to text mode mid-session
  // ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanup()
      cancelSpeech()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─────────────────────────────────────────
  // SYNC voiceState with streaming/speaking
  // ─────────────────────────────────────────
 const prevIsStreamingRef = useRef(false)

  useEffect(() => {
    if (isStreaming && !prevIsStreamingRef.current) {
      prevIsStreamingRef.current = true
      setTimeout(() => setVoiceState(VOICE_STATE.WAITING), 0)
    } else if (!isStreaming) {
      prevIsStreamingRef.current = false
    }
  }, [isStreaming])
  // ─────────────────────────────────────────
  // SPEAK when AI response completes
  // latestAiMessage is the most recent
  // assistant message — parent updates it
  // when ai_response_done fires
  // ─────────────────────────────────────────
useEffect(() => {
    if (!latestAiMessage || isStreaming) return

    const speakResponse = async () => {
      setTimeout(() => setVoiceState(VOICE_STATE.SPEAKING), 0)
      await speak(latestAiMessage)
      setVoiceState((prev) =>
        prev === VOICE_STATE.SPEAKING ? VOICE_STATE.IDLE : prev
      )
    }

    speakResponse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestAiMessage])

  // ─────────────────────────────────────────
  // HANDLE MIC BUTTON TAP
  // ─────────────────────────────────────────
  const handleMicTap = useCallback(async () => {
    setError(null)

    if (voiceState === VOICE_STATE.IDLE) {
      // Cancel any ongoing speech first
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

      // Convert blob to base64 so we can send it as JSON
      // FileReader is the standard browser API for this
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          // reader.result looks like "data:audio/webm;base64,AAAA..."
          // we only want the part after the comma
          const base64 = reader.result.split(',')[1]

          const response = await api.post('/sessions/transcribe', {
            audioBase64: base64,
            mimeType,
          })

          const transcript = response.data.transcript

          if (!transcript || transcript.trim().length === 0) {
            setError('Could not hear anything. Please try again.')
            setVoiceState(VOICE_STATE.IDLE)
            return
          }

          // Feed transcript into existing socket flow
          setVoiceState(VOICE_STATE.WAITING)
          onSendMessage(transcript)
        } catch {
          setError('Transcription failed. Please try again.')
          setVoiceState(VOICE_STATE.IDLE)
        }
      }

      reader.readAsDataURL(blob)
    }
  }, [voiceState, startRecording, stopRecording, cancelSpeech, onSendMessage])

  // ─────────────────────────────────────────
  // MIC BUTTON disabled conditions
  // ─────────────────────────────────────────
  const micDisabled =
    isEnded ||
    voiceState === VOICE_STATE.TRANSCRIBING ||
    voiceState === VOICE_STATE.WAITING ||
    voiceState === VOICE_STATE.SPEAKING

  const status = statusConfig[voiceState]

  return (
    <div className="flex flex-col h-full">

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

        {/* Waveform — shown while AI is speaking */}
        <div className="flex justify-center mb-4 h-8">
          <AnimatePresence>
            {voiceState === VOICE_STATE.SPEAKING && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Waveform />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mic button */}
        <div className="flex flex-col items-center gap-3">
          <motion.button
            onClick={handleMicTap}
            disabled={micDisabled}
            whileTap={!micDisabled ? { scale: 0.95 } : {}}
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
            {/* Pulsing ring while recording */}
            {voiceState === VOICE_STATE.RECORDING && (
              <motion.div
                className="absolute inset-0 rounded-full bg-red-500"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            {voiceState === VOICE_STATE.TRANSCRIBING || voiceState === VOICE_STATE.WAITING ? (
              <Loader2 size={28} className="text-white animate-spin" />
            ) : voiceState === VOICE_STATE.SPEAKING ? (
              <Volume2 size={28} className="text-cyan-400" />
            ) : voiceState === VOICE_STATE.RECORDING ? (
              <MicOff size={28} className="text-white" />
            ) : (
              <Mic size={28} className="text-white" />
            )}
          </motion.button>

          {/* Status text */}
          <p className={`text-sm font-medium transition-colors ${status.color}`}>
            {isEnded ? 'Session ended' : status.text}
          </p>
        </div>
      </div>
    </div>
  )
}

export default VoiceMode