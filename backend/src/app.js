import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import logger from './utils/logger.js'

// dotenv.config() must be the FIRST thing that runs
// It loads your .env file into process.env
// Any code before this cannot access environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// ─────────────────────────────────────────
// SECURITY MIDDLEWARE
// These run on every single request
// ─────────────────────────────────────────

// Helmet automatically sets these HTTP headers:
// - X-Content-Type-Options: nosniff (stops MIME sniffing attacks)
// - X-Frame-Options: DENY (stops clickjacking)
// - X-XSS-Protection (basic XSS protection)
// - And 10+ more security headers
// One line of code, massive security improvement
app.use(helmet())

// CORS tells browsers which origins can call your API
// Without this, your frontend at localhost:5173 cannot
// make requests to your backend at localhost:5000
// Browsers enforce this - it is not optional
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // needed to send/receive cookies (JWT refresh tokens)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ─────────────────────────────────────────
// PARSING MIDDLEWARE
// ─────────────────────────────────────────

// Parses incoming JSON request bodies
// Without this: req.body = undefined
// With this: req.body = { email: "...", password: "..." }
app.use(express.json({ limit: '10mb' }))

// Parses URL-encoded bodies (standard HTML form submissions)
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Parses Cookie header and populates req.cookies
// Needed for reading JWT refresh tokens from httpOnly cookies
app.use(cookieParser())

// ─────────────────────────────────────────
// LOGGING MIDDLEWARE
// ─────────────────────────────────────────

// Morgan logs every HTTP request automatically
// Format: GET /api/health 200 3.452 ms - 89
// We pipe it through Winston so all logs are in one place
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}))

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

// Health check - most important route
// Deployment platforms ping this to know if your server is alive
// You can also use it to verify your backend is running
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Mentora AI backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
})

// Future routes added here in Phase 3+
// app.use('/api/auth', authRoutes)
// app.use('/api/sessions', sessionRoutes)
// app.use('/api/concepts', conceptRoutes)
// app.use('/api/users', userRoutes)
// app.use('/api/uploads', uploadRoutes)

// ─────────────────────────────────────────
// 404 HANDLER
// Catches any request that did not match a route above
// ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.url} not found`,
  })
})

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLER
// Any error thrown anywhere in the app lands here
// Express knows this is an error handler because it has 4 params
// The (err, req, res, next) signature is mandatory
// ─────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(err.stack)

  res.status(err.status || 500).json({
    status: 'error',
    // Never expose real error details in production
    // Attackers can use error messages to find vulnerabilities
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
  })
})

// ─────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
  logger.info(`Health check → http://localhost:${PORT}/api/health`)
})

export default app