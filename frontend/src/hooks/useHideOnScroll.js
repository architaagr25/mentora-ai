import { useEffect, useRef, useState } from 'react'

// Near the top of the page the bar is always shown, whichever way the last
// scroll went — hiding it there feels like a glitch rather than a feature.
const ALWAYS_VISIBLE_Y = 80

// Trackpads and phones emit a stream of 1–2px scroll events, including small
// bounces in the opposite direction. Anything under this is not a decision.
const JITTER_PX = 6

/**
 * Hides a fixed bar when the page is scrolled down and brings it straight
 * back on any real upward movement — you should not have to scroll to the top
 * to reach the nav.
 *
 * Returns { visible, reset }. Call reset() after scrolling the page in code:
 * a programmatic jump is not the user scrolling, and without it the bar
 * hides itself on a restore.
 */
const useHideOnScroll = ({ onScroll } = {}) => {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)

  // Kept in a ref so a caller can pass an inline function without the
  // listener being torn down and rebuilt on every render. Assigned in an
  // effect rather than during render, which React does not allow.
  const onScrollRef = useRef(onScroll)
  useEffect(() => {
    onScrollRef.current = onScroll
  }, [onScroll])

  useEffect(() => {
    lastY.current = window.scrollY
    let frame = null

    const handle = () => {
      // Scroll fires far more often than the screen refreshes; coalescing to
      // one frame keeps this off the main thread's critical path.
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = null
        const y = window.scrollY
        onScrollRef.current?.(y)

        if (y < ALWAYS_VISIBLE_Y) {
          setVisible(true)
          lastY.current = y
          return
        }

        const delta = y - lastY.current
        if (Math.abs(delta) > JITTER_PX) {
          setVisible(delta < 0)
          lastY.current = y
        }
      })
    }

    window.addEventListener('scroll', handle, { passive: true })
    return () => {
      window.removeEventListener('scroll', handle)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const reset = () => {
    lastY.current = window.scrollY
    setVisible(true)
  }

  return { visible, reset }
}

export default useHideOnScroll
