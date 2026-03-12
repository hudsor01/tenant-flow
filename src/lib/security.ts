/**
 * Security Utilities
 * Client-side security helpers for Stripe integration
 */

// Rate limiting constants
const DEFAULT_MAX_REQUESTS = 5
const DEFAULT_WINDOW_MS = 60000 // 1 minute in milliseconds
const CHECKOUT_MAX_REQUESTS = 3

/**
 * Rate limiting helper for client-side requests
 */
class RateLimiter {
	private requests: number[] = []
	private maxRequests: number
	private windowMs: number

	constructor(
		maxRequests: number = DEFAULT_MAX_REQUESTS,
		windowMs: number = DEFAULT_WINDOW_MS
	) {
		this.maxRequests = maxRequests
		this.windowMs = windowMs
	}

	canMakeRequest(): boolean {
		const now = Date.now()
		this.requests = this.requests.filter(time => now - time < this.windowMs)

		if (this.requests.length >= this.maxRequests) {
			return false
		}

		this.requests.push(now)
		return true
	}
}

// Global rate limiter for checkout requests
export const checkoutRateLimiter = new RateLimiter(
	CHECKOUT_MAX_REQUESTS,
	DEFAULT_WINDOW_MS
)
