import { Routes, Route } from 'react-router-dom'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Session from '@/pages/Session'
import History from '@/pages/History'
import Concepts from '@/pages/Concepts'
import Profile from '@/pages/Profile'

// This is the routing map of your entire application
// Each Route matches a URL to a page component
// When the URL is '/', React renders the Landing page
// When the URL is '/dashboard', React renders Dashboard, etc.

function App() {
  return (
    <Routes>
      {/* Public routes - anyone can visit */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes - only logged in users (auth added in Phase 3) */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/session" element={<Session />} />
      <Route path="/session/:id" element={<Session />} />
      <Route path="/history" element={<History />} />
      <Route path="/concepts" element={<Concepts />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  )
}

export default App