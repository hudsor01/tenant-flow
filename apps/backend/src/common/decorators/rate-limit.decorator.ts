import { SetMetadata } from '@nestjs/common'

export interface RateLimitOptions {
  ttl: number  // Time window in seconds
  limit: number  // Number of requests allowed in the time window
}

export const RATE_LIMIT_KEY = 'rateLimit'

/**
 * Custom rate limit decorator for endpoint-specific limits
 * @param options Rate limit configuration
 */
export const RateLimit = (options: RateLimitOptions) => 
  SetMetadata(RATE_LIMIT_KEY, options)

// Preset rate limits for common use cases
export const AuthRateLimits = {
  LOGIN: { ttl: 900, limit: 5 },        // 5 attempts per 15 minutes
  REGISTER: { ttl: 3600, limit: 10 },   // 10 registrations per hour
  PASSWORD_RESET: { ttl: 3600, limit: 3 }, // 3 reset requests per hour
  REFRESH_TOKEN: { ttl: 60, limit: 10 }, // 10 refresh attempts per minute
  GENERAL_AUTH: { ttl: 60, limit: 30 }   // 30 requests per minute for other auth endpoints
}