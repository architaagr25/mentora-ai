// frontend/src/components/XpInfo.jsx
import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

const VIEWPORT_MARGIN = 8 // px kept clear of every screen edge
const GAP = 8 // px between the icon and the popover
const HOVER_CLOSE_DELAY = 120 // ms — lets the pointer cross from icon to popover

// ─────────────────────────────────────────
// XP INFO — "how scoring & XP work" popover
// Opens on hover and keyboard focus (desktop) and on tap (mobile).
//
// Rendered in a portal with fixed positioning, and clamped to the
// viewport after measuring — so it can never be cut off by the screen
// edge or by a parent with overflow hidden (e.g. the score panel).
// `align` is only the preferred side; it flips / shifts when needed.
//
// Keep the numbers here in sync with backend/src/utils/gamification.js
// ─────────────────────────────────────────
const XpInfo = ({ align = 'right', className = '' }) => {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null) // { top, left } once measured
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const closeTimerRef = useRef(null)
  const isHoveringRef = useRef(false)
  const popoverId = useId()

  const cancelClose = () => clearTimeout(closeTimerRef.current)
  const openNow = () => {
    cancelClose()
    setOpen(true)
  }
  const closeSoon = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY)
  }
  const onHoverStart = () => {
    isHoveringRef.current = true
    openNow()
  }
  const onHoverEnd = () => {
    isHoveringRef.current = false
    closeSoon()
  }
  // Clicking inside the popover blurs the button — don't close it
  // out from under the pointer in that case
  const onButtonBlur = () => {
    if (!isHoveringRef.current) closeSoon()
  }

  useEffect(() => () => clearTimeout(closeTimerRef.current), [])

  // Measure the popover and place it fully inside the viewport.
  // Runs as a layout effect, so each open is re-measured before the
  // browser paints — a leftover position from last time never shows.
  useLayoutEffect(() => {
    if (!open) return

    const place = () => {
      const button = buttonRef.current
      const popover = popoverRef.current
      if (!button || !popover) return

      const anchor = button.getBoundingClientRect()
      const { offsetWidth: width, offsetHeight: height } = popover
      const vw = window.innerWidth
      const vh = window.innerHeight

      // Horizontal: preferred side, then shifted back inside the screen
      let left = align === 'left' ? anchor.left : anchor.right - width
      left = Math.min(Math.max(left, VIEWPORT_MARGIN), vw - width - VIEWPORT_MARGIN)

      // Vertical: below the icon, or above it if there's no room below
      let top = anchor.bottom + GAP
      const fitsBelow = top + height <= vh - VIEWPORT_MARGIN
      const topIfAbove = anchor.top - GAP - height
      if (!fitsBelow && topIfAbove >= VIEWPORT_MARGIN) top = topIfAbove
      top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - height - VIEWPORT_MARGIN))

      setPosition({ top, left })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true) // true = also inner scroll areas
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align])

  // Close on outside tap / Escape — needed for the tap-to-open case
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !popoverRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span className={`inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="How scoring and XP work"
        aria-expanded={open}
        aria-controls={popoverId}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        // Open (not toggle) — a click also fires focus first, so
        // toggling here would immediately close what focus opened.
        // Tapping outside or pressing Escape closes it.
        onClick={openNow}
        onFocus={openNow}
        onBlur={onButtonBlur}
        className="text-slate-500 hover:text-slate-300 focus:text-slate-300 focus:outline-none transition-colors"
      >
        <Info size={14} />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="tooltip"
            onMouseEnter={onHoverStart}
            onMouseLeave={onHoverEnd}
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              // Hidden until measured, so it never flashes in the wrong spot
              visibility: position ? 'visible' : 'hidden',
            }}
            className="fixed z-[70] w-72 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] overflow-y-auto rounded-xl border border-slate-700 bg-[#0D1426] p-4 text-left shadow-2xl"
          >
            <p className="text-white text-sm font-semibold mb-2">How you're scored</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Each score rates your explanation on <span className="text-slate-200">accuracy</span>,{' '}
              <span className="text-slate-200">clarity</span> and{' '}
              <span className="text-slate-200">completeness</span> (0–10 each). Your score is the
              average of the three, shown as a percentage.
            </p>

            <p className="text-white text-sm font-semibold mb-2">How XP works</p>
            <ul className="text-slate-400 text-xs leading-relaxed space-y-1.5 list-disc pl-4">
              <li>
                A score of <span className="text-slate-200">70% or more</span> earns{' '}
                <span className="text-slate-200">20 XP + 1 XP per point above 70%</span> — up to 50
                XP at 100%.
              </li>
              <li>
                Each session pays out for its{' '}
                <span className="text-slate-200">best score only</span>. A new score earns just the
                extra XP over your previous best in that session.
              </li>
              <li>You need at least 2 messages to get a score, and something new to rescore.</li>
            </ul>

            <p className="text-slate-500 text-xs leading-relaxed mt-3 pt-3 border-t border-slate-800">
              Example: 80% → +30 XP. Rescore at 90% → +10 more. Rescore at 75% → +0 (your best is
              still 90%).
            </p>
          </div>,
          document.body
        )}
    </span>
  )
}

export default XpInfo
