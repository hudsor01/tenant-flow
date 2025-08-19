import { SetMetadata } from '@nestjs/common'

export const RATE_LIMIT_KEY = 'rateLimit'

export interface RateLimitOptions {
	requests: number
	windowMs: number
}

export const RateLimit = (options: RateLimitOptions) =>
	SetMetadata(RATE_LIMIT_KEY, options)

// Predefined rate limit configurations for common use cases
export const AuthRateLimits = Object.assign(
	RateLimit({ requests: 10, windowMs: 60000 }), // 10 requests per minute
	{
		REFRESH_TOKEN: RateLimit({ requests: 20, windowMs: 60000 }),
		LOGIN: RateLimit({ requests: 5, windowMs: 60000 }),
		REGISTER: RateLimit({ requests: 3, windowMs: 60000 })
	}
)

export const WebhookRateLimits = Object.assign(
	RateLimit({ requests: 100, windowMs: 60000 }), // 100 requests per minute
	{
		SUPABASE_WEBHOOK: RateLimit({ requests: 200, windowMs: 60000 })
	}
)