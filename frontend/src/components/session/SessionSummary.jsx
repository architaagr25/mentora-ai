// frontend/src/components/session/SessionSummary.jsx
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Zap, AlertCircle, LayoutDashboard, History } from 'lucide-react'
import KeyPointsReveal from './KeyPointsReveal'

// ─────────────────────────────────────────
// SESSION SUMMARY
// Shown in place of the chat once a session ends. Ending used to send
// the user straight to the dashboard, so the last thing they taught —
// and everything the scoring found — flashed past unseen.
// ─────────────────────────────────────────

const SCORE_ROWS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'completeness', label: 'Completeness' },
]

const barColor = (score) => {
  if (score >= 8) return 'bg-success'
  if (score >= 6) return 'bg-highlight'
  return 'bg-danger'
}

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return null
  const mins = Math.floor(seconds / 60)
  if (mins < 1) return `${seconds}s`
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const SessionSummary = ({ summary, topic, onBackToDashboard, onViewHistory }) => {
  const score = summary?.finalScore ?? null
  const average = score
    ? Math.round(((score.accuracy + score.clarity + score.completeness) / 3) * 10) / 10
    : null
  const duration = formatDuration(summary?.duration)
  const xpEarned = summary?.xp?.xpEarned ?? 0

  return (
    <div className="flex-1 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 py-8 space-y-6"
      >
        {/* ─── HEADER ─── */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-lg bg-success-soft flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={26} className="text-success" />
          </div>
          <h1 className="text-ink font-semibold text-xl md:text-2xl">Session complete</h1>
          <p className="text-muted text-sm mt-1">{topic}</p>

          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted">
            {duration && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {duration}
              </span>
            )}
            {xpEarned > 0 && (
              <span className="flex items-center gap-1 text-highlight">
                <Zap size={12} />+{xpEarned} XP
              </span>
            )}
          </div>
        </div>

        {/* ─── FINAL SCORE ─── */}
        {score ? (
          <div className="bg-surface border border-line rounded-lg p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-ink font-semibold">Final score</h2>
                {summary?.autoScored && (
                  <p className="text-muted text-xs mt-0.5">
                    Scored automatically when you ended the session
                  </p>
                )}
              </div>
              <span className="flex-shrink-0 text-2xl font-semibold text-ink">
                {average}
                <span className="text-muted text-base font-normal">/10</span>
              </span>
            </div>

            <div className="space-y-3">
              {SCORE_ROWS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-muted text-sm w-24 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(score[key] ?? 0) * 10}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${barColor(score[key] ?? 0)}`}
                    />
                  </div>
                  <span className="text-ink text-sm font-semibold w-8 text-right flex-shrink-0">
                    {score[key] ?? '—'}
                  </span>
                </div>
              ))}
            </div>

            {score.feedback && (
              <p className="text-ink text-sm mt-5 leading-relaxed">{score.feedback}</p>
            )}
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-lg p-6 text-center">
            <p className="text-muted text-sm">
              This session ended without a score — there wasn't enough teaching to judge.
            </p>
          </div>
        )}

        {/* ─── GAPS ─── */}
        {score?.gaps?.length > 0 && (
          <div className="bg-surface border border-line rounded-lg p-5 md:p-6">
            <h3 className="text-ink font-semibold text-sm mb-1 flex items-center gap-2">
              <AlertCircle size={14} className="text-highlight" />
              Gaps to close
            </h3>
            <p className="text-muted text-xs mb-3">
              These are waiting on your Concepts page — practise one to close it
            </p>
            <ul className="space-y-2">
              {score.gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-highlight mt-1.5 flex-shrink-0" />
                  <span className="text-ink text-sm">{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── KEY POINTS REVEAL ─── */}
        {summary?.keyPoints?.length > 0 && (
          <div className="bg-surface border border-line rounded-lg p-5 md:p-6">
            <KeyPointsReveal
              keyPoints={summary.keyPoints}
              coveredKeyPoints={score?.coveredKeyPoints ?? []}
            />
          </div>
        )}

        {/* ─── ACTIONS ─── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBackToDashboard}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm"
          >
            <LayoutDashboard size={16} />
            Back to Dashboard
          </button>
          <button
            onClick={onViewHistory}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 py-3 text-sm"
          >
            <History size={16} />
            View in History
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default SessionSummary
