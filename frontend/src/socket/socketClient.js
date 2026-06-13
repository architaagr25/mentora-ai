import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000'
// Remove /api from the base URL
// Socket.io connects to the server root, not /api

// ─────────────────────────────────────────
// CREATE SOCKET INSTANCE
// autoConnect: false — we manually connect after login
// so we can pass the auth token at connection time
// ─────────────────────────────────────────
const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
})

// ─────────────────────────────────────────
// RECONNECTION HANDLING
// If the socket drops and reconnects (wifi blip, laptop sleep),
// Socket.io creates a new connection — any rooms we'd joined are gone.
// We listen for 'connect' and re-join the active session room if we have one.
// ─────────────────────────────────────────
let activeSessionId = null

socket.on('connect', () => {
  if (activeSessionId) {
    socket.emit('join_session', { sessionId: activeSessionId })
  }
})

// ─────────────────────────────────────────
// CONNECT WITH TOKEN
// Called after login with the access token
// ─────────────────────────────────────────
export const connectSocket = (token) => {
  // Set the auth token before connecting
  socket.auth = { token }

  if (!socket.connected) {
    socket.connect()
  }
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
export const sendMessage = (content) => {
  socket.emit('send_message', { content })
}

export const requestScore = () => {
  socket.emit('request_score')
}

export const endSession = () => {
  socket.emit('end_session')
}

// Export the socket instance for listening to events
export default socket