// frontend/src/components/session/KeyPointsReveal.jsx
import { Check, Circle } from 'lucide-react'

// ─────────────────────────────────────────
// KEY POINTS REVEAL
// The list a complete explanation of the topic should cover, with the
// ones the final score counted as explained ticked off. Hidden during
// the session (it's the answer key for completeness) — this is where it
// finally gets shown, on the end-of-session summary and in History.
//
// coveredKeyPoints holds 1-based positions in keyPoints, so a score
// payload never has to carry the text itself.
// ─────────────────────────────────────────
const KeyPointsReveal = ({ keyPoints = [], coveredKeyPoints = [], className = '' }) => {
  if (!keyPoints.length) return null

  const covered = new Set(coveredKeyPoints)

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-white font-semibold text-sm">
          What a complete explanation covers
        </h4>
        <span className="flex-shrink-0 text-xs text-slate-400">
          {covered.size} of {keyPoints.length}
        </span>
      </div>
      <p className="text-slate-500 text-xs mb-3">
        Hidden while you were teaching, so it couldn't be used as a checklist
      </p>

      <ul className="space-y-2">
        {keyPoints.map((point, i) => {
          const isCovered = covered.has(i + 1)
          return (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                  isCovered ? 'bg-green-500/20' : 'bg-slate-800'
                }`}
              >
                {isCovered ? (
                  <Check size={10} className="text-green-400" />
                ) : (
                  <Circle size={6} className="text-slate-500" />
                )}
              </span>
              <span className={`text-sm ${isCovered ? 'text-slate-300' : 'text-slate-500'}`}>
                {point}
                {!isCovered && (
                  <span className="ml-2 text-xs text-orange-400/80">not covered</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default KeyPointsReveal
