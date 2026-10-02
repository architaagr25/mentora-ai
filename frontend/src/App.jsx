// frontend/src/App.jsx
import { Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Award } from 'lucide-react'
import Landing from '@/pages/Landing'
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const ConfirmEmailChange = lazy(() => import('@/pages/ConfirmEmailChange'))
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Session = lazy(() => import('@/pages/Session'))
const History = lazy(() => import('@/pages/History'))
const Concepts = lazy(() => import('@/pages/Concepts'))
const Profile = lazy(() => import('@/pages/Profile'))
import ProtectedRoute from '@/components/ProtectedRoute'
import RouteFallback from '@/components/RouteFallback'
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
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        {/* Opened from the new inbox — must work logged out */}
        <Route path="/confirm-email/:token" element={<ConfirmEmailChange />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />

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
      </Suspense>

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
            // A neutral scrim, not a token: ink is near-black in the light
            // theme and cream in the dark one, so it cannot dim both.
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center px-4"
          >
            <motion.div
              key={badgeQueue[0].id}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="bg-surface border border-line rounded-lg p-8 w-full max-w-sm text-center shadow-xl"
            >
              <p className="text-highlight text-xs font-semibold tracking-widest uppercase mb-6">
                Badge Unlocked
              </p>

              {/* Badges are the highlight colour everywhere in the app, not
                  the accent — an earned thing should not look like a button. */}
              <motion.div
                initial={{ rotate: 0, scale: 0.5 }}
                animate={{ rotate: 360, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="w-20 h-20 rounded-lg bg-highlight-soft border border-highlight/30 flex items-center justify-center mx-auto mb-5"
              >
                <Award size={36} className="text-highlight" />
              </motion.div>

              <h2 className="text-ink font-semibold text-xl mb-2">{badgeQueue[0].name}</h2>
              <p className="text-muted text-sm mb-7 leading-relaxed">
                {badgeQueue[0].description}
              </p>

              {badgeQueue.length > 1 && (
                <p className="text-muted text-xs mb-4">
                  {badgeQueue.length - 1} more badge{badgeQueue.length - 1 !== 1 ? 's' : ''} to see
                </p>
              )}

              <button onClick={dismissCurrentBadge} className="btn-primary w-full text-sm">
                {badgeQueue.length > 1 ? 'Next' : 'Close'}
              </button>
            </motion.div>          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App