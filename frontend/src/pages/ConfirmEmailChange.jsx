// frontend/src/pages/ConfirmEmailChange.jsx
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Brain, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { confirmEmailChange } from '@/api/users'
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
                Confirming your address
              </h1>
              <p className="text-slate-400 text-sm">This will only take a moment.</p>
            </>
          )}

          {status === 'done' && (
            <>
              <CheckCircle2 size={30} className="text-emerald-400 mx-auto mb-4" />
              <h1 className="text-lg font-semibold text-white mb-1.5">Email confirmed</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your account now uses{' '}
                <span className="text-white font-medium break-all">{email}</span>. Use it
                the next time you log in.
              </p>
              <Link
                to={user ? '/profile' : '/login'}
                className="inline-block mt-6 px-5 py-2.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all"
              >
                {user ? 'Back to profile' : 'Go to login'}
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
                to={user ? '/profile' : '/login'}
                className="inline-block mt-6 px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all"
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
