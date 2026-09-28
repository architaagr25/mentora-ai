// frontend/src/pages/ForgotPassword.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Loader2, Mail, ArrowLeft } from 'lucide-react'
import api from '@/api'
import ThemeToggle from '@/components/layout/ThemeToggle'

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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <ThemeToggle className="fixed top-4 right-4 z-50" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Brain size={20} className="text-on-accent" />
            </div>
            <span className="text-ink font-semibold text-xl">
              Mentora <span className="text-accent">AI</span>
            </span>
          </Link>
          <h1 className="text-2xl font-semibold text-ink mb-2">Reset your password</h1>
          <p className="text-muted text-sm">
            {isSubmitted
              ? "We've sent instructions to your inbox"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-line rounded-lg p-8">
          {isSubmitted ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center mx-auto mb-5">
                <Mail size={24} className="text-accent" />
              </div>
              <p className="text-ink text-sm leading-relaxed mb-6">
                If an account exists with that email, a password reset link is on its way. The link will expire in 1 hour.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors text-sm"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="alert alert-danger">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="field-label">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`input ${errors.email ? 'input-invalid' : ''}`}
                  />
                  {errors.email && (
                    <p className="field-error">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
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

              <p className="text-center text-muted text-sm mt-6">
                Remembered your password?{' '}
                <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
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