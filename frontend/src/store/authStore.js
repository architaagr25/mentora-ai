import { create } from 'zustand'
import axios from 'axios'
import api, { setAccessToken, clearAccessToken } from '../api/index.js'

const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,

  login: (user, accessToken) => {
    setAccessToken(accessToken)
    set({ user })
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // silent
    } finally {
      clearAccessToken()
      set({ user: null })
    }
  },

  initialize: async () => {
    try {
      // Use plain axios directly — bypasses the interceptor
      // so a 401 here doesn't trigger infinite retry loop
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const refreshResponse = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      )
      const newAccessToken = refreshResponse.data.accessToken
      setAccessToken(newAccessToken)

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
  useAuthStore.setState({ user: null, isLoading: false })
})

export default useAuthStore