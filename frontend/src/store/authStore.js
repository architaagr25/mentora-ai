import { create } from 'zustand'
import axios from 'axios'
import api, { setAccessToken, clearAccessToken } from '../api/index.js'
import { connectSocket, disconnectSocket } from '../socket/socketClient.js'

const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,

  login: (user, accessToken) => {
    setAccessToken(accessToken)
    // Connect socket when user logs in
    connectSocket(accessToken)
    set({ user })
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
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const refreshResponse = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      )
      const newAccessToken = refreshResponse.data.accessToken
      setAccessToken(newAccessToken)

      // Connect socket after successful session restore
      connectSocket(newAccessToken)

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

export default useAuthStore