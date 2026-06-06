// Redis configuration - used in Phase 5 for BullMQ job queues
// Upstash Redis is a serverless Redis that works with BullMQ
// Free tier: 10,000 commands per day

// We export the connection config object
// BullMQ uses this to connect to Redis when processing jobs

export const redisConnection = {
  host: process.env.UPSTASH_REDIS_REST_URL,
  port: 6379,
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: true, // Upstash requires TLS
}

// Note: actual Redis client initialized in Phase 5
// when we set up BullMQ job queues