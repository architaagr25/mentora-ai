// frontend/src/pages/Concepts.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Network, FileText, Loader2, CheckCircle2, RotateCcw } from 'lucide-react'
import api from '@/api'

const FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
]

const GAPS_PREVIEW_COUNT = 3

// Same normalisation as the backend's topicKey (gapService.js), so notes
// concepts line up with the gap groups
const normaliseKey = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

// ─────────────────────────────────────────
// DATA
// Gaps come from /api/gaps — one stored gap per topic, open or
// resolved — instead of being summed from every score attempt.
// ─────────────────────────────────────────
const useGaps = (status) =>
  useQuery({
    queryKey: ['gaps', status],
    queryFn: async () => {
      const res = await api.get('/gaps', { params: { status } })
      return res.data
    },
    // A score taken a moment ago must show up here straight away
    staleTime: 0,
    // Keeps the tab counts on screen while the other tab loads
    placeholderData: keepPreviousData,
  })

// Sessions are only used for the notes concepts shown under each topic
const useAllSessions = () =>
  useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: async () => {
      const res = await api.get('/sessions')
      return res.data.sessions
    },
  })

// Gaps arrive most recently seen first, so the first gap of each topic
// carries the topic's most recent casing
const groupByTopic = (gaps) => {
  const byTopic = new Map()
  gaps.forEach((gap) => {
    if (!byTopic.has(gap.topicKey)) {
      byTopic.set(gap.topicKey, { topicKey: gap.topicKey, topic: gap.topic, gaps: [] })
    }
    byTopic.get(gap.topicKey).gaps.push(gap)
  })
  return Array.from(byTopic.values())
}

const conceptsByTopic = (sessions) => {
  const byTopic = new Map()
  sessions.forEach((session) => {
    const concepts = session.notes?.extractedConcepts
    if (!concepts?.length) return
    const key = normaliseKey(session.topic)
    if (!byTopic.has(key)) byTopic.set(key, new Set())
    concepts.forEach((c) => byTopic.get(key).add(c))
  })
  return byTopic
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const gapDateLabel = (gap) => {
  if (gap.status === 'open') return formatDate(gap.lastSeenAt)
  const date = formatDate(gap.resolvedAt)
  return gap.resolvedBy === 'rescore' ? `fixed on rescore · ${date}` : `resolved · ${date}`
}

const GapRow = ({ gap, onUpdate, isUpdating }) => {
  const isOpen = gap.status === 'open'

  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
          isOpen ? 'bg-orange-400' : 'bg-emerald-400'
        }`}
      />
      <div className="min-w-0 flex-1">
        <span className={`text-sm ${isOpen ? 'text-slate-300' : 'text-slate-500 line-through'}`}>
          {gap.text}
        </span>
        <span className="text-slate-600 text-xs ml-2 whitespace-nowrap">{gapDateLabel(gap)}</span>
      </div>
      <button
        onClick={() => onUpdate(gap._id, isOpen ? 'resolved' : 'open')}
        disabled={isUpdating}
        className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
            : 'text-slate-400 border-slate-700 hover:bg-slate-800'
        }`}
      >
        {isUpdating ? (
          <Loader2 size={12} className="animate-spin" />
        ) : isOpen ? (
          <CheckCircle2 size={12} />
        ) : (
          <RotateCcw size={12} />
        )}
        {isOpen ? 'Mark resolved' : 'Reopen'}
      </button>
    </div>
  )
}

