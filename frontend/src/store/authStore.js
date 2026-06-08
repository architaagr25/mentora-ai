import { create } from 'zustand'
import api, { setAccessToken, clearAccessToken } from '../api/index.js'

const useAuthStore = create((set, get) => ({
  // ─────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────
  user: null,
  isLoading: true,
  // isLoading starts as true
  // The app shows a loading screen until initialize() completes
  // This prevents the protected route from redirecting to login
  // before we've even checked if the user has a valid session

  // ─────────────────────────────────────────
  // LOGIN
  // Called after a successful login or register API response
  // Receives the data that came back from the server
  // ─────────────────────────────────────────
  login: (user, accessToken) => {
    // Store token in the api module for request interceptor
    setAccessToken(accessToken)
    // Store user in the Zustand store for components to read
    set({ user })
  },

  // ─────────────────────────────────────────
  // LOGOUT
  // Clears all auth state and calls the logout endpoint
  // ─────────────────────────────────────────
  logout: async () => {
    try {
      // Tell the server to clear the refresh token from DB
      // and clear the httpOnly cookie
      await api.post('/auth/logout')
    } catch {
      // Even if the server call fails, clear the client state
      // The user should always be able to log out
    } finally {
      clearAccessToken()
      set({ user: null })
    }
  },

  // ─────────────────────────────────────────
  // INITIALIZE
  // Called once when the app first loads
  // Checks if the user has a valid session by attempting
  // to get a new access token using the refresh token cookie
  // If successful, fetches the user profile
  // ─────────────────────────────────────────
  initialize: async () => {
    try {
      // Try to get a new access token using the cookie
      // If the cookie is expired or missing, this throws a 401
      const refreshResponse = await api.post('/auth/refresh-token')
      const newAccessToken = refreshResponse.data.accessToken

      // Store the new token
      setAccessToken(newAccessToken)

      // Now fetch the current user's profile
      const meResponse = await api.get('/auth/me')
      set({ user: meResponse.data.user })
    } catch {
      // No valid session — user needs to log in
      // This is normal, not an error worth logging
      clearAccessToken()
      set({ user: null })
    } finally {
      // Always set isLoading to false when done
      // Whether we found a session or not
      set({ isLoading: false })
    }
  },

  // ─────────────────────────────────────────
  // COMPUTED — is the user logged in?
  // A simple helper components can use
  // ─────────────────────────────────────────
  isAuthenticated: () => get().user !== null,
}))

// ─────────────────────────────────────────
// LISTEN FOR FORCED LOGOUT EVENT
// When the axios interceptor can't refresh the token
// it fires this event — we respond by clearing auth state
// This is how the api module (non-React) communicates
// with the Zustand store (React world)
// ─────────────────────────────────────────
window.addEventListener('auth:logout', () => {
  clearAccessToken()
  useAuthStore.setState({ user: null, isLoading: false })
})

export default useAuthStore