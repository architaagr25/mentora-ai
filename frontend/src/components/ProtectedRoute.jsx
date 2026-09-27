import { Navigate } from 'react-router-dom'
import { Brain } from 'lucide-react'
import useAuth from '@/hooks/useAuth'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Still checking if user has a valid session
  // Show a loading screen instead of redirecting prematurely
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* A ring that turns, not a logo that pulses: a pulse is reserved
              for things that are genuinely live, and this is just waiting. */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-line border-t-accent animate-spin" />
            <Brain size={20} className="text-accent" />
          </div>
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    )
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
