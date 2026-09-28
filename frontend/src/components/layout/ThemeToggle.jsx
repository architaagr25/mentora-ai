import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme, watchSystemTheme } from '@/lib/theme'

// The one control for light/dark. The theme itself lives on <html data-theme>
// and is set before React mounts (see the inline script in index.html), so this
// component only mirrors it — it never decides the theme on first render, which
// is what would cause a flash.
// Pinned to the same corner on every page inside the app, so it is somewhere
// you learn once. Defined here rather than at each call site, which is how it
// would end up in a slightly different place on each page.
// It floats over scrolling content, so it carries its own surface: a bare
// icon would sit unreadable on top of whatever happened to scroll under it.
// z-40 clears a page's own sticky header (z-30) while every overlay still
// covers it: modal backdrops are also z-40 but render later in the tree, and
// panels and dialogs are z-50 and above.
const FLOATING =
  'fixed top-4 right-4 z-40 bg-surface/90 backdrop-blur-sm border border-line shadow-sm'

const ThemeToggle = ({ className = '', floating = false }) => {
  const [theme, setThemeState] = useState(getTheme)

  // While the person has made no explicit choice, follow the OS if it changes
  // mid-visit — someone whose machine switches at sunset expects this to too.
  useEffect(() => watchSystemTheme(setThemeState), [])

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      // The label says what will happen, not what the state is: a screen
      // reader user gets no help from being told which icon is showing.
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`p-2 rounded-lg text-muted hover:text-ink hover:bg-surface-2
                  transition-colors duration-200 cursor-pointer
                  focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-offset-2 focus-visible:outline-accent
                  ${floating ? FLOATING : ''} ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default ThemeToggle
