// frontend/src/pages/VerifyEmail.jsx
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Brain, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { verifyEmail } from '@/api/users'
import useAuthStore from '@/store/authStore'

// ─────────────────────────────────────────
// VERIFY EMAIL
// Opened from the link in the registration email. Works logged out —
// that inbox is often read on a phone, in a browser with no session.
// The token in the URL is the whole proof, so there is nothing to
// ask the visitor and the request goes out on mount.
// ─────────────────────────────────────────
const VerifyEmail = () => {
  const { token } = useParams()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)

  const [status, setStatus] = useState('working')
  const [error, setError] = useState(null)

  // StrictMode runs effects twice; the second call would fail on a
  // spent token and show an error after a success
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    verifyEmail(token)
      .then((data) => {
        setStatus('done')
        // Same browser, already signed in: drop the banner immediately
        if (user) updateUser(data.user ?? { ...user, emailVerified: true })
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'This link is invalid or has expired. Log in and ask for a new one.'
        )
        setStatus('failed')
      })
    // Runs once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
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
                Confirming your email
              </h1>
              <p className="text-muted text-sm">This will only take a moment.</p>
            </>
          )}

          {status === 'done' && (
            <>
              <CheckCircle2 size={30} className="text-success mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-ink mb-1.5">You're all set</h1>
              <p className="text-muted text-sm leading-relaxed">
                Your email is confirmed. Pick a concept you think you understand, and go
                explain it.
              </p>
              <Link
                to={user ? '/dashboard' : '/login'}
                className="btn-primary inline-block mt-6 text-sm"
              >
                {user ? 'Go to dashboard' : 'Log in'}
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
                to={user ? '/dashboard' : '/login'}
                className="btn-secondary inline-block mt-6 text-sm"
              >
                {user ? 'Go to dashboard' : 'Log in'}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
