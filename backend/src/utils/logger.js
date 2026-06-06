import winston from 'winston'

// Winston is a logging library
// Instead of console.log everywhere, you use a structured logger
// Benefits:
// - Consistent format across all logs
// - Different log levels (debug, info, warn, error)
// - Can write to files in production
// - Easy to filter by level

const { combine, timestamp, printf, colorize, errors } = winston.format

// This defines how each log line looks in your terminal
// Example: [2024-01-15 14:30:22] INFO: Server started on port 5000
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`
})

const logger = winston.createLogger({
  // In production only show info and above (no debug noise)
  // In development show everything including debug
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  format: combine(
    errors({ stack: true }), // captures full error stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),

  transports: [
    // Shows logs in your terminal with colours
    new winston.transports.Console({
      format: combine(
        colorize(), // green for info, red for error, etc.
        devFormat
      ),
    }),

    // Writes only errors to a file - useful for debugging production issues
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),

    // Writes all logs to a file
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
})

export default logger