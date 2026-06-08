import useAuthStore from '../store/authStore'

const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const initialize = useAuthStore((state) => state.initialize)

  return {
    // State
    user,
    isLoading,

    // Derived state
    // Computed directly here so components don't have to think about it
    isAuthenticated: user !== null,

    // Actions
    login,
    logout,
    initialize,
  }
}

export default useAuth