// frontend/src/components/VerifyEmailBanner.jsx
import { useState } from 'react'
import { MailWarning, Loader2, CheckCircle2 } from 'lucide-react'
import { resendVerification } from '@/api/users'
import useAuthStore from '@/store/authStore'

// ─────────────────────────────────────────
// UNVERIFIED EMAIL BANNER
// Deliberately not dismissible: a new session is blocked until the
// address is confirmed, so hiding the banner would leave someone
// staring at a refusal with no idea why.
// Renders nothing for a verified account, so it can sit
// unconditionally at the top of a page.
// ─────────────────────────────────────────
const VerifyEmailBanner = () => {
  const user = useAuthStore((state) => state.user)
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState(null)

  if (!user || user.emailVerified) return null

  const resend = async () => {
    setState('sending')
    setMessage(null)
    try {
      const text = await resendVerification()
      setMessage(text)
      setState('sent')
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          'Could not send the email just now. Please try again in a few minutes.'
      )
      setState('failed')
    }
  }

  return (
    <div className="mb-6 px-4 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <MailWarning size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-amber-200 text-sm font-medium">Confirm your email to start teaching</p>
          <p className="text-amber-200/70 text-xs mt-0.5 leading-relaxed">
            {state === 'sent' || state === 'failed' ? (
              <span className={state === 'failed' ? 'text-red-300' : 'text-emerald-300'}>
                {message}
              </span>
            ) : (
              <>
                We sent a link to{' '}
                <span className="text-amber-100 break-all">{user.email}</span>. Everything
                else works meanwhile — you just can't start a new session until it's
                confirmed.
              </>
            )}
          </p>
        </div>
      </div>

      <button
        onClick={resend}
        disabled={state === 'sending' || state === 'sent'}
        className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-amber-200 border border-amber-500/40 hover:bg-amber-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      >
        {state === 'sending' && <Loader2 size={13} className="animate-spin" />}
        {state === 'sent' && <CheckCircle2 size={13} />}
        {state === 'sending' ? 'Sending...' : state === 'sent' ? 'Sent' : 'Resend email'}
      </button>
    </div>
  )
}

export default VerifyEmailBanner
