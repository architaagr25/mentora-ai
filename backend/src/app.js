import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import logger from './utils/logger.js'
import errorHandler from './middleware/errorHandler.js'
import { generalLimiter } from './middleware/rateLimiter.js'
import authRoutes from './routes/auth.js'
import connectDB from './config/db.js'
import sessionRoutes from './routes/sessions.js'
import usersRoutes from './routes/users.js'
import badgesRoutes from './routes/badges.js'
import { createServer } from 'http'
import { Server } from 'socket.io'
import initializeSocket from './socket/sessionSocket.js'
// dotenv.config() must be the FIRST thing that runs
// It loads your .env file into process.env
// Any code before this cannot access environment variables
dotenv.config()


const app = express()
const PORT = process.env.PORT || 5000

// Render (and most hosting platforms) sit the app behind a reverse
// proxy, which forwards the real client IP via X-Forwarded-For.
// Express doesn't trust this header by default — for good reason,
// since it can be spoofed by a client directly if there's no actual
// trusted proxy in front. Since we ARE genuinely behind Render's
// proxy, we tell Express to trust exactly one hop, so
// express-rate-limit (loginLimiter, passwordResetLimiter, etc.) can
// correctly identify each real client's IP instead of erroring or
// misidentifying everyone as the same "user".
app.set('trust proxy', 1)

// ─────────────────────────────────────────
// CORS ALLOWED ORIGINS
// Supports multiple origins (local dev + deployed frontend)
// instead of a single FRONTEND_URL string. FRONTEND_URL can
// optionally hold a comma-separated list, e.g.:
//   FRONTEND_URL=http://localhost:5173,https://mentora-ai-khaki.vercel.app
// Local dev origin is always included so switching FRONTEND_URL
// to a deployed value never breaks localhost testing.
// ─────────────────────────────────────────
const DEFAULT_ORIGINS = ['http://localhost:5173']

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

const allowedOrigins = [...new Set([...DEFAULT_ORIGINS, ...configuredOrigins])]

// Shared by both Express CORS and Socket.io CORS below —
// keeps the two allow-lists from drifting apart
const corsOriginHandler = (origin, callback) => {
  // No origin (curl, Postman, server-to-server calls) — allow it
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true)
  } else {
    logger.warn(`Blocked by CORS: origin "${origin}" not in allow-list`)
    callback(new Error('Not allowed by CORS'))
  }
}

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
  origin: corsOriginHandler,
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

// Prevent the browser from ever serving cached API responses.
// Without this, Express's default auto-generated ETag headers can
// cause the browser to return a stale cached body via 304 Not
// Modified — which is exactly why a profile update didn't show up
// after reload: GET /auth/me was served from cache instead of
// hitting the server for fresh user data.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.use('/api', generalLimiter)
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


app.use('/api/auth', authRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/badges', badgesRoutes)


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

app.use(errorHandler)
// ─────────────────────────────────────────
// SOCKET.IO SETUP
// Attach Socket.io to the HTTP server
// ─────────────────────────────────────────
export const httpServer = createServer(app)
// We export httpServer so sessionSocket.js can import io

export const io = new Server(httpServer, {
  cors: {
    origin: corsOriginHandler,
    credentials: true,
    // Must match the Express CORS config above —
    // otherwise the browser will block the WebSocket handshake
    // even when the REST API calls succeed.
  },
})

// Initialize socket handlers
initializeSocket(io)
// ─────────────────────────────────────────
// CONNECT TO DATABASE THEN START SERVER
// ─────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB()
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
      logger.info(`Health check → http://localhost:${PORT}/api/health`)
      logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`)
    })
  } catch (err) {
    logger.error('Failed to connect to database. Server not started.')
    logger.error(err.message)
    process.exit(1)
  }
}
startServer()

export default app