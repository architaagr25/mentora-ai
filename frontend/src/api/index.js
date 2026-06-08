import axios from 'axios'

// ─────────────────────────────────────────
// CREATE AXIOS INSTANCE
// All API calls go through this instance
// ─────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
// RESPONSE INTERCEPTOR
// Runs after every response comes back
// Handles 401 errors by silently refreshing the token
// ─────────────────────────────────────────

// Track if we're already refreshing to prevent infinite loops
// Imagine two requests fail with 401 simultaneously
// Without this flag, both would try to refresh at the same time
// causing two refresh calls and potential race conditions
let isRefreshing = false

// Queue of requests that failed while we were refreshing
// They wait for the new token then retry
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  // Success — just pass the response through unchanged
  (response) => response,

  // Error handler
  async (error) => {
    const originalRequest = error.config

    // Only handle 401 errors
    // And only if we haven't already retried this request
    // _retry flag prevents infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing the token
        // Add this request to the queue — it will retry when refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      // Mark this request as retried so we don't loop
      originalRequest._retry = true
      isRefreshing = true

      try {
        // Try to get a new access token using the refresh token cookie
        const response = await api.post('/auth/refresh-token')
        const newToken = response.data.accessToken

        // Store the new token
        setAccessToken(newToken)

        // Update the failed request's header with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        // Resolve all queued requests with the new token
        processQueue(null, newToken)

        // Retry the original request
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed — token is truly expired or user logged out
        // Clear everything and let the app handle the logout
        processQueue(refreshError, null)
        clearAccessToken()

        // Dispatch a custom event so the app knows to redirect to login
        window.dispatchEvent(new Event('auth:logout'))

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api