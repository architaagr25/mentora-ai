import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { getTheme, toggleTheme, watchSystemTheme } from '@/lib/theme'

// The one control for light/dark. The theme itself lives on <html data-theme>
// and is set before React mounts (see the inline script in index.html), so this
// component only mirrors it — it never decides the theme on first render, which
// is what would cause a flash.
const ThemeToggle = ({ className = '' }) => {
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
                  focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default ThemeToggle
