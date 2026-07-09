// frontend/src/pages/Profile.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User,
  Mail,
  Calendar,
  Flame,
  Zap,
  Target,
  TrendingUp,
  Pencil,
  Loader2,
  X,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import useAuthStore from '@/store/authStore'
import api from '@/api'
import { updateProfile, changePassword } from '@/api/users'

const profileEditSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string()
    .email('Please enter a valid email'),
})

const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(72, 'New password cannot exceed 72 characters'),
    confirmNewPassword: z
      .string()
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })

const formatMemberSince = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })
}

const computeAvgMasteryScore = (sessions) => {
  const scored = sessions.filter((s) => s.scores?.length > 0)
  if (scored.length === 0) return null
  const total = scored.reduce((sum, s) => {
    const latest = s.scores[s.scores.length - 1]
    return sum + (latest.accuracy + latest.clarity + latest.completeness) / 3
  }, 0)
  return Math.round((total / scored.length) * 10)
}

const useProfileStats = () =>
  useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: async () => {
      const res = await api.get('/sessions')
      return res.data.sessions
    },
  })

const StatCard = ({ icon: Icon, color, label, value }) => (
  <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-4 md:p-5">
    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-3 ${color}`}>
      <Icon size={16} />
    </div>
    <p className="text-xl md:text-2xl font-bold text-white mb-1">{value}</p>
    <p className="text-slate-500 text-xs">{label}</p>
  </div>
)

// ─────────────────────────────────────────
// ACCOUNT INFO CARD
// ─────────────────────────────────────────
const AccountInfoCard = ({ user }) => {
  const updateUser = useAuthStore((state) => state.updateUser)
  const [isEditing, setIsEditing] = useState(false)
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileEditSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  })

  const startEditing = () => {
    reset({ name: user?.name || '', email: user?.email || '' })
    setServerError(null)
    setIsEditing(true)
  }

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      const updated = await updateProfile(data)
      updateUser(updated)
      setIsEditing(false)
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to update profile. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-5 md:p-6 h-full">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-white">Account Info</h2>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Pencil size={13} />
            Edit
          </button>
        )}
      </div>

     {!isEditing ? (
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 text-xs">Name</p>
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            </div>
          </div>
          <hr className="border-slate-800" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Mail size={16} className="text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 text-xs">Email</p>
              <p className="text-white text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <hr className="border-slate-800" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 text-xs">Member since</p>
              <p className="text-white text-sm font-medium">
                {formatMemberSince(user?.createdAt)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {serverError && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
            <input
              {...register('name')}
              type="text"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.name ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
            <input
              {...register('email')}
              type="email"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.email ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <><Loader2 size={15} className="animate-spin" />Saving...</>
              ) : (
                'Save changes'
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
              className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-white transition-all disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─────────────────────────────────────────
// CHANGE PASSWORD CARD
// ─────────────────────────────────────────
const ChangePasswordCard = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordChangeSchema),
  })

  const onSubmit = async (data) => {
    setServerError(null)
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })

      await logout()
      reset()
      navigate('/login', {
        state: { message: 'Password changed. Please log in again.' },
      })
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to change password. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-5 md:p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-slate-400" />
        <h2 className="text-lg font-semibold text-white">Change Password</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              {...register('currentPassword')}
              type={showCurrent ? 'text' : 'password'}
              className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#080D1A] border text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.currentPassword ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-red-400">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              {...register('newPassword')}
              type={showNew ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#080D1A] border text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                errors.newPassword ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-400">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Confirm New Password
          </label>
          <input
            {...register('confirmNewPassword')}
            type={showNew ? 'text' : 'password'}
            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
              errors.confirmNewPassword ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'
            }`}
          />
          {errors.confirmNewPassword && (
            <p className="mt-1 text-xs text-red-400">{errors.confirmNewPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          {isSubmitting ? (
            <><Loader2 size={15} className="animate-spin" />Changing password...</>
          ) : (
            'Change Password'
          )}
        </button>
      </form>
    </div>
  )
}

const Profile = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: sessions = [], isLoading: isLoadingStats } = useProfileStats()

  const totalSessions = sessions.length
  const avgMasteryScore = computeAvgMasteryScore(sessions)

  return (
    <div className="min-h-screen bg-[#080D1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

        {/* ─── BACK TO DASHBOARD ─── */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* ─── HEADER ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6 md:mb-8"
        >
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl md:text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-white truncate">
              {user?.name}
            </h1>
            <p className="text-slate-400 text-sm truncate">{user?.email}</p>
          </div>
        </motion.div>

        {/* ─── STATS ROW — full width, matches Dashboard's stat grid ─── */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              icon={Flame}
              color="bg-orange-500/20 text-orange-400"
              label="Current Streak"
              value={`${user?.streak || 0} days`}
            />
            <StatCard
              icon={Zap}
              color="bg-yellow-500/20 text-yellow-400"
              label="Total XP"
              value={user?.xp || 0}
            />
            <StatCard
              icon={Target}
              color="bg-cyan-500/20 text-cyan-400"
              label="Total Sessions"
              value={isLoadingStats ? '—' : totalSessions}
            />
            <StatCard
              icon={TrendingUp}
              color="bg-violet-500/20 text-violet-400"
              label="Avg Mastery Score"
              value={
                isLoadingStats
                  ? '—'
                  : avgMasteryScore !== null
                  ? `${avgMasteryScore}%`
                  : '—'
              }
            />
          </div>
        </div>

        {/* ─── ACCOUNT INFO + CHANGE PASSWORD — balanced two-column below ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <AccountInfoCard user={user} />
          <ChangePasswordCard />
        </div>

      </div>
    </div>
  )
}

export default Profile