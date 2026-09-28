// frontend/src/pages/ConfirmEmailChange.jsx
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Brain, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { confirmEmailChange } from '@/api/users'
import ThemeToggle from '@/components/layout/ThemeToggle'
import useAuthStore from '@/store/authStore'

// ─────────────────────────────────────────
// CONFIRM AN EMAIL CHANGE
// Opened from the link sent to the NEW address. Deliberately works
// logged out: that inbox may well be open in a different browser.
// The token in the URL is the proof, so the confirmation is sent as
// soon as the page loads — there is nothing to ask the visitor.
// ─────────────────────────────────────────
const ConfirmEmailChange = () => {
  const { token } = useParams()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)

  const [status, setStatus] = useState('working')
  const [email, setEmail] = useState(null)
  const [error, setError] = useState(null)

  // React runs effects twice in StrictMode. Harmless here (the second
  // call would just fail on a spent token) but it would show the
  // error state after a success, so the request is fired once.
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    confirmEmailChange(token)
      .then((data) => {
        setEmail(data.email)
        setStatus('done')
        // Keep the signed-in copy honest if this is the same browser
        if (user) updateUser({ ...user, email: data.email, pendingEmail: null })
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'This confirmation link is invalid or has expired. Try changing your email again.'
        )
        setStatus('failed')
      })
    // Runs once, on mount — user/updateUser are read at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <ThemeToggle floating />
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Brain size={26} className="text-accent" />
          <span className="text-xl font-semibold text-ink">Mentora AI</span>
        </div>

        <div className="bg-surface border border-line rounded-lg p-6 md:p-8 text-center">
          {status === 'working' && (
            <>
              <Loader2 size={30} className="text-accent animate-spin mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-ink mb-1.5">
                Confirming your address
              </h1>
              <p className="text-muted text-sm">This will only take a moment.</p>
            </>
          )}

          {status === 'done' && (
            <>
              <CheckCircle2 size={30} className="text-success mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-ink mb-1.5">Email confirmed</h1>
              <p className="text-muted text-sm leading-relaxed">
                Your account now uses{' '}
                <span className="text-ink font-medium break-all">{email}</span>. Use it
                the next time you log in.
              </p>
              <Link
                to={user ? '/profile' : '/login'}
                className="btn-primary inline-block mt-6 text-sm"
              >
                {user ? 'Back to profile' : 'Go to login'}
              </Link>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle size={30} className="text-danger mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-ink mb-1.5">
                That link didn't work
              </h1>
              <p className="text-muted text-sm leading-relaxed">{error}</p>
              <Link
                to={user ? '/profile' : '/login'}
                className="btn-secondary inline-block mt-6 text-sm"
              >
                {user ? 'Back to profile' : 'Go to login'}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmEmailChange
