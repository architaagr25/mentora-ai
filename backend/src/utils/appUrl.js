// backend/src/utils/appUrl.js

// ─────────────────────────────────────────
// THE ONE URL THAT GOES IN EMAILS
// FRONTEND_URL is a CORS allow-list and may hold several origins:
//   FRONTEND_URL=http://localhost:5173,https://mentora-ai-khaki.vercel.app
// Dropping that straight into a link produced a broken address
// ("http://localhost:5173,https://...vercel.app/reset-password/abc"),
// so every reset and welcome link in a multi-origin deployment was
// dead. APP_URL is deliberately a single URL: the address this
// server should send people back to.
//
// The FRONTEND_URL fallback only exists so an install that hasn't
// set APP_URL yet still produces a usable link — it takes the first
// entry, not the whole list.
// ─────────────────────────────────────────
export const getAppUrl = () => {
  const explicit = (process.env.APP_URL || '').trim()
  const fallback = (process.env.FRONTEND_URL || '').split(',')[0].trim()
  const url = explicit || fallback || 'http://localhost:5173'

  // A trailing slash would double up against the path we append
  return url.replace(/\/+$/, '')
}
