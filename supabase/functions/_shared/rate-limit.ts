// Shared rate limiting utility for Supabase Edge Functions.
// Uses Upstash Redis with sliding window algorithm.
// Fails open when Upstash is unreachable (availability > strict rate limiting).
//
// Usage: const rateLimited = await rateLimit(req, { maxRequests: 10, windowMs: 60_000, prefix: 'invite' })
//        if (rateLimited) return rateLimited

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getCorsHeaders } from './cors.ts'

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Key prefix for namespace isolation (e.g., 'invite-validate') */
  prefix?: string
}

/** Lazy-initialized Ratelimit instance (cached across requests in warm isolate) */
let cachedLimiter: Ratelimit | null = null

function getLimiter(maxRequests: number, windowMs: string): Ratelimit {
  if (cachedLimiter) return cachedLimiter

  const url = Deno.env.get('UPSTASH_REDIS_REST_URL')
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN')
  }

  cachedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(maxRequests, windowMs),
    analytics: false,
    prefix: '@upstash/ratelimit',
  })

  return cachedLimiter
}

/**
 * Extract the trusted client IP from request headers.
 *
 * Order:
 *   1. `cf-connecting-ip` — set by Cloudflare/edge infra, stripped from
 *      incoming requests, so a client cannot forge it.
 *   2. Last segment of `x-forwarded-for` — closest hop to our infra.
 *      The FIRST segment is attacker-controlled (the client can put
 *      anything they want in the request header before it reaches the
 *      edge), so trusting it lets an attacker rotate fake IPs to
 *      bypass any IP-based rate limit. The last segment is added by
 *      the edge proxy at the network boundary and reflects the real
 *      caller.
 *   3. Fallback string `'unknown'` — every untrusted request shares
 *      this bucket, so the rate limit still applies in aggregate when
 *      headers are missing entirely (e.g., direct origin hit).
 *
 * Reference: Cloudflare's `cf-connecting-ip` documentation explicitly
 * recommends trusting their own header over `x-forwarded-for` for IP
 * identification.
 */
function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }

  return 'unknown'
}

/**
 * Apply rate limiting to a request.
 *
 * @returns Response with 429 if rate limited, null if request should proceed.
 * Fails open on Upstash errors (returns null, logs error).
 */
export async function rateLimit(
  req: Request,
  options: RateLimitOptions,
): Promise<Response | null> {
  try {
    const windowSec = Math.ceil(options.windowMs / 1000)
    const windowStr = `${windowSec} s`
    const limiter = getLimiter(options.maxRequests, windowStr)

    const ip = getClientIp(req)
    const identifier = options.prefix ? `${options.prefix}:${ip}` : ip

    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const retryAfterSec = Math.ceil((reset - Date.now()) / 1000)

      console.warn(JSON.stringify({
        level: 'warn',
        event: 'rate_limit_hit',
        ip,
        prefix: options.prefix,
        url: req.url,
        limit,
        remaining: 0,
        reset,
      }))

      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(retryAfterSec, 1)),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
            ...getCorsHeaders(req),
          },
        },
      )
    }

    return null
  } catch (err) {
    // Fail open: if Upstash is unreachable, allow the request through
    console.error(JSON.stringify({
      level: 'error',
      event: 'rate_limit_error',
      message: err instanceof Error ? err.message : String(err),
      url: req.url,
      prefix: options.prefix,
    }))
    return null
  }
}
