import logger from '../utils/logger.js'

// A helper class so we can create errors with a status code attached
// Instead of a generic Error, we create an AppError with a specific HTTP status
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message)         // calls Error constructor, sets this.message
    this.statusCode = statusCode
    this.isOperational = true
    // isOperational = true means this is an expected error we created on purpose
    // (wrong password, email taken, etc)
    // isOperational = false would mean an unexpected crash (bug in code)
  }
}

// The actual error handler middleware — 4 params is what makes Express recognise it
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code was set
  let statusCode = err.statusCode || 500
  let message = err.message || 'Something went wrong'

  // Handle Mongoose validation errors
  // These happen when data fails schema rules in the User model
  if (err.name === 'ValidationError') {
    statusCode = 400
    // Mongoose puts all field errors in err.errors
    // We map them into a clean array of messages
    message = Object.values(err.errors).map(e => e.message).join(', ')
  }

  // Handle Mongoose duplicate key error
  // Happens when you try to register with an email that already exists
  if (err.code === 11000) {
    statusCode = 409 // 409 Conflict
    const field = Object.keys(err.keyValue)[0] // which field caused the conflict
    message = `An account with that ${field} already exists`
  }

  // Handle JWT errors — we'll use these in the auth middleware later
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // Log the full error on the server so you can debug
  // But only log stack traces for unexpected errors
  if (!err.isOperational) {
    logger.error(err.stack)
  } else {
    logger.warn(`${statusCode} — ${message}`)
  }

  res.status(statusCode).json({
    status: 'error',
    message:
      // In production, hide internal error details from the client
      // Only show the real message if it's an operational error we created
      process.env.NODE_ENV === 'production' && !err.isOperational
        ? 'Something went wrong'
        : message,
  })
}

export default errorHandler