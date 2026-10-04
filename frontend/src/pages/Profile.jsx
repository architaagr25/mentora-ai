// frontend/src/pages/Profile.jsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm, useWatch } from 'react-hook-form'
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
  Award,
} from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import ThemeToggle from '@/components/layout/ThemeToggle'
import useAuthStore from '@/store/authStore'
import api from '@/api'
import { updateProfile, changePassword } from '@/api/users'
import XpInfo from '@/components/XpInfo'

const profileEditSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string()
    .email('Please enter a valid email'),
  // Only asked for once the email field differs from the current
  // one — see the emailChanged check in AccountInfoCard
  currentPassword: z.string().optional(),
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

const useBadges = () =>
  useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const res = await api.get('/badges')
      return res.data.badges
    },
    // Badge definitions are static and never change during a session —
    // no need to ever refetch once loaded.
    staleTime: Infinity,
  })

const StatCard = ({ icon: Icon, color, label, value, info }) => (
  <div className="bg-surface border border-line rounded-lg p-4 md:p-5">
    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-2 md:mb-3 ${color}`}>
      <Icon size={16} />
    </div>
    <p className="text-xl md:text-2xl font-semibold text-ink mb-1">{value}</p>
    <div className="flex items-center gap-1.5">
      <p className="text-muted text-xs">{label}</p>
      {info}
    </div>
  </div>
)

const BadgeCard = ({ badge, isEarned }) => (
  <div
    className={`rounded-lg p-4 md:p-5 border transition-all ${
      isEarned
        ? 'bg-surface border-accent'
        : 'bg-surface/60 border-line'
    }`}
  >
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
        isEarned
          ? 'bg-accent'
          : 'bg-surface-2'
      }`}
    >
      {isEarned ? (
        <Award size={18} className="text-ink" />
      ) : (
        <Lock size={16} className="text-muted" />
      )}
    </div>
    <p className={`font-semibold text-sm mb-1 ${isEarned ? 'text-ink' : 'text-muted'}`}>
      {badge.name}
    </p>
    <p className={`text-xs leading-relaxed ${isEarned ? 'text-muted' : 'text-muted'}`}>
      {badge.description}
    </p>
  </div>
)
const BadgesSection = ({ user }) => {
  const { data: badges = [], isLoading } = useBadges()
  const earnedIds = new Set(user?.badges || [])

  const earnedCount = badges.filter((b) => earnedIds.has(b.id)).length

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-ink">Badges</h2>
        {!isLoading && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">
            {earnedCount}/{badges.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="text-accent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} isEarned={earnedIds.has(badge.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────
// ACCOUNT INFO CARD
// ─────────────────────────────────────────
const AccountInfoCard = ({ user }) => {
  const updateUser = useAuthStore((state) => state.updateUser)
  const [isEditing, setIsEditing] = useState(false)
  const [serverError, setServerError] = useState(null)
  // Set after a successful save that started an email change — the
  // address on screen has NOT changed yet at that point, so without
  // this the save would look like it silently did nothing
  const [notice, setNotice] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileEditSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  })

  // Changing an email needs the account password; renaming does not.
  // The field only appears once the two addresses differ, so the
  // common case (fixing a typo in a name) stays a one-field edit.
  // useWatch rather than watch(): watch() hands back a function the
  // React Compiler cannot memoize, which makes it skip this whole
  // component
  const emailField = useWatch({ control, name: 'email' })
  const emailChanged = (emailField || '').trim().toLowerCase() !== (user?.email || '')

  const startEditing = () => {
    reset({ name: user?.name || '', email: user?.email || '', currentPassword: '' })
    setServerError(null)
    setNotice(null)
    setIsEditing(true)
  }

  const onSubmit = async (data) => {
    setServerError(null)

    if (emailChanged && !data.currentPassword) {
      setError('currentPassword', {
        message: 'Enter your current password to change your email',
      })
      return
    }

    try {
      const { user: updated, pendingEmail, message } = await updateProfile({
        name: data.name,
        email: data.email,
        // Never sent on a plain rename
        ...(emailChanged ? { currentPassword: data.currentPassword } : {}),
      })
      updateUser(updated)
      setNotice(pendingEmail ? message : null)
      setIsEditing(false)
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to update profile. Please try again.'
      setServerError(message)
    }
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-5 md:p-6 h-full">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-ink">Account Info</h2>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent transition-colors"
          >
            <Pencil size={13} />
            Edit
          </button>
        )}
      </div>

     {!isEditing ? (
        <div className="space-y-4 mt-4">
          {(notice || user?.pendingEmail) && (
            <div className="px-3.5 py-2.5 rounded-lg bg-accent-soft border border-accent/30 text-accent text-xs leading-relaxed">
              {notice ||
                `Waiting on confirmation at ${user.pendingEmail}. Your email stays the same until that link is opened.`}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-muted text-xs">Name</p>
              <p className="text-ink text-sm font-medium truncate">{user?.name}</p>
            </div>
          </div>
          <hr className="border-line" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
              <Mail size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-muted text-xs">Email</p>
              <p className="text-ink text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <hr className="border-line" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-muted text-xs">Member since</p>
              <p className="text-ink text-sm font-medium">
                {formatMemberSince(user?.createdAt)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {serverError && (
            <div className="alert alert-danger mb-0 text-xs">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="profile-name">
              Name
            </label>
            <input
              {...register('name')}
              id="profile-name"
              type="text"
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'profile-name-error' : undefined}
              className={`input py-2.5 ${errors.name ? 'input-invalid' : ''}`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-danger" id="profile-name-error">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="profile-email">
              Email
            </label>
            <input
              {...register('email')}
              id="profile-email"
              type="email"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'profile-email-error' : undefined}
              className={`input py-2.5 ${errors.email ? 'input-invalid' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-danger" id="profile-email-error">{errors.email.message}</p>
            )}
          </div>

          {emailChanged && (
            <div>
              <label
                className="block text-xs font-medium text-muted mb-1.5"
                htmlFor="profile-email-password"
              >
                Current password
              </label>
              <div className="relative">
                <input
                  {...register('currentPassword')}
                  id="profile-email-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={errors.currentPassword ? 'true' : 'false'}
                  className={`input py-2.5 pr-11 ${errors.currentPassword ? 'input-invalid' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.currentPassword ? (
                <p className="mt-1 text-xs text-danger">{errors.currentPassword.message}</p>
              ) : (
                <p className="mt-1.5 text-xs text-muted leading-relaxed">
                  Changing your email needs your password. We will send a link to the new
                  address — your email only changes once you open it.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 text-sm"
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
              aria-label="Cancel editing"
              className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-muted border border-line hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
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
    <div className="bg-surface border border-line rounded-lg p-5 md:p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-muted" />
        <h2 className="text-lg font-semibold text-ink">Change Password</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="alert alert-danger mb-0 text-xs">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="profile-current-password">
            Current Password
          </label>
          <div className="relative">
            <input
              {...register('currentPassword')}
              id="profile-current-password"
              type={showCurrent ? 'text' : 'password'}
              aria-invalid={errors.currentPassword ? 'true' : 'false'}
              aria-describedby={errors.currentPassword ? 'profile-current-password-error' : undefined}
              className={`input py-2.5 pr-10 ${errors.currentPassword ? 'input-invalid' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-danger" id="profile-current-password-error">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="profile-new-password">
            New Password
          </label>
          <div className="relative">
            <input
              {...register('newPassword')}
              id="profile-new-password"
              type={showNew ? 'text' : 'password'}
              aria-invalid={errors.newPassword ? 'true' : 'false'}
              aria-describedby={errors.newPassword ? 'profile-new-password-error' : undefined}
              placeholder="Min. 8 characters"
              className={`input py-2.5 pr-10 ${errors.newPassword ? 'input-invalid' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-xs text-danger" id="profile-new-password-error">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="profile-confirm-password">
            Confirm New Password
          </label>
          <input
            {...register('confirmNewPassword')}
            id="profile-confirm-password"
            type={showNew ? 'text' : 'password'}
            aria-invalid={errors.confirmNewPassword ? 'true' : 'false'}
            aria-describedby={errors.confirmNewPassword ? 'profile-confirm-password-error' : undefined}
            className={`input py-2.5 ${errors.confirmNewPassword ? 'input-invalid' : ''}`}
          />
          {errors.confirmNewPassword && (
            <p className="mt-1 text-xs text-danger" id="profile-confirm-password-error">{errors.confirmNewPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
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
    <div className="min-h-screen bg-bg">
      <ThemeToggle floating />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

        {/* ─── BACK TO DASHBOARD ─── */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-muted hover:text-ink transition-colors text-sm mb-6"
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
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-on-accent text-xl md:text-2xl font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-ink truncate">
              {user?.name}
            </h1>
            <p className="text-muted text-sm truncate">{user?.email}</p>
          </div>
        </motion.div>

        {/* ─── STATS ROW — full width, matches Dashboard's stat grid ─── */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-lg font-semibold text-ink mb-4">Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              icon={Flame}
              color="bg-highlight-soft text-highlight"
              label="Current Streak"
              value={`${user?.streak || 0} days`}
            />
            <StatCard
              icon={Zap}
              color="bg-highlight-soft text-highlight"
              label="Total XP"
              value={user?.xp || 0}
              info={<XpInfo />}
            />
            <StatCard
              icon={Target}
              color="bg-accent-soft text-accent"
              label="Total Sessions"
              value={isLoadingStats ? '—' : totalSessions}
            />
            <StatCard
              icon={TrendingUp}
              color="bg-accent-soft text-accent"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 md:mb-8">
          <AccountInfoCard user={user} />
          <ChangePasswordCard />
        </div>

        {/* ─── BADGES ─── */}
        <BadgesSection user={user} />

      </div>
    </div>
  )
}

export default Profile