import { LRUCache } from 'lru-cache'
import { headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { rateLimitMonitor } from '@/lib/monitoring/rate-limit-monitor'

interface RateLimitOptions {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max requests per interval
  lockoutDuration?: number // Lockout duration after max attempts (ms)
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
  reason?: string
}

// Create separate caches for different rate limit purposes
const loginCache = new LRUCache<string, number[]>({
  max: 1000, // Max 1000 unique IPs
  ttl: 15 * 60 * 1000, // 15 minutes TTL
})

const signupCache = new LRUCache<string, number[]>({
  max: 1000,
  ttl: 60 * 60 * 1000, // 1 hour TTL
})

const passwordResetCache = new LRUCache<string, number[]>({
  max: 500,
  ttl: 60 * 60 * 1000, // 1 hour TTL
})

// Lockout cache for tracking locked accounts
const lockoutCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 15 * 60 * 1000, // 15 minutes lockout
})

/**
 * Get client identifier from request
 * Uses IP address as primary identifier with fallback to forwarded headers
 */
async function getClientIdentifier(): Promise<string> {
  const headersList = await headers()
  
  // Try different header options for IP address
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const cfConnectingIp = headersList.get('cf-connecting-ip')
  
  // Use the first available IP or fallback to 'unknown'
  const ip = forwardedFor?.split(',')[0].trim() || 
             realIp || 
             cfConnectingIp || 
             'unknown'
  
  return ip
}

/**
 * Generic rate limiter function
 */
async function rateLimit(
  cache: LRUCache<string, number[]>,
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - options.interval
  
  // Check if user is locked out
  const lockoutKey = `lockout:${identifier}`
  const lockoutExpiry = lockoutCache.get(lockoutKey)
  
  if (lockoutExpiry && lockoutExpiry > now) {
    const remainingLockout = Math.ceil((lockoutExpiry - now) / 1000)
    return {
      success: false,
      limit: options.uniqueTokenPerInterval,
      remaining: 0,
      reset: new Date(lockoutExpiry),
      reason: `Too many attempts. Please try again in ${remainingLockout} seconds.`
    }
  }
  
  // Get existing timestamps for this identifier
  const timestamps = cache.get(identifier) || []
  
  // Filter timestamps within the current window
  const recentTimestamps = timestamps.filter(t => t > windowStart)
  
  // Check if limit exceeded
  if (recentTimestamps.length >= options.uniqueTokenPerInterval) {
    // Apply lockout if configured
    if (options.lockoutDuration) {
      const lockoutExpiry = now + options.lockoutDuration
      lockoutCache.set(lockoutKey, lockoutExpiry)
      
      logger.warn('Rate limit exceeded - lockout applied', {
        component: 'RateLimiter',
        identifier,
        attempts: recentTimestamps.length,
        lockoutDuration: options.lockoutDuration
      })
      
      return {
        success: false,
        limit: options.uniqueTokenPerInterval,
        remaining: 0,
        reset: new Date(lockoutExpiry),
        reason: `Account locked due to too many attempts. Please try again in ${Math.ceil(options.lockoutDuration / 1000)} seconds.`
      }
    }
    
    return {
      success: false,
      limit: options.uniqueTokenPerInterval,
      remaining: 0,
      reset: new Date(windowStart + options.interval),
      reason: 'Too many requests. Please try again later.'
    }
  }
  
  // Add current timestamp and update cache
  recentTimestamps.push(now)
  cache.set(identifier, recentTimestamps)
  
  return {
    success: true,
    limit: options.uniqueTokenPerInterval,
    remaining: options.uniqueTokenPerInterval - recentTimestamps.length,
    reset: new Date(windowStart + options.interval)
  }
}

/**
 * Rate limiter for login attempts
 * 5 attempts per 15 minutes with 15-minute lockout
 */
export async function loginRateLimiter(email?: string): Promise<RateLimitResult> {
  const ip = await getClientIdentifier()
  // Use combination of IP and email for more granular control
  const identifier = email ? `${ip}:${email.toLowerCase()}` : ip
  
  const result = await rateLimit(loginCache, identifier, {
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5, // 5 attempts
    lockoutDuration: 15 * 60 * 1000, // 15 minute lockout
  })

  // Monitor rate limit events
  if (!result.success) {
    await rateLimitMonitor.logEvent({
      type: 'login',
      identifier,
      attempts: 5 - result.remaining,
      locked: result.reason?.includes('locked') || false,
      reason: result.reason
    })
  }

  return result
}

/**
 * Rate limiter for signup attempts
 * 3 attempts per hour per IP
 */
export async function signupRateLimiter(): Promise<RateLimitResult> {
  const identifier = await getClientIdentifier()
  
  const result = await rateLimit(signupCache, identifier, {
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 3, // 3 signups per hour
  })

  // Monitor rate limit events
  if (!result.success) {
    await rateLimitMonitor.logEvent({
      type: 'signup',
      identifier,
      attempts: 3 - result.remaining,
      locked: false,
      reason: result.reason
    })
  }

  return result
}

/**
 * Rate limiter for password reset requests
 * 3 attempts per hour per email
 */
export async function passwordResetRateLimiter(email: string): Promise<RateLimitResult> {
  const identifier = email.toLowerCase()
  
  const result = await rateLimit(passwordResetCache, identifier, {
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 3, // 3 reset attempts per hour
  })

  // Monitor rate limit events
  if (!result.success) {
    await rateLimitMonitor.logEvent({
      type: 'password-reset',
      identifier,
      attempts: 3 - result.remaining,
      locked: false,
      reason: result.reason
    })
  }

  return result
}

/**
 * Clear rate limit for a specific identifier (use after successful login)
 */
export async function clearRateLimit(email: string): Promise<void> {
  const ip = await getClientIdentifier()
  const identifier = `${ip}:${email.toLowerCase()}`
  
  loginCache.delete(identifier)
  lockoutCache.delete(`lockout:${identifier}`)
  
  logger.debug('Rate limit cleared', {
    component: 'RateLimiter',
    identifier
  })
}

/**
 * Get rate limit status without incrementing counter
 */
export async function getRateLimitStatus(email?: string): Promise<RateLimitResult> {
  const ip = await getClientIdentifier()
  const identifier = email ? `${ip}:${email.toLowerCase()}` : ip
  
  const now = Date.now()
  const windowStart = now - (15 * 60 * 1000)
  
  // Check lockout status
  const lockoutKey = `lockout:${identifier}`
  const lockoutExpiry = lockoutCache.get(lockoutKey)
  
  if (lockoutExpiry && lockoutExpiry > now) {
    return {
      success: false,
      limit: 5,
      remaining: 0,
      reset: new Date(lockoutExpiry),
      reason: `Account locked. Try again at ${new Date(lockoutExpiry).toLocaleTimeString()}.`
    }
  }
  
  // Get current attempt count
  const timestamps = loginCache.get(identifier) || []
  const recentTimestamps = timestamps.filter(t => t > windowStart)
  
  return {
    success: recentTimestamps.length < 5,
    limit: 5,
    remaining: Math.max(0, 5 - recentTimestamps.length),
    reset: new Date(windowStart + (15 * 60 * 1000))
  }
}