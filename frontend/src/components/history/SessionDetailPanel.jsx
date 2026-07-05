// frontend/src/components/history/SessionDetailPanel.jsx
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  AlertCircle,
  GraduationCap,
  Clock,
  Calendar,
  BarChart3,
} from 'lucide-react'
import api from '@/api'

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

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (seconds) => {
  if (!seconds) return '—'
  const mins = Math.floor(seconds / 60)
  if (mins < 1) return '<1 min'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

// ─────────────────────────────────────────
// DATA FETCHING
// useQuery handles loading/error/caching state for us —
// no manual useState + useEffect needed, which avoids
// the "setState in effect" cascading-render issue entirely.
// `enabled: !!sessionId` means it simply doesn't fetch
// when the panel is closed (sessionId is null).
// ─────────────────────────────────────────
const useSessionDetail = (sessionId) =>
  useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const res = await api.get(`/sessions/${sessionId}`)
      return res.data.session
    },
    enabled: !!sessionId,
  })

// ─────────────────────────────────────────
// SESSION DETAIL PANEL
// Slide-in panel showing a completed session's
// full scores + transcript.
// ─────────────────────────────────────────
const SessionDetailPanel = ({ sessionId, onClose }) => {
  const { data: session, isLoading, error } = useSessionDetail(sessionId)

  const errorMessage =
    error?.response?.data?.message || 'Failed to load session details'

  const scores = session?.scores || []
  const latestScore = scores.length > 0 ? scores[scores.length - 1] : null

  return (
    <AnimatePresence>
      {sessionId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[28rem] bg-[#0D1426] border-l border-slate-800 z-50 flex flex-col"
          >
            {/* ─── HEADER ─── */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-white font-bold text-lg truncate">
                  {session?.topic || (isLoading ? 'Loading...' : 'Session')}
                </h2>
                {session && (
                  <div className="flex items-center gap-3 mt-1.5 text-slate-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDateTime(session.updatedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatDuration(session.duration)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 ml-3"
              >
                <X size={20} />
              </button>
            </div>

            {/* ─── BODY ─── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="text-violet-400 animate-spin" />
                </div>
              )}

              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-3">
                    <AlertCircle size={20} className="text-red-400" />
                  </div>
                  <p className="text-slate-400 text-sm">{errorMessage}</p>
                </div>
              )}

              {session && !isLoading && !error && (
                <div className="px-5 py-5 space-y-6">

                  {/* ─── SCORES SECTION ─── */}
                  {latestScore ? (
                    <div className="space-y-5">
                      <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 size={14} className="text-violet-400" />
                          <p className="text-slate-500 text-xs">
                            {scores.length > 1 ? 'Latest result' : 'Result'}
                          </p>
                        </div>
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

                      {/* All attempts — only shown if more than one */}
                      {scores.length > 1 && (
                        <div>
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
                                      {formatDateTime(s.scoredAt)}
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
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-5 text-center">
                      <p className="text-slate-500 text-sm">
                        This session was completed without ever being scored.
                      </p>
                    </div>
                  )}

                  {/* ─── TRANSCRIPT SECTION ─── */}
                  <div>
                    <p className="text-white font-semibold text-sm mb-3">
                      Transcript {session.messages?.length > 0 && `(${session.messages.length})`}
                    </p>

                    {(!session.messages || session.messages.length === 0) ? (
                      <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-5 text-center">
                        <p className="text-slate-500 text-sm">No messages in this session.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-[#080D1A] border border-slate-800 rounded-xl p-4">
                        {session.messages.map((msg, i) => (
                          <div
                            key={msg._id || i}
                            className={`flex items-start gap-2.5 ${
                              msg.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                <GraduationCap size={12} className="text-white" />
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                msg.role === 'user'
                                  ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white'
                                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/40'
                              }`}
                            >
                              {msg.content}
                            </div>
                            {msg.role === 'user' && (
                              <span className="text-slate-500 text-xs pt-1.5 flex-shrink-0">You</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SessionDetailPanel