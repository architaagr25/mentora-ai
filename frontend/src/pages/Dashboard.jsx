import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Plus,
  Flame,
  Zap,
  ChevronRight,
  BookOpen,
  X,
  Loader2,
  LayoutDashboard,
  History,
  Network,
  User,
  TrendingUp,
  Target,
  Menu,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import useSessionStore from '@/store/sessionStore'
import api from '@/api'
import NewSessionModal from '@/components/session/NewSessionModal'
import SessionDetailPanel from '@/components/history/SessionDetailPanel'

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const getUniqueLatestSessions = (sessions) => {
  const byTopic = new Map()
  sessions.forEach((session) => {
    const existing = byTopic.get(session.topic)
    if (!existing || new Date(session.updatedAt) > new Date(existing.updatedAt)) {
      byTopic.set(session.topic, session)
    }
  })
  return Array.from(byTopic.values()).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  )
}
const getAverageScore = (scores) => {
  if (!scores || scores.length === 0) return null
  const latest = scores[scores.length - 1]
  return Math.round(
    (latest.accuracy + latest.clarity + latest.completeness) / 3
  )
}

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

const computeFocusAreas = (sessions) => {
  const topicScores = {}
  sessions.forEach((session) => {
    if (!session.scores || session.scores.length === 0) return
    const latest = session.scores[session.scores.length - 1]
    if (!latest || latest.completeness === null) return
    if (!topicScores[session.topic]) {
      topicScores[session.topic] = { total: 0, count: 0 }
    }
    topicScores[session.topic].total += latest.completeness
    topicScores[session.topic].count += 1
  })
  return Object.entries(topicScores)
    .map(([topic, { total, count }]) => ({
      topic,
      avgCompleteness: Math.round((total / count) * 10),
    }))
    .filter((item) => item.avgCompleteness < 80)
    .sort((a, b) => a.avgCompleteness - b.avgCompleteness)
    .slice(0, 4)
}

