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

// Monitoring-specific rate limits (protect monitoring infrastructure)
export const MonitoringRateLimits = {
  HEALTH_CHECK: { ttl: 60, limit: 60 },        // 1 health check per second
  METRICS_READ: { ttl: 60, limit: 30 },        // 30 metrics reads per minute
  METRICS_EXPORT: { ttl: 300, limit: 10 },     // 10 exports per 5 minutes (expensive operation)
  TRACE_READ: { ttl: 60, limit: 20 },          // 20 trace reads per minute
  ERROR_METRICS: { ttl: 60, limit: 30 },       // 30 error metric reads per minute
  RESOURCE_USAGE: { ttl: 60, limit: 20 },      // 20 resource usage checks per minute
  CONFIG_UPDATE: { ttl: 300, limit: 5 },       // 5 config updates per 5 minutes
  DLQ_RETRY: { ttl: 300, limit: 10 },         // 10 DLQ retries per 5 minutes
  CONNECTIVITY_TEST: { ttl: 300, limit: 5 }    // 5 connectivity tests per 5 minutes (expensive)
}