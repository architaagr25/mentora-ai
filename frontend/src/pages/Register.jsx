import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import ThemeToggle from '@/components/layout/ThemeToggle'
import api from '@/api'

// ─────────────────────────────────────────
// VALIDATION SCHEMA
// Same rules as the backend — catch errors
// before they even hit the network
// ─────────────────────────────────────────
const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string()
    .email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters'),
})

const Register = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState(null)
  // serverError is for errors that come back from the API
  // like "email already exists" — these aren't caught by Zod

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    // zodResolver bridges react-hook-form and Zod
    // The form will validate against registerSchema on submit
  })

  const onSubmit = async (data) => {
    // data is already validated and typed by Zod at this point
    setServerError(null)

    try {
      const response = await api.post('/auth/register', data)
      const { user, accessToken } = response.data

      // Store user and token in Zustand + api module
      login(user, accessToken)

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err) {
      // Extract error message from the API response
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
          <h1 className="text-2xl font-semibold text-ink mb-2">Create your account</h1>
          <p className="text-muted text-sm">Start learning by teaching today</p>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-line rounded-lg p-8">

          {/* Server error */}
          {serverError && (
            <div className="alert alert-danger">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Name field */}
            <div>
              <label className="field-label">
                Full name
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="Your name"
                className={`input ${errors.name ? 'input-invalid' : ''}`}
              />
              {errors.name && (
                <p className="field-error">{errors.name.message}</p>
              )}
            </div>

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
              <label className="field-label">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className={`input pr-12 ${errors.password ? 'input-invalid' : ''}`}
                />
                {/* Toggle password visibility */}
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
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>

          </form>

          {/* Link to login */}
          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register