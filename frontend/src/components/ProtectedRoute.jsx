import { Navigate } from 'react-router-dom'
import { Brain } from 'lucide-react'
import useAuth from '@/hooks/useAuth'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Still checking if user has a valid session
  // Show a loading screen instead of redirecting prematurely
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center animate-pulse">
            <Brain size={24} className="text-white" />
          </div>
          <p className="text-slate-500 text-sm">Loading...</p>
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