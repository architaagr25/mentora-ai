// frontend/src/api/users.js
import api from './index.js'

// ─────────────────────────────────────────
// UPDATE PROFILE
// The backend's updateProfileSchema accepts name and/or email,
// both optional, plus currentPassword — required only when the
// email actually changes.
//
// Returns { user, pendingEmail, message }. A changed email is NOT
// applied here: user still carries the old address, and
// pendingEmail holds the new one until it is confirmed from that
// inbox, so the caller should show the message rather than assume
// the change went through.
// ─────────────────────────────────────────
export const updateProfile = async (data) => {
  const response = await api.patch('/users/me', data)
  return response.data
}

// ─────────────────────────────────────────
// CONFIRM AN EMAIL CHANGE
// Public on purpose — the link arrives in the new inbox, which may
// be open in a browser where nobody is logged in.
// ─────────────────────────────────────────
export const confirmEmailChange = async (token) => {
  const response = await api.post('/auth/confirm-email-change', { token })
  return response.data
}

// ─────────────────────────────────────────
// VERIFY AN EMAIL ADDRESS
// Public for the same reason: the link is opened from the inbox,
// often on a phone with no session. Returns the updated user, so a
// signed-in caller can drop the banner without another round-trip.
// ─────────────────────────────────────────
export const verifyEmail = async (token) => {
  const response = await api.post('/auth/verify-email', { token })
  return response.data
}

// ─────────────────────────────────────────
// RESEND THE VERIFICATION EMAIL
// Goes to the address on the logged-in account — the caller cannot
// choose one. Rate-limited to 3 an hour per IP on the server.
// ─────────────────────────────────────────
export const resendVerification = async () => {
  const response = await api.post('/auth/resend-verification')
  return response.data.message
}

// ─────────────────────────────────────────
// CHANGE PASSWORD
// Note: on success, the backend clears all refresh tokens
// (including the current session's) — the caller is responsible
// for logging the user out and redirecting to /login afterward.
// ─────────────────────────────────────────
export const changePassword = async (data) => {
  const response = await api.post('/users/change-password', data)
  return response.data.message
}