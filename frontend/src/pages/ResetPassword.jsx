// frontend/src/pages/ResetPassword.jsx
import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import api from '@/api'

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
          <h1 className="text-2xl font-bold text-white mb-2">Set a new password</h1>
          <p className="text-slate-400 text-sm">
            {isSuccess
              ? 'Redirecting you to sign in...'
              : 'Choose a new password for your account'}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-8">
          {isSuccess ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={24} className="text-green-400" />
              </div>
              <p className="text-slate-300 text-sm">
                Your password has been reset successfully.
              </p>
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
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('newPassword')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 rounded-xl bg-[#080D1A] border text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all pr-12 ${
                        errors.newPassword
                          ? 'border-red-500/60'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    {...register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-xl bg-[#080D1A] border text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                      errors.confirmPassword
                        ? 'border-red-500/60'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>
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