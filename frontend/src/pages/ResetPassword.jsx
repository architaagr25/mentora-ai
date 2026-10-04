// frontend/src/pages/ResetPassword.jsx
import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import api from '@/api'
import ThemeToggle from '@/components/layout/ThemeToggle'

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password cannot exceed 72 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const ResetPassword = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      })
      setIsSuccess(true)
      // Brief pause so the success state is actually visible before
      // redirecting — same pattern already used elsewhere in this app
      // (e.g. Session.jsx's end-session confirm closing after a delay).
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password reset successfully. Please log in.' },
        })
      }, 2000)
    } catch (err) {
      const message =
        err.response?.data?.message ||
        'This reset link is invalid or has expired. Please request a new one.'
      setServerError(message)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <ThemeToggle floating />

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
          <h1 className="text-2xl font-semibold text-ink mb-2">Set a new password</h1>
          <p className="text-muted text-sm">
            {isSuccess
              ? 'Redirecting you to sign in...'
              : 'Choose a new password for your account'}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-line rounded-lg p-8">
          {isSuccess ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-lg bg-success-soft border border-success/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={24} className="text-success" />
              </div>
              <p className="text-ink text-sm">
                Your password has been reset successfully.
              </p>
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
                  <label className="field-label" htmlFor="reset-new-password">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('newPassword')}
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      aria-invalid={errors.newPassword ? 'true' : 'false'}
                      aria-describedby={errors.newPassword ? 'reset-new-password-error' : undefined}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className={`input pr-12 ${errors.newPassword ? 'input-invalid' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="field-error" id="reset-new-password-error">{errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="field-label" htmlFor="reset-confirm-password">
                    Confirm New Password
                  </label>
                  <input
                    {...register('confirmPassword')}
                    id="reset-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    aria-describedby={errors.confirmPassword ? 'reset-confirm-password-error' : undefined}
                    autoComplete="new-password"
                    className={`input ${errors.confirmPassword ? 'input-invalid' : ''}`}
                  />
                  {errors.confirmPassword && (
                    <p className="field-error" id="reset-confirm-password-error">{errors.confirmPassword.message}</p>
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
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword