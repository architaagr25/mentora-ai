// Light/dark theme, kept deliberately small and outside React.
//
// The attribute on <html> is the single source of truth — index.css keys the
// dark tokens off [data-theme='dark'] — and it is already set by the inline
// script in index.html before React mounts. Everything here only reads or
// changes it, so there is no second copy of the state to drift out of sync.

const STORAGE_KEY = 'mentora-theme'

const root = () => document.documentElement

// What the OS asks for, used only when the person has never chosen.
const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const getTheme = () => (root().dataset.theme === 'dark' ? 'dark' : 'light')

// Puts a theme on the page without recording it as a choice.
const apply = (theme) => {
  const next = theme === 'dark' ? 'dark' : 'light'

  // The light theme is the default in CSS, so it is the absence of the
  // attribute rather than data-theme="light".
  if (next === 'dark') root().dataset.theme = 'dark'
  else delete root().dataset.theme

  return next
}

export const setTheme = (theme) => {
  const next = apply(theme)

  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Private mode, or storage blocked. The theme still applies for this
    // visit; it just will not be remembered, which is not worth failing over.
  }

  return next
}

export const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark')

// Follow the OS while the person has made no explicit choice. Returns an
// unsubscribe function. Called once from the theme toggle.
export const watchSystemTheme = (onChange) => {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!media) return () => {}

  const handler = () => {
    let stored = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      // Unreadable storage means no stored choice, which is the same as
      // never having chosen — follow the system.
    }
    if (stored) return
    // apply, not setTheme: following the OS must not be recorded as a choice,
    // or the first system change would pin the theme forever.
    onChange(apply(systemTheme()))
  }

  media.addEventListener('change', handler)
  return () => media.removeEventListener('change', handler)
}