const computeWeekActivity = (sessions) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMonday)
  weekStart.setHours(0, 0, 0, 0)
  sessions.forEach((session) => {
    const sessionDate = new Date(session.createdAt)
    if (sessionDate >= weekStart) {
      const sessionDay = sessionDate.getDay()
      const dayName = days[sessionDay === 0 ? 6 : sessionDay - 1]
      counts[dayName] = (counts[dayName] || 0) + 1
    }
  })
  const maxCount = Math.max(...Object.values(counts), 1)
  return days.map((day) => ({
    day,
    count: counts[day],
    intensity: counts[day] / maxCount,
  }))
}

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { resetSession } = useSessionStore()

  const [sessions, setSessions] = useState([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [showNewSessionModal, setShowNewSessionModal] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [topic, setTopic] = useState('')
 
  const [confirmCompleteId, setConfirmCompleteId] = useState(null)
  const [isCompleting, setIsCompleting] = useState(false)

  // Set when "Practice" is clicked on a topic whose only sessions are
  // completed — passed to NewSessionModal so it can explain why a new
  // session is being started rather than resuming the old one.
  const [restartTopicMessage, setRestartTopicMessage] = useState(null)

  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const heroRef = useRef(null)
  const historyRef = useRef(null)
  const conceptsRef = useRef(null)

  useEffect(() => {
    resetSession()
    const fetchSessions = async () => {
      try {
        const response = await api.get('/sessions')
        setSessions(response.data.sessions)
      } catch {
        // silent
      } finally {
        setIsLoadingSessions(false)
      }
    }
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusAreas = computeFocusAreas(sessions)
  const weekActivity = computeWeekActivity(sessions)
  const totalSessions = sessions.length
  const sessionsThisWeek = weekActivity.reduce((sum, d) => sum + d.count, 0)
const avgMasteryScore = (() => {
  const scored = sessions.filter((s) => s.scores?.length > 0)
  if (scored.length === 0) return null
  const total = scored.reduce((sum, s) => {
    const latest = s.scores[s.scores.length - 1]
    return sum + (latest.accuracy + latest.clarity + latest.completeness) / 3
  }, 0)
  return Math.round((total / scored.length) * 10)
})()
  const scrollTo = useCallback((ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
    setShowMobileSidebar(false)
  }, [])

// Replace navItems useMemo with a static array (no closures over refs)
const navItems = useMemo(() => [
  { icon: LayoutDashboard, label: 'Dashboard', target: 'hero' },
  { icon: Plus, label: 'New Session', target: 'new-session' },
  { icon: History, label: 'History', target: 'history' },
  { icon: Network, label: 'Concepts', target: 'concepts' },
  { icon: User, label: 'Profile', target: 'profile' },
], [])

const handleNavClick = (target) => {
  if (target === 'new-session') {
    setShowNewSessionModal(true)
    setShowMobileSidebar(false)
    return
  }
  if (target === 'history') {
    navigate('/history')
    setShowMobileSidebar(false)
    return
  }
  if (target === 'profile') {
    navigate('/profile')
    setShowMobileSidebar(false)
    return
  }
  if (target === 'concepts') {
    navigate('/concepts')
    setShowMobileSidebar(false)
    return
  }
  const refMap = { hero: heroRef }
  scrollTo(refMap[target])
}

  // Active sessions go to the live chat page.
// Completed sessions open the read-only detail panel instead.
const handleSessionClick = (session, isActive) => {
  if (isActive) {
    navigate(`/session/${session._id}`)
  } else {
    setSelectedSessionId(session._id)
  }
}

 // "Practice" on a Focus Area:
  // - If an active (not completed) session already exists for this
  //   topic, jump straight into it — no reason to start a duplicate.
  // - If every session on this topic is completed, open the new-session
  //   modal pre-filled with the topic, with a message explaining why.
  const handlePracticeClick = (topic) => {
    const activeSession = sessions.find(
      (s) => s.topic === topic && s.status === 'active'
    )

    if (activeSession) {
      navigate(`/session/${activeSession._id}`)
      return
    }

    setTopic(topic)
    setRestartTopicMessage(topic)
    setShowNewSessionModal(true)
  }

  const handleMarkComplete = async (sessionId) => {
    setIsCompleting(true)
    try {
      await api.post(`/sessions/${sessionId}/end`)
      setSessions((prev) =>
        prev.map((s) =>
          s._id === sessionId ? { ...s, status: 'completed' } : s
        )
      )
      setConfirmCompleteId(null)
    } catch {
      // silent — could add a toast here later
    } finally {
      setIsCompleting(false)
    }
  }

  const greeting = new Date().getHours() < 12
    ? 'morning' : new Date().getHours() < 17
    ? 'afternoon' : 'evening'

  // Sidebar width values
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64'
  const mainMargin = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'

  return (
    <div className="min-h-screen bg-[#080D1A] flex">

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside
        className={`hidden lg:flex ${sidebarWidth} bg-[#0D1426] border-r border-slate-800 flex-col fixed left-0 top-0 h-full z-20 transition-all duration-300`}
      >
       {/* Logo + collapse/expand button */}
<div className="px-3 py-5 border-b border-slate-800 flex flex-col items-center gap-3 overflow-hidden">
  <div className="w-full flex items-center justify-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
      <Brain size={16} className="text-white" />
    </div>
    <span
      className={`text-white font-semibold text-lg whitespace-nowrap transition-all duration-300 overflow-hidden ${
        sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
      }`}
    >
      Mentora <span className="text-cyan-400">AI</span>
    </span>
  </div>

  <button
    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
  >
    {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
  </button>
</div>
        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
  onClick={() => handleNavClick(item.target)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 text-sm font-medium ${
                sidebarCollapsed
                  ? 'justify-center px-2 py-2.5'
                  : 'px-3 py-2.5'
              }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ))}
        </nav>

       
 
  {/* User profile at bottom */}
{!sidebarCollapsed && (
  <div className="px-4 py-4 border-t border-slate-800">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-sm font-bold">
          {user?.name?.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-white text-sm font-medium truncate">{user?.name}</p>
        <p className="text-slate-500 text-xs truncate">{user?.email}</p>
      </div>
    </div>
    <hr className="border-slate-800 mb-3" />
    <button
      onClick={logout}
      className="w-full text-red-400 hover:text-red-300 text-sm font-semibold transition-colors text-left px-1"
    >
      Sign out
    </button>
  </div>
)}

        {/* Collapsed user avatar */}
        {sidebarCollapsed && (
          <div className="px-2 py-4 border-t border-slate-800 flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center cursor-pointer"
              title={user?.name}
              onClick={logout}
            >
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* ─── MOBILE SIDEBAR OVERLAY ─── */}
      <AnimatePresence>
        {showMobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-30"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 h-full w-64 bg-[#0D1426] border-r border-slate-800 flex flex-col z-40"
            >
              {/* Mobile sidebar header */}
              <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                    <Brain size={16} className="text-white" />
                  </div>
                  <span className="text-white font-semibold text-lg">
                    Mentora <span className="text-cyan-400">AI</span>
                  </span>
                </div>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile nav */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item.target)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all duration-200 text-sm font-medium"
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Mobile profile */}
<div className="px-4 py-4 border-t border-slate-800">
  <div className="flex items-center gap-3 mb-3">
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
      <span className="text-white text-sm font-bold">
        {user?.name?.charAt(0).toUpperCase()}
      </span>
    </div>
    <div className="min-w-0">
      <p className="text-white text-sm font-medium truncate">{user?.name}</p>
      <p className="text-slate-500 text-xs truncate">{user?.email}</p>
    </div>
  </div>
  <hr className="border-slate-800 mb-3" />
  <button
    onClick={logout}
    className="w-full text-red-400 hover:text-red-300 text-sm font-semibold transition-colors text-left px-1"
  >
    Sign out
  </button>
</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ─── */}
      <main className={`${mainMargin} flex-1 p-4 md:p-6 lg:p-8 transition-all duration-300`}>

        {/* ─── MOBILE TOP BAR ─── */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 rounded-xl bg-[#0D1426] border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <span className="text-white font-semibold">
              Mentora <span className="text-cyan-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Flame size={12} className="text-orange-400" />
            <span className="text-orange-400 text-xs font-semibold">
              {user?.streak || 0}
            </span>
          </div>
        </div>

        {/* ─── HEADER ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
              Good {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-400 text-sm">
              {focusAreas.length > 0
                ? `You have ${focusAreas.length} concept${focusAreas.length > 1 ? 's' : ''} to review today`
                : 'Ready to start teaching?'}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame size={14} className="text-orange-400" />
              <span className="text-orange-400 text-sm font-semibold">
                {user?.streak || 0} day streak
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-yellow-400 text-sm font-semibold">
                {user?.xp || 0} XP
              </span>
            </div>
          </div>
        </div>

        {/* ─── HERO CARD ─── */}
        <div ref={heroRef}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden p-6 md:p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{
              background: 'linear-gradient(135deg, #1a0533 0%, #0a1628 40%, #0d2040 70%, #0a1628 100%)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
            }}
          >
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-3">
                <Brain size={12} />
                READY WHEN YOU ARE
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Ready to teach something today?
              </h2>
              <p className="text-slate-400 text-sm max-w-md">
                Pick a concept and start explaining. The AI will challenge your depth of understanding in real-time.
              </p>
            </div>

            <button
              onClick={() => setShowNewSessionModal(true)}
              className="relative z-10 flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all hover:shadow-lg hover:shadow-violet-500/25 flex-shrink-0 text-sm md:text-base"
            >
              Start New Session
              <ChevronRight size={18} />
            </button>
          </motion.div>
        </div>

        {/* ─── STATS ROW ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { icon: BookOpen, color: 'bg-blue-500/20 text-blue-400', label: 'Sessions This Week', value: sessionsThisWeek },
            { icon: TrendingUp, color: 'bg-violet-500/20 text-violet-400', label: 'Avg Mastery Score', value: avgMasteryScore !== null ? `${avgMasteryScore}%` : '—' },
            { icon: Target, color: 'bg-cyan-500/20 text-cyan-400', label: 'Total Sessions', value: totalSessions },
            { icon: Flame, color: 'bg-orange-500/20 text-orange-400', label: 'Current Streak', value: `${user?.streak || 0} days` },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#0D1426] border border-slate-800 rounded-2xl p-4 md:p-5"
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-3 ${stat.color}`}>
                <stat.icon size={16} />
              </div>
              <p className="text-xl md:text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── RECENT SESSIONS + ACTIVITY ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 md:mb-8">

          {/* Recent sessions */}
          <div ref={historyRef} className="lg:col-span-2">
           <div className="flex items-center justify-between mb-4 gap-2">
  <h2 className="text-lg font-semibold text-white truncate">Recent Sessions</h2>
  <button
    onClick={() => navigate('/history')}
    className="flex-shrink-0 text-violet-400 text-sm font-medium hover:text-violet-300 transition-colors flex items-center gap-1"
  >
    View all
    <ChevronRight size={14} />
  </button>
</div>

            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="text-violet-400 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={24} className="text-violet-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">No sessions yet</h3>
                <p className="text-slate-400 text-sm mb-4">Start your first teaching session</p>
                <button
                  onClick={() => setShowNewSessionModal(true)}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all text-sm"
                >
                  Start now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {getUniqueLatestSessions(sessions).slice(0, 5).map((session, i) => {
                  const isActive = session.status === 'active'
                  const latest = session.scores?.length > 0
                    ? session.scores[session.scores.length - 1]
                    : null

 return (
<motion.div
  key={session._id}
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: i * 0.05 }}
  onClick={() => handleSessionClick(session, isActive)}
  className="bg-[#0D1426] border border-slate-800 rounded-2xl p-4 hover:border-slate-600 transition-all duration-200 overflow-hidden cursor-pointer"
>
  <div className="flex items-center justify-between gap-3">

    {/* Avatar + topic + timestamp + score (left side, always) */}
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-violet-600/40 to-cyan-500/40 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">
          {session.topic.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-white font-medium text-sm truncate max-w-[120px] sm:max-w-[200px]">
          {session.topic}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-slate-500 text-xs">{formatDate(session.updatedAt)}</p>
          {latest && (
            <p className={`text-xs font-bold sm:hidden ${getScoreColor(getAverageScore(session.scores))}`}>
              {getAverageScore(session.scores)}/10
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Right side — badge, full scores (desktop), actions */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
        {isActive ? 'Active' : 'Completed'}
      </span>

      {latest && (
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {[
            { label: 'ACC', value: latest.accuracy },
            { label: 'CLR', value: latest.clarity },
            { label: 'CMP', value: latest.completeness },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-slate-600 text-xs mb-0.5">{s.label}</p>
              <p className={`text-sm font-bold ${getScoreColor(s.value)}`}>
                {s.value}/10
              </p>
            </div>
          ))}
        </div>
      )}

      {isActive && (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmCompleteId(session._id) }}
          title="Mark as completed"
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
        >
          <CheckCircle size={14} />
          <span className="hidden lg:inline">Mark as Complete</span>
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); handleSessionClick(session, isActive) }}
        className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
      >
        <span className="hidden sm:inline">{isActive ? 'Continue' : 'Review'}</span>
        <ChevronRight size={14} />
      </button>
    </div>
  </div>
</motion.div>
)
                })}
              </div>
            )}
          </div>

          {/* Activity heatmap */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">This Week</h2>
            <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-500 text-xs mb-4">Sessions per day</p>
              <div className="flex items-end justify-between gap-1 md:gap-2">
                {weekActivity.map((day) => (
                  <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full flex flex-col items-center">
                      <div
                        className="w-6 md:w-8 rounded-full transition-all duration-500"
                        style={{
                          height: `${Math.max(day.intensity * 80, 8)}px`,
                          background: day.count > 0
                            ? `rgba(139, 92, 246, ${0.3 + day.intensity * 0.7})`
                            : 'rgba(30, 41, 59, 1)',
                          border: day.count > 0
                            ? '1px solid rgba(139, 92, 246, 0.4)'
                            : '1px solid rgba(30, 41, 59, 1)',
                        }}
                      />
                    </div>
                    {day.count > 0 && (
                      <span className="text-violet-400 text-xs font-bold">{day.count}</span>
                    )}
                    <span className="text-slate-600 text-xs">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── FOCUS AREAS ─── */}
        <div ref={conceptsRef}>
          <h2 className="text-lg font-semibold text-white mb-4">Focus Areas</h2>

          {focusAreas.length === 0 ? (
            <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm">
                {sessions.length === 0
                  ? 'Complete sessions and request scores to see your focus areas'
                  : '🎉 All your topics are looking strong! Keep teaching to maintain your scores.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-5 md:p-6">
              <p className="text-slate-500 text-sm mb-5">
                Concepts that need more teaching sessions
              </p>
              <div className="space-y-4">
                {focusAreas.map((area, i) => (
                  <motion.div
                    key={area.topic}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-3 md:gap-4"
                  >
                    <p className="text-slate-300 text-sm w-28 md:w-40 truncate flex-shrink-0">
                      {area.topic}
                    </p>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${area.avgCompleteness}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full rounded-full bg-gradient-to-r ${getScoreBarColor(area.avgCompleteness / 10)}`}
                      />
                    </div>
                    <span className="text-slate-400 text-sm w-10 text-right flex-shrink-0">
                      {area.avgCompleteness}%
                    </span>
                    <button
                      onClick={() => handlePracticeClick(area.topic)}
                      className="flex-shrink-0 px-2 md:px-3 py-1 rounded-lg text-xs font-medium bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
                    >
                      Practice
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── NEW SESSION MODAL ─── */}
<AnimatePresence>
  {showNewSessionModal && (
    <NewSessionModal
      initialTopic={topic}
      restartNotice={restartTopicMessage}
      onClose={() => {
        setShowNewSessionModal(false)
        setTopic('')
        setRestartTopicMessage(null)
      }}
    />
  )}
</AnimatePresence>
      {/* ─── CONFIRM COMPLETE MODAL ─── */}
      <AnimatePresence>
        {confirmCompleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCompleting && setConfirmCompleteId(null)}
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
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={20} className="text-green-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Complete session?</h2>
                  </div>
                  <button
                    onClick={() => !isCompleting && setConfirmCompleteId(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Are you sure you want to complete this session? You won't be able to resume it later.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setConfirmCompleteId(null)}
                    disabled={isCompleting}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleMarkComplete(confirmCompleteId)}
                    disabled={isCompleting}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isCompleting ? (
                      <><Loader2 size={15} className="animate-spin" />Completing...</>
                    ) : (
                      <>Yes, complete it</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* ─── SESSION DETAIL PANEL (completed sessions only) ─── */}
      <SessionDetailPanel
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />
    </div>
  )
}

export default Dashboard