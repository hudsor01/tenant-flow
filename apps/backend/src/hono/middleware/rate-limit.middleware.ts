import { rateLimiter } from 'hono-rate-limiter'
import type { Context } from 'hono'

// Rate limiting configuration based on user authentication status
export const createRateLimitMiddleware = () => {
  return rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: (c: Context) => {
      const user = c.get('user')
      // Authenticated users get higher limits
      if (user) {
        return 1000 // 1000 requests per 15 minutes for authenticated users
      }
      return 100 // 100 requests per 15 minutes for anonymous users
    },
    keyGenerator: (c: Context) => {
      const user = c.get('user')
      // Use user ID for authenticated requests, IP for anonymous
      if (user) {
        return `user:${user.id}`
      }
      return `ip:${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'}`
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      error: 'Too many requests from this client, please try again later.',
      retryAfter: 'Request limit will reset in'
    }
  })
}

// Specific rate limits for different endpoint types
export const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 auth requests per windowMs
  keyGenerator: (c: Context) => `auth:${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'}`,
  message: {
    error: 'Too many authentication attempts, please try again later.',
  }
})

// Stricter limits for write operations
export const writeOperationRateLimit = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: (c: Context) => {
    const user = c.get('user')
    if (user) {
      return 50 // 50 write operations per minute for authenticated users
    }
    return 10 // 10 write operations per minute for anonymous users
  },
  keyGenerator: (c: Context) => {
    const user = c.get('user')
    if (user) {
      return `write:user:${user.id}`
    }
    return `write:ip:${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'}`
  },
  message: {
    error: 'Too many write operations, please try again in a moment.',
  }
})

// File upload rate limiting
export const uploadRateLimit = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20, // 20 uploads per hour
  keyGenerator: (c: Context) => {
    const user = c.get('user')
    if (user) {
      return `upload:user:${user.id}`
    }
    return `upload:ip:${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'}`
  },
  message: {
    error: 'Upload limit exceeded, please try again later.',
  }
})