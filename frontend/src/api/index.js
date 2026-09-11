import axios from 'axios'

// ─────────────────────────────────────────
// CREATE AXIOS INSTANCE
// All API calls go through this instance
// ─────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // withCredentials: true is critical
  // It tells the browser to include cookies in cross-origin requests
  // Without this, the refreshToken cookie is never sent to the backend
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─────────────────────────────────────────
// REQUEST INTERCEPTOR
// Runs before every request is sent
// Attaches the access token from memory
// ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Get the token from wherever we store it
    // We'll store it in a simple variable in this file
    // (not localStorage — that's vulnerable to XSS)
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
    // Must return config — this is the modified request
    // If you forget to return it, the request is cancelled
  },
  (error) => Promise.reject(error)
)

// ─────────────────────────────────────────
// IN-MEMORY TOKEN STORAGE
// The access token lives in memory (a plain variable)
// It's gone when the page refreshes — that's intentional
// On refresh, the refresh token cookie automatically gets a new one
// ─────────────────────────────────────────
let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

export const clearAccessToken = () => {
  accessToken = null
}

// ─────────────────────────────────────────
// REFRESH ACCESS TOKEN
// Single place that swaps the refresh-token cookie for a new access
// token. Shared by the 401 interceptor below and the socket's
// reconnect logic (socketClient.js).
//
// - Uses plain axios, not `api`, so a failed refresh (401) can never
//   be caught by the interceptor and queued behind itself — the
//   previous version deadlocked that way, hanging the request forever.
// - Concurrent callers share one in-flight request instead of each
//   firing their own refresh.
// ─────────────────────────────────────────
let refreshPromise = null

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true })
      .then((response) => {
        const newToken = response.data.accessToken
        setAccessToken(newToken)
        return newToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// ─────────────────────────────────────────
// RESPONSE INTERCEPTOR
// Runs after every response comes back
// Handles 401 errors by silently refreshing the token
// ─────────────────────────────────────────

// A 401 from these means "wrong credentials / bad link", not "access
// token expired" — refreshing and retrying would be pointless, and
// would replace their real error message with the refresh failure.
const isAuthFormRequest = (url = '') => url.startsWith('/auth/') && url !== '/auth/me'

api.interceptors.response.use(
  // Success — just pass the response through unchanged
  (response) => response,

  // Error handler
  async (error) => {
    const originalRequest = error.config

    // Only handle 401 errors, and only once per request —
    // _retry prevents an infinite refresh → retry → 401 loop
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthFormRequest(originalRequest.url)
    ) {
      originalRequest._retry = true

      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed — token is truly expired or user logged out
        clearAccessToken()
        // Dispatch a custom event so the app knows to redirect to login
        window.dispatchEvent(new Event('auth:logout'))
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api