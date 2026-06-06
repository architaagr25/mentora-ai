import mongoose from 'mongoose'
import logger from '../utils/logger.js'

// This function connects to MongoDB
// We call it once when the server starts
// Mongoose then manages the connection pool automatically

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options prevent deprecation warnings
      // and configure the connection pool
      maxPoolSize: 10, // maximum 10 simultaneous connections
    })

    logger.info(`MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    // If DB connection fails, there is no point running the server
    // Log the error and exit the process
    logger.error(`MongoDB connection error: ${error.message}`)
    process.exit(1) // exit with failure code
  }
}

// Handle connection events after initial connect
// These fire if the connection drops during server runtime
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected')
})

export default connectDB