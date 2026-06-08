import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Brain, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuth from '@/hooks/useAuth'
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
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState(null)

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
    <div className="min-h-screen bg-[#080D1A] flex items-center justify-center px-4">
      {/* Background glow */}
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
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm">Sign in to continue learning</p>
        </div>

        {/* Form card */}
        <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-8">

          {/* Server error */}
          {serverError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
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

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  className={`w-full px-4 py-3 rounded-xl bg-[#080D1A] border text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all pr-12 ${
                    errors.password
                      ? 'border-red-500/60'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          <p className="text-center text-slate-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login