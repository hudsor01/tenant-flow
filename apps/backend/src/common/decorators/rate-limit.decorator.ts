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

// Webhook-specific rate limits (protect against abuse/DoS)
export const WebhookRateLimits = {
  STRIPE_WEBHOOK: { ttl: 60, limit: 100 },     // 100 webhooks per minute (Stripe's typical rate)
  SUPABASE_WEBHOOK: { ttl: 60, limit: 50 },    // 50 webhooks per minute for auth events
  GENERAL_WEBHOOK: { ttl: 60, limit: 30 }      // 30 webhooks per minute for other services
}

// API rate limits for different endpoint categories
export const ApiRateLimits = {
  PUBLIC_API: { ttl: 60, limit: 100 },         // 100 requests per minute for public endpoints
  AUTHENTICATED_API: { ttl: 60, limit: 300 },  // 300 requests per minute for authenticated users
  ADMIN_API: { ttl: 60, limit: 1000 },         // 1000 requests per minute for admin operations
  FILE_UPLOAD: { ttl: 60, limit: 10 },         // 10 file uploads per minute
  SEARCH_API: { ttl: 60, limit: 50 }           // 50 search queries per minute
}