import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },                          // payload
    process.env.JWT_ACCESS_SECRET,       // secret key
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  )
}

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  )
}