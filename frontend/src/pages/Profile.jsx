// frontend/src/pages/Profile.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail,
  Calendar,
  Flame,
  Zap,
  Target,
  TrendingUp,
  Pencil,
  Loader2,
  X,
} from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import useAuthStore from '@/store/authStore'
import api from '@/api'
import { updateProfile } from '@/api/users'

const profileEditSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string()
    .email('Please enter a valid email'),
})

const formatMemberSince = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  })
}

// Same calculation Dashboard.jsx uses for avgMasteryScore —
// kept in sync so the number never disagrees between pages.
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
  <div className="bg-[#080D1A] border border-slate-800 rounded-xl p-4">
    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-3 ${color}`}>
      <Icon size={16} />
    </div>
    <p className="text-lg md:text-xl font-bold text-white mb-1">{value}</p>
    <p className="text-slate-500 text-xs">{label}</p>
  </div>
)

// ─────────────────────────────────────────
// ACCOUNT INFO CARD
// Toggles between a static display and an editable form.
// Kept as its own component since it now carries its own
// form state, separate from the page-level stats query.
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
    // Reset form fields to current values every time editing starts —
    // guards against stale values if the user opened this a while ago
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
    <div className="bg-[#0D1426] border border-slate-800 rounded-2xl p-5">
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

const Profile = () => {
  const { user } = useAuth()
  const { data: sessions = [], isLoading: isLoadingStats } = useProfileStats()

  const totalSessions = sessions.length
  const avgMasteryScore = computeAvgMasteryScore(sessions)

  return (
    <div className="min-h-screen bg-[#080D1A]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

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

        {/* ─── TWO COLUMN LAYOUT ON LARGE SCREENS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          {/* ─── ACCOUNT INFO ─── */}
          <div className="lg:col-span-1">
            <AccountInfoCard user={user} />
          </div>

          {/* ─── STATS SUMMARY ─── */}
          <div className="lg:col-span-2">
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

        </div>

      </div>
    </div>
  )
}

export default Profile