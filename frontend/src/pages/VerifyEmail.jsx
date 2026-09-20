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
    <div className="min-h-screen bg-[#080D1A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Brain size={26} className="text-violet-400" />
          <span className="text-xl font-bold text-white">Mentora AI</span>
        </div>

        <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-6 md:p-8 text-center">
          {status === 'working' && (
            <>
              <Loader2 size={30} className="text-violet-400 animate-spin mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-white mb-1.5">
                Confirming your email
              </h1>
              <p className="text-slate-400 text-sm">This will only take a moment.</p>
            </>
          )}

          {status === 'done' && (
            <>
              <CheckCircle2 size={30} className="text-emerald-400 mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-white mb-1.5">You're all set</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your email is confirmed. Pick a concept you think you understand, and go
                explain it.
              </p>
              <Link
                to={user ? '/dashboard' : '/login'}
                className="inline-block mt-6 px-5 py-2.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all"
              >
                {user ? 'Go to dashboard' : 'Log in'}
              </Link>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle size={30} className="text-red-400 mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-white mb-1.5">
                That link didn't work
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
              <Link
                to={user ? '/dashboard' : '/login'}
                className="inline-block mt-6 px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all"
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
