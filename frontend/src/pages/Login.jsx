import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import ThemeToggle from '@/components/layout/ThemeToggle'
import api from '@/api'

const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email'),
  password: z
    .string()
    .min(1, 'Password is required'),
})

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState(null)

  // Set by ChangePasswordCard after a successful password change —
  // the backend invalidates all sessions on password change, so the
  // user is redirected here and needs to know why they were logged out.
  const infoMessage = location.state?.message || null

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    setServerError(null)

    try {
      const response = await api.post('/auth/login', data)
      const { user, accessToken } = response.data

      login(user, accessToken)
      navigate('/dashboard')
    } catch (err) {
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
          <h1 className="text-2xl font-semibold text-ink mb-2">Welcome back</h1>
          <p className="text-muted text-sm">Sign in to continue learning</p>
        </div>

        {/* Form card */}
        {/* Form card */}
        <div className="bg-surface border border-line rounded-lg p-8">

          {/* Info message — e.g. after a password change forces re-login */}
          {infoMessage && (
            <div className="alert alert-info">
              {infoMessage}
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="alert alert-danger">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email field */}
            <div>
              <label className="field-label">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={`input ${errors.email ? 'input-invalid' : ''}`}
              />
              {errors.email && (
                <p className="field-error">{errors.email.message}</p>
              )}
            </div>

           {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="field-label mb-0">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  className={`input pr-12 ${errors.password ? 'input-invalid' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="field-error">{errors.password.message}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

          </form>

          <p className="text-center text-muted text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:text-accent-hover transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login