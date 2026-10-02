import { Brain } from 'lucide-react'

// Shown while a route's chunk is still downloading, and while a protected
// route is checking the session. Both are "waiting", so they look the same:
// a route change that needs a round trip should not look different from one
// that doesn't.
const RouteFallback = () => (
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

export default RouteFallback
