import { create } from 'zustand'
import api, { setAccessToken, clearAccessToken, refreshAccessToken } from '../api/index.js'
import { connectSocket, disconnectSocket } from '../socket/socketClient.js'

const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,

  login: (user, accessToken) => {
    setAccessToken(accessToken)
    // Connect socket when user logs in — it reads the token set above
    connectSocket()
    set({ user })
  },

  // Called after a successful PATCH /users/me — the response already
  // contains the full updated user object, so we just swap it in
  // directly rather than making a second round-trip to /auth/me.
  updateUser: (updatedUser) => {
    set({ user: updatedUser })
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // silent
    } finally {
      clearAccessToken()
      // Disconnect socket on logout
      disconnectSocket()
      set({ user: null })
    }
  },

  initialize: async () => {
    try {
      // Stores the new access token in memory on success
      await refreshAccessToken()

      // Connect socket after successful session restore — it reads
      // the token set above
      connectSocket()

      const meResponse = await api.get('/auth/me')
      set({ user: meResponse.data.user })
    } catch {
      clearAccessToken()
      set({ user: null })
    } finally {
      set({ isLoading: false })
    }
  },

  isAuthenticated: () => get().user !== null,
}))

window.addEventListener('auth:logout', () => {
  clearAccessToken()
  disconnectSocket()
  useAuthStore.setState({ user: null, isLoading: false })
})
window.addEventListener('streak:updated', async () => {
  try {
    const response = await api.get('/auth/me')
    useAuthStore.setState({ user: response.data.user })
  } catch {
    // silent
  }
})

export default useAuthStore