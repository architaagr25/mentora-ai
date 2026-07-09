// frontend/src/pages/Concepts.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Network, FileText, Loader2 } from 'lucide-react'
import api from '@/api'

const useAllSessions = () =>
  useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: async () => {
      const res = await api.get('/sessions')
      return res.data.sessions
    },
  })

// ─────────────────────────────────────────
// AGGREGATE GAPS BY TOPIC
// Flattens every score attempt's `gaps` array across all sessions,
// grouped by topic. This works for every scored session — with or
// without uploaded notes — since gaps come from the scoring AI's
// evaluation of the conversation itself, not from notes.
//
// extractedConcepts (when present) are collected too, as secondary
// context — "what this topic's notes covered" — but are never the
// primary source, since most sessions have no notes at all.
// ─────────────────────────────────────────
const aggregateByTopic = (sessions) => {
  const byTopic = new Map()

  sessions.forEach((session) => {
    if (!session.scores || session.scores.length === 0) return

    if (!byTopic.has(session.topic)) {
      byTopic.set(session.topic, {
        topic: session.topic,
        gaps: [],
        concepts: new Set(),
        latestScoreDate: null,
      })
    }
    const entry = byTopic.get(session.topic)

    session.scores.forEach((score) => {
      if (score.gaps && score.gaps.length > 0) {
        score.gaps.forEach((gap) => entry.gaps.push({ text: gap, scoredAt: score.scoredAt }))
      }
      if (!entry.latestScoreDate || new Date(score.scoredAt) > new Date(entry.latestScoreDate)) {
        entry.latestScoreDate = score.scoredAt
      }
    })

    if (session.notes?.extractedConcepts) {
      session.notes.extractedConcepts.forEach((c) => entry.concepts.add(c))
    }
  })

  return Array.from(byTopic.values())
    .map((entry) => ({
      ...entry,
      concepts: Array.from(entry.concepts),
      // Most recent gaps first — that's the most relevant view of
      // "what am I still getting wrong" for a topic you've revisited
      gaps: entry.gaps.sort((a, b) => new Date(b.scoredAt) - new Date(a.scoredAt)),
    }))
    .sort((a, b) => new Date(b.latestScoreDate) - new Date(a.latestScoreDate))
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const GAPS_PREVIEW_COUNT = 2

const TopicCard = ({ entry, index }) => {
  const [showAll, setShowAll] = useState(false)

  const visibleGaps = showAll ? entry.gaps : entry.gaps.slice(0, GAPS_PREVIEW_COUNT)
  const hiddenCount = entry.gaps.length - GAPS_PREVIEW_COUNT

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#0D1426] border border-slate-800 rounded-2xl p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-white font-semibold text-base md:text-lg">{entry.topic}</h3>
        <span className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
          {entry.gaps.length} gap{entry.gaps.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Concepts from notes — secondary context, only if this topic ever had notes uploaded */}
      {entry.concepts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <FileText size={12} className="text-cyan-400 flex-shrink-0" />
          {entry.concepts.slice(0, 6).map((c, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20"
            >
              {c}
            </span>
          ))}
          {entry.concepts.length > 6 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">
              +{entry.concepts.length - 6} more
            </span>
          )}
        </div>
      )}

      {entry.gaps.length === 0 ? (
        <p className="text-slate-500 text-sm">No gaps found — solid understanding so far.</p>
      ) : (
        <>
          <div className="space-y-2.5">
            {visibleGaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-slate-300 text-sm">{gap.text}</span>
                  <span className="text-slate-600 text-xs ml-2">{formatDate(gap.scoredAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              {showAll ? 'Show less' : `View ${hiddenCount} more`}
            </button>
          )}
        </>
      )}
    </motion.div>
  )
}

const EmptyState = () => (
  <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-10 md:p-14 text-center">
    <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mx-auto mb-4">
      <Network size={24} className="text-violet-400" />
    </div>
    <h3 className="text-white font-semibold mb-2">No concept gaps yet</h3>
    <p className="text-slate-400 text-sm max-w-sm mx-auto">
      Score a session to start building your concept gap map — every scored explanation adds to this view, whether or not you uploaded notes.
    </p>
  </div>
)

const Concepts = () => {
  const navigate = useNavigate()
  const { data: sessions = [], isLoading } = useAllSessions()
  const topics = aggregateByTopic(sessions)

  return (
    <div className="min-h-screen bg-[#080D1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

        {/* ─── BACK TO DASHBOARD ─── */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* ─── PAGE HEADER ─── */}
        <div className="flex items-center gap-3 mb-8 md:mb-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Network size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Concepts</h1>
            <p className="text-slate-400 text-sm">
              Every gap surfaced across your scored sessions, grouped by topic
            </p>
          </div>
        </div>

        {/* ─── CONTENT ─── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        ) : topics.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {topics.map((entry, i) => (
              <TopicCard key={entry.topic} entry={entry} index={i} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default Concepts