// frontend/src/App.jsx
import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Award } from 'lucide-react'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import Session from '@/pages/Session'
import History from '@/pages/History'
import Concepts from '@/pages/Concepts'
import Profile from '@/pages/Profile'
import ProtectedRoute from '@/components/ProtectedRoute'
import useAuth from '@/hooks/useAuth'
import useSessionStore from '@/store/sessionStore'

function App() {
  const { initialize } = useAuth()
  const badgeQueue = useSessionStore((state) => state.badgeQueue)
  const dismissCurrentBadge = useSessionStore((state) => state.dismissCurrentBadge)

  useEffect(() => {
  initialize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected routes — wrapped in ProtectedRoute */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session"
          element={
            <ProtectedRoute>
              <Session />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:id"
          element={
            <ProtectedRoute>
              <Session />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/concepts"
          element={
            <ProtectedRoute>
              <Concepts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* ─── BADGE UNLOCK MODAL — rendered globally ─── */}
      {/* Lives here (outside any single page) rather than inside
          Session.jsx, because badges can now be earned from multiple
          places — scoring or ending a session on the live Session
          page (via socket), or clicking "Mark as Complete" on
          Dashboard (via REST). Wherever the user is when a badge
          lands in the queue, this renders on top of it. */}
      <AnimatePresence mode="wait">
        {badgeQueue.length > 0 && (
          <motion.div
            key="badge-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center px-4"
          >
            <motion.div
              key={badgeQueue[0].id}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="bg-[#0D1426] border border-violet-500/30 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl shadow-violet-500/20"
            >
              <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-6">
                Badge Unlocked
              </p>

              <motion.div
                initial={{ rotate: 0, scale: 0.5 }}
                animate={{ rotate: 360, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-500/40"
              >
                <Award size={36} className="text-white" />
              </motion.div>

              <h2 className="text-white font-bold text-xl mb-2">{badgeQueue[0].name}</h2>
              <p className="text-slate-400 text-sm mb-7 leading-relaxed">
                {badgeQueue[0].description}
              </p>

              {badgeQueue.length > 1 && (
                <p className="text-slate-600 text-xs mb-4">
                  {badgeQueue.length - 1} more badge{badgeQueue.length - 1 !== 1 ? 's' : ''} to see
                </p>
              )}

              <button
                onClick={dismissCurrentBadge}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all text-sm"
              >
                {badgeQueue.length > 1 ? 'Next' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App