import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Simple in-memory rate limiter (for production, use Redis or similar)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.'
}

/**
 * Rate limiter for API routes
 * Usage: const rateLimitResult = await rateLimiter(request, { maxRequests: 10, windowMs: 60000 })
 */
export async function rateLimiter(
  request: NextRequest, 
  options: Partial<RateLimitOptions> = {}
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date } | NextResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // Get client IP (handle various proxy headers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIP = forwarded?.split(',')[0]?.trim() || realIp || 'anonymous'
  
  const now = Date.now()
  const key = `${clientIP}:${request.nextUrl.pathname}`
  
  // Clean up expired entries
  cleanupExpiredEntries(now)
  
  const record = rateLimit.get(key)
  
  if (!record || now > record.resetTime) {
    // First request or window has expired - start new window
    rateLimit.set(key, {
      count: 1,
      resetTime: now + opts.windowMs
    })
    
    return {
      success: true,
      limit: opts.maxRequests,
      remaining: opts.maxRequests - 1,
      reset: new Date(now + opts.windowMs)
    }
  }
  
  if (record.count >= opts.maxRequests) {
    // Rate limit exceeded
    return NextResponse.json(
      { 
        error: opts.message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': opts.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': record.resetTime.toString(),
          'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
        }
      }
    )
  }
  
  // Increment counter
  record.count++
  rateLimit.set(key, record)
  
  return {
    success: true,
    limit: opts.maxRequests,
    remaining: opts.maxRequests - record.count,
    reset: new Date(record.resetTime)
  }
}

/**
 * Cleanup expired rate limit entries to prevent memory leaks
 */
function cleanupExpiredEntries(now: number) {
  for (const [key, record] of rateLimit.entries()) {
    if (now > record.resetTime) {
      rateLimit.delete(key)
    }
  }
}

/**
 * Rate limiting configurations for different API endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  
  // Stripe/Payment endpoints - moderate limits
  PAYMENT: { maxRequests: 10, windowMs: 5 * 60 * 1000 }, // 10 requests per 5 minutes
  
  // General API endpoints
  API: { maxRequests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  
  // Public endpoints - more lenient
  PUBLIC: { maxRequests: 200, windowMs: 15 * 60 * 1000 } // 200 requests per 15 minutes
} as const