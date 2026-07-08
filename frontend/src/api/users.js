// frontend/src/api/users.js
import api from './index.js'

// ─────────────────────────────────────────
// UPDATE PROFILE
// Sends only the fields that changed — the backend's
// updateProfileSchema accepts name and/or email, both optional.
// Returns the full updated user object on success.
// ─────────────────────────────────────────
export const updateProfile = async (data) => {
  const response = await api.patch('/users/me', data)
  return response.data.user
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