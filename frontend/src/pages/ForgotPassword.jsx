// frontend/src/pages/ForgotPassword.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Loader2, Mail, ArrowLeft } from 'lucide-react'
import api from '@/api'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

const ForgotPassword = () => {
  const [serverError, setServerError] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      await api.post('/auth/forgot-password', data)
      // Backend always responds the same way whether or not the email
      // exists — showing this same confirmation state regardless
      // keeps that same guarantee on the frontend, revealing nothing
      // about which emails are actually registered.
      setIsSubmitted(true)
    } catch (err) {
      // Only genuine failures (validation errors, rate limiting)
      // reach here — the backend never errors just because an email
      // isn't registered.
      const message =
        err.response?.data?.message || 'Something went wrong. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen bg-[#080D1A] flex items-center justify-center px-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <span className="text-white font-semibold text-xl">
              Mentora <span className="text-cyan-400">AI</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Reset your password</h1>
          <p className="text-slate-400 text-sm">
            {isSubmitted
              ? "We've sent instructions to your inbox"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-8">
          {isSubmitted ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center mx-auto mb-5">
                <Mail size={24} className="text-cyan-400" />
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                If an account exists with that email, a password reset link is on its way. The link will expire in 1 hour.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`w-full px-4 py-3 rounded-xl bg-[#080D1A] border text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                      errors.email
                        ? 'border-red-500/60'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                Remembered your password?{' '}
                <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword