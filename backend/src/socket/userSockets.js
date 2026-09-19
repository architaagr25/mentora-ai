// backend/src/socket/userSockets.js

// ─────────────────────────────────────────
// CUTTING OFF A USER'S LIVE CONNECTIONS
// Logging out, changing a password or resetting one all invalidate the
// user's refresh tokens — but an already-open socket keeps working,
// because it was authenticated when it connected. Someone could stay in
// a live session on a device you just logged out, or after you changed
// your password because you thought the account was compromised.
//
// Every connection joins a "user:<id>" room (see sessionSocket.js), so
// all of that user's tabs can be disconnected at once. The client then
// reconnects with a fresh token if it still has one, or is bounced to
// the login page if it doesn't.
// ─────────────────────────────────────────

let io = null

// Called once from initializeSocket — keeps this module free of an
// import back into app.js, which would be a circular import
export const registerIo = (instance) => {
  io = instance
}

export const disconnectUserSockets = (userId) => {
  if (!io || !userId) return
  // close: true also closes the underlying connection, so a client
  // can't simply carry on with the same session
  io.in(`user:${userId}`).disconnectSockets(true)
}
