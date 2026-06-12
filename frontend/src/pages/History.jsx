import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight, Loader2, CheckCircle, Clock, History as HistoryIcon } from 'lucide-react'
import api from '@/api'

const getScoreColor = (score) => {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  return 'text-red-400'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

const formatDuration = (seconds) => {
  if (!seconds) return '—'
  const mins = Math.floor(seconds / 60)
  if (mins < 1) return '<1 min'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m`
}

const SessionRow = ({ session, isActive, onClick }) => {
  const latest = session.scores?.length > 0
    ? session.scores[session.scores.length - 1]
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0D1426] border border-slate-800 rounded-2xl p-4 md:p-5 hover:border-slate-600 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">

        {/* Avatar + topic name */}
        <div className="flex items-center gap-3 min-w-0 sm:flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-violet-600/40 to-cyan-500/40 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">
              {session.topic.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-white font-medium text-sm md:text-base break-words">
                {session.topic}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {isActive ? 'Active' : 'Completed'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-xs flex-wrap">
              <span>{formatDate(session.updatedAt)}</span>
              {!isActive && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {formatDuration(session.duration)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scores + button — wraps on mobile, single row + right-aligned on sm+ */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap sm:flex-shrink-0 pl-[52px] sm:pl-0">
          {latest && (
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              {[
                { label: 'ACC', value: latest.accuracy },
                { label: 'CLR', value: latest.clarity },
                { label: 'CMP', value: latest.completeness },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-slate-600 text-xs mb-0.5">{s.label}</p>
                  <p className={`text-sm font-bold ${getScoreColor(s.value)}`}>{s.value}/10</p>
                </div>
              ))}
            </div>
          )}

          <button className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors sm:ml-auto">
            <span>{isActive ? 'Continue' : 'Review'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
const EmptyState = ({ icon: Icon, title, desc }) => (
  <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-10 md:p-14 text-center">
    <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mx-auto mb-4">
      <Icon size={24} className="text-violet-400" />
    </div>
    <h3 className="text-white font-semibold mb-2">{title}</h3>
    <p className="text-slate-400 text-sm max-w-sm mx-auto">{desc}</p>
  </div>
)

const SectionHeader = ({ title, count, badgeClass }) => (
  <div className="flex items-center gap-2 mb-4">
    <h2 className="text-lg md:text-xl font-semibold text-white">{title}</h2>
    {count > 0 && (
      <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>
        {count}
      </span>
    )}
  </div>
)

const History = () => {
  const navigate = useNavigate()
  const [activeSessions, setActiveSessions] = useState([])
  const [completedSessions, setCompletedSessions] = useState([])
  const [isLoadingActive, setIsLoadingActive] = useState(true)
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(true)

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const res = await api.get('/sessions?status=active')
        setActiveSessions(res.data.sessions)
      } catch {
        // silent
      } finally {
        setIsLoadingActive(false)
      }
    }

    const fetchCompleted = async () => {
      try {
        const res = await api.get('/sessions?status=completed')
        setCompletedSessions(res.data.sessions)
      } catch {
        // silent
      } finally {
        setIsLoadingCompleted(false)
      }
    }

    fetchActive()
    fetchCompleted()
  }, [])

  const totalSessions = activeSessions.length + completedSessions.length

  return (
    <div className="min-h-screen bg-[#080D1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

        {/* ─── PAGE HEADER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 md:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <HistoryIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Session History</h1>
              <p className="text-slate-400 text-sm">
                {totalSessions} total session{totalSessions !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 sm:flex-initial flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D1426] border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-slate-300 text-sm">
                {activeSessions.length} active
              </span>
            </div>
            <div className="flex-1 sm:flex-initial flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0D1426] border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-slate-300 text-sm">
                {completedSessions.length} completed
              </span>
            </div>
          </div>
        </div>

        {/* ─── TWO COLUMN LAYOUT ON LARGE SCREENS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">

          {/* ─── ACTIVE SESSIONS ─── */}
          <div>
            <SectionHeader
              title="Active Sessions"
              count={activeSessions.length}
              badgeClass="bg-green-500/20 text-green-400"
            />

            {isLoadingActive ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="text-violet-400 animate-spin" />
              </div>
            ) : activeSessions.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No active sessions"
                desc="Start a new session from the dashboard to begin teaching."
              />
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <SessionRow
                    key={session._id}
                    session={session}
                    isActive
                    onClick={() => navigate(`/session/${session._id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ─── COMPLETED SESSIONS ─── */}
          <div>
            <SectionHeader
              title="Completed Sessions"
              count={completedSessions.length}
              badgeClass="bg-slate-700 text-slate-400"
            />

            {isLoadingCompleted ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={22} className="text-violet-400 animate-spin" />
              </div>
            ) : completedSessions.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No completed sessions yet"
                desc="Sessions you mark as complete will show up here with their final scores."
              />
            ) : (
              <div className="space-y-3">
                {completedSessions.map((session) => (
                  <SessionRow
                    key={session._id}
                    session={session}
                    isActive={false}
                    onClick={() => navigate(`/session/${session._id}`)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default History