const TopicCard = ({ entry, concepts, status, index, onUpdate, updatingId }) => {
  const [showAll, setShowAll] = useState(false)

  const visibleGaps = showAll ? entry.gaps : entry.gaps.slice(0, GAPS_PREVIEW_COUNT)
  const hiddenCount = entry.gaps.length - GAPS_PREVIEW_COUNT
  const isOpenTab = status === 'open'

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[#0D1426] border border-slate-800 rounded-2xl p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-white font-semibold text-base md:text-lg">{entry.topic}</h3>
        <span
          className={`flex-shrink-0 text-xs px-2 py-1 rounded-full border ${
            isOpenTab
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}
        >
          {entry.gaps.length} {isOpenTab ? 'open' : 'resolved'}
        </span>
      </div>

      {/* Concepts from notes — secondary context, only if this topic ever had notes uploaded */}
      {concepts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <FileText size={12} className="text-cyan-400 flex-shrink-0" />
          {concepts.slice(0, 6).map((c, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20"
            >
              {c}
            </span>
          ))}
          {concepts.length > 6 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">
              +{concepts.length - 6} more
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        {visibleGaps.map((gap) => (
          <GapRow
            key={gap._id}
            gap={gap}
            onUpdate={onUpdate}
            isUpdating={updatingId === gap._id}
          />
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
    </motion.div>
  )
}

const EmptyState = ({ status, hasAnyGaps }) => {
  const copy =
    status === 'resolved'
      ? {
          title: 'Nothing resolved yet',
          body: 'Mark a gap resolved once you can explain it, or rescore a session after covering it — fixed gaps move here.',
        }
      : hasAnyGaps
        ? {
            title: 'No open gaps',
            body: 'Every gap found so far is resolved. Teach a new topic to find the next ones.',
          }
        : {
            title: 'No concept gaps yet',
            body: 'Score a session to start building your concept gap map — every scored explanation adds to this view, whether or not you uploaded notes.',
          }

  return (
    <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-10 md:p-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mx-auto mb-4">
        <Network size={24} className="text-violet-400" />
      </div>
      <h3 className="text-white font-semibold mb-2">{copy.title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mx-auto">{copy.body}</p>
    </div>
  )
}

const Concepts = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('open')

  const { data, isLoading, isPlaceholderData, isError, refetch } = useGaps(status)
  const { data: sessions = [] } = useAllSessions()

  const updateGap = useMutation({
    mutationFn: ({ id, status: nextStatus }) => api.patch(`/gaps/${id}`, { status: nextStatus }),
    // Returning the promise keeps the button spinning until the lists
    // have refetched, so the gap doesn't flicker before moving tabs
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gaps'] }),
  })

  const handleUpdate = (id, nextStatus) => updateGap.mutate({ id, status: nextStatus })
  const updatingId = updateGap.isPending ? updateGap.variables?.id : null

  const counts = data?.counts ?? { open: 0, resolved: 0 }
  const topics = groupByTopic(data?.gaps ?? [])
  const notesConcepts = conceptsByTopic(sessions)
  const showLoader = isLoading || isPlaceholderData

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
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Network size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Concepts</h1>
            <p className="text-slate-400 text-sm">
              Gaps from each session's latest score, grouped by topic
            </p>
          </div>
        </div>

        {/* ─── OPEN / RESOLVED FILTER ─── */}
        <div className="flex items-center gap-2 mb-6" role="tablist">
          {FILTERS.map((filter) => {
            const active = status === filter.value
            return (
              <button
                key={filter.value}
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(filter.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                    : 'text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {filter.label}
                {data && <span className="ml-1.5 text-xs opacity-70">{counts[filter.value]}</span>}
              </button>
            )
          })}
        </div>

        {updateGap.isError && (
          <p className="text-red-400 text-sm mb-4">Couldn't update that gap. Please try again.</p>
        )}

        {/* ─── CONTENT ─── */}
        {showLoader ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        ) : isError ? (
          <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-10 text-center">
            <p className="text-slate-400 text-sm mb-3">Couldn't load your gaps.</p>
            <button
              onClick={() => refetch()}
              className="text-sm font-medium text-violet-400 hover:text-violet-300"
            >
              Try again
            </button>
          </div>
        ) : topics.length === 0 ? (
          <EmptyState status={status} hasAnyGaps={counts.open + counts.resolved > 0} />
        ) : (
          <div className="space-y-4">
            {topics.map((entry, i) => (
              <TopicCard
                key={entry.topicKey}
                entry={entry}
                concepts={Array.from(notesConcepts.get(entry.topicKey) ?? [])}
                status={status}
                index={i}
                onUpdate={handleUpdate}
                updatingId={updatingId}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default Concepts
