import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Session from '@/pages/Session'
import History from '@/pages/History'
import Concepts from '@/pages/Concepts'
import Profile from '@/pages/Profile'
import ProtectedRoute from '@/components/ProtectedRoute'
import useAuth from '@/hooks/useAuth'

function App() {
  const { initialize } = useAuth()

  useEffect(() => {
    // Run once on app startup
    // Checks if the user has a valid session via refresh token cookie
    // Sets user in store if found, sets isLoading: false when done
    initialize()
  }, [])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes — wrapped in ProtectedRoute */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session"
        element={
          <ProtectedRoute>
            <Session />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:id"
        element={
          <ProtectedRoute>
            <Session />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/concepts"
        element={
          <ProtectedRoute>
            <Concepts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App