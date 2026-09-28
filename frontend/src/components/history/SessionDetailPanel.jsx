// frontend/src/components/history/SessionDetailPanel.jsx
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  AlertCircle,  Clock,
  Calendar,
  BarChart3,
} from 'lucide-react'
import api from '@/api'
import KeyPointsReveal from '@/components/session/KeyPointsReveal'
import StudentAvatar from '@/components/StudentAvatar'

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
            className="fixed right-0 top-0 h-full w-full sm:w-[28rem] bg-surface border-l border-line z-50 flex flex-col"
          >
            {/* ─── HEADER ─── */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-line flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-ink font-semibold text-lg truncate">
                  {session?.topic || (isLoading ? 'Loading...' : 'Session')}
                </h2>
                {session && (
                  <div className="flex items-center gap-3 mt-1.5 text-muted text-xs">
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
                className="text-muted hover:text-ink transition-colors flex-shrink-0 ml-3"
              >
                <X size={20} />
              </button>
            </div>

            {/* ─── BODY ─── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="text-accent animate-spin" />
                </div>
              )}

              {error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-12 h-12 rounded-lg bg-danger-soft border border-danger/30 flex items-center justify-center mb-3">
                    <AlertCircle size={20} className="text-danger" />
                  </div>
                  <p className="text-muted text-sm">{errorMessage}</p>
                </div>
              )}

              {session && !isLoading && !error && (
                <div className="px-5 py-5 space-y-6">

                  {/* ─── SCORES SECTION ─── */}
                  {latestScore ? (
                    <div className="space-y-5">
                      <div className="bg-bg border border-line rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 size={14} className="text-accent" />
                          <p className="text-muted text-xs">
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
                      {/* What a complete explanation covers — hidden
                          during the session, revealed once completed */}
                      {session?.keyPoints?.length > 0 && (
                        <KeyPointsReveal
                          keyPoints={session.keyPoints}
                          coveredKeyPoints={latestScore.coveredKeyPoints || []}
                        />
                      )}

                      {/* All attempts — only shown if more than one */}
                      {scores.length > 1 && (
                        <div>
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
                                      {formatDateTime(s.scoredAt)}
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
                      )}
                    </div>
                  ) : (
                    <div className="bg-bg border border-line rounded-lg p-5 text-center">
                      <p className="text-muted text-sm">
                        This session was completed without ever being scored.
                      </p>
                    </div>
                  )}

                  {/* ─── TRANSCRIPT SECTION ─── */}
                  <div>
                    <p className="text-ink font-semibold text-sm mb-3">
                      Transcript {session.messages?.length > 0 && `(${session.messages.length})`}
                    </p>

                    {(!session.messages || session.messages.length === 0) ? (
                      <div className="bg-bg border border-line rounded-lg p-5 text-center">
                        <p className="text-muted text-sm">No messages in this session.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-bg border border-line rounded-lg p-4">
                        {session.messages.map((msg, i) => (
                          <div
                            key={msg._id || i}
                            className={`flex items-start gap-2.5 ${
                              msg.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {msg.role === 'assistant' && (
                              <StudentAvatar size="sm" />
                            )}
                            <div
                              className={`max-w-[80%] px-3.5 py-2.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                msg.role === 'user'
                                  ? 'bg-surface-2 text-ink'
                                  : 'bg-surface-2/80 text-ink border border-line/40'
                              }`}
                            >
                              {msg.content}
                            </div>
                            {msg.role === 'user' && (
                              <span className="text-muted text-xs pt-1.5 flex-shrink-0">You</span>
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