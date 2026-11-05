import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },                          // payload
    process.env.JWT_ACCESS_SECRET,       // secret key
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  )
}

// One stored token per signed-in browser. Only an explicit logout ever
// removed one, so an account that signed in repeatedly grew an unbounded
// array inside its own document — one real account had eighteen.
export const MAX_REFRESH_TOKENS = 5

// Drops tokens the JWT itself has already expired, then keeps the newest
// few. Tokens are appended on login, so the newest are at the end.
//
// The cap is a device limit as much as a size limit: signing in on a sixth
// browser signs out the first. That is the intended trade — an abandoned
// session staying valid for a week is how someone else's login ends up
// restored on a shared machine.
export const pruneRefreshTokens = (tokens = []) => {
  const live = tokens.filter((token) => {
    try {
      jwt.verify(token, process.env.JWT_REFRESH_SECRET)
      return true
    } catch {
      return false
    }
  })
  return live.slice(-MAX_REFRESH_TOKENS)
}

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  )
}