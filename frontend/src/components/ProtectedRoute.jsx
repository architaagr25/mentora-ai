import { Navigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import RouteFallback from '@/components/RouteFallback'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Still checking if user has a valid session
  // Show a loading screen instead of redirecting prematurely
  if (isLoading) {
    return <RouteFallback />
  }

  // Session check complete — user is not logged in
  // Replace: true means the login page replaces this in history
  // so hitting back doesn't bring them back to the protected page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // User is authenticated — render the protected page
  return children
}

export default ProtectedRoute
