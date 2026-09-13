import { io } from 'socket.io-client'
import { getAccessToken, refreshAccessToken } from '../api/index.js'

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000'
// Remove /api from the base URL
// Socket.io connects to the server root, not /api

// ─────────────────────────────────────────
// CREATE SOCKET INSTANCE
// autoConnect: false — we manually connect after login
//
// auth is a FUNCTION, not a fixed { token } object: socket.io calls it
// on every connect *and every reconnect*, so each handshake uses the
// newest access token in memory. With a fixed object, a reconnect
// after the 15-minute access token expired (laptop sleep, wifi drop)
// kept sending the old token and was rejected with "Invalid token".
// Any refresh — by the API interceptor, on page load, or below —
// updates the in-memory token, so this picks it up automatically.
// ─────────────────────────────────────────
const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  auth: (cb) => cb({ token: getAccessToken() }),
})

// ─────────────────────────────────────────
// RECONNECTION HANDLING
// If the socket drops and reconnects (wifi blip, laptop sleep),
// Socket.io creates a new connection — any rooms we'd joined are gone.
// We listen for 'connect' and re-join the active session room if we have one.
// ─────────────────────────────────────────
let activeSessionId = null

// Consecutive auth-rejected handshakes, reset on every successful
// connect. Caps the refresh → reconnect loop if the server keeps
// rejecting even fresh tokens (e.g. a misconfigured JWT secret).
const MAX_AUTH_RETRIES = 2
let authRetries = 0

// Error messages from the server's io.use() auth middleware
// (backend/src/socket/sessionSocket.js)
const EXPIRED_TOKEN_ERRORS = new Set(['Invalid token', 'Authentication required'])

socket.on('connect', () => {
  authRetries = 0
  if (activeSessionId) {
    socket.emit('join_session', { sessionId: activeSessionId })
  }
})

// ─────────────────────────────────────────
// CONNECT ERROR
// Network errors (server down, no internet): socket.io keeps retrying
// on its own — nothing to do here.
// Auth errors: socket.io does NOT retry after its middleware rejects
// the handshake, so refresh the access token and reconnect manually.
// If the refresh itself fails, the login is truly gone — log out.
// ─────────────────────────────────────────
socket.on('connect_error', async (err) => {
  if (err.message === 'User not found') {
    window.dispatchEvent(new Event('auth:logout'))
    return
  }
  if (!EXPIRED_TOKEN_ERRORS.has(err.message)) return

  if (authRetries >= MAX_AUTH_RETRIES) {
    window.dispatchEvent(new Event('socket:auth_failed'))
    return
  }
  authRetries += 1

  try {
    await refreshAccessToken()
    socket.connect() // auth() above reads the fresh token
  } catch {
    window.dispatchEvent(new Event('auth:logout'))
  }
})

// ─────────────────────────────────────────
// CONNECT
// Called after login / session restore, once the access token has
// been stored in memory with setAccessToken().
// ─────────────────────────────────────────
export const connectSocket = () => {
  // If a socket is already connected (e.g. from a previous account
  // that logged in earlier in this same browser tab without ever
  // logging out), it keeps using whatever identity it authenticated
  // with at ITS original handshake — a new token doesn't
  // re-authenticate an already-connected socket. That caused a real
  // bug: a new account's sessions failed to join with "Not authorised".
  //
  // Force a full disconnect + reconnect every time this is called,
  // so the socket's identity always matches whichever account most
  // recently logged in — never a stale one.
  if (socket.connected) {
    socket.disconnect()
  }

  authRetries = 0
  socket.connect()
}

// ─────────────────────────────────────────
// DISCONNECT
// Called on logout
// ─────────────────────────────────────────
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect()
  }
  activeSessionId = null
}

// ─────────────────────────────────────────
// SESSION EVENTS — EMIT
// ─────────────────────────────────────────
export const joinSession = (sessionId) => {
  activeSessionId = sessionId
  socket.emit('join_session', { sessionId })
}

// Called when leaving the session page — stops a later reconnect
// (e.g. while on the Dashboard) from re-joining that old session
export const leaveSession = () => {
  activeSessionId = null
}
export const sendMessage = (content) => {
  socket.emit('send_message', { content })
}

export const requestScore = () => {
  socket.emit('request_score')
}

// Ask the server to generate a reply for the last user message —
// used when the previous attempt failed
export const retryResponse = () => {
  socket.emit('retry_response')
}

export const endSession = () => {
  socket.emit('end_session')
}

// Export the socket instance for listening to events
export default socket
