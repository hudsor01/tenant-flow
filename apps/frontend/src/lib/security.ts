/**
 * Security Utilities
 * Client-side security helpers for Stripe integration
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate URL format and security
 */
export function isValidUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url)

		// Only allow http and https protocols
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			return false
		}

		// Prevent localhost in production
		if (
			process.env.NODE_ENV === 'production' &&
			(parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')
		) {
			return false
		}

		return true
	} catch {
		return false
	}
}

/**
 * Validate Stripe session ID format
 */
export function isValidStripeSessionId(sessionId: string): boolean {
	const sessionIdRegex = /^cs_[a-zA-Z0-9_-]{24,}$/
	return sessionIdRegex.test(sessionId)
}

/**
 * Generate a secure random string for state/CSRF protection
 */
export function generateSecureToken(length: number = 32): string {
	const array = new Uint8Array(length)
	crypto.getRandomValues(array)
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate plan ID against allowed values
 */
export function isValidPlanId(planId: string): boolean {
	const allowedPlans = ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX']
	return allowedPlans.includes(planId)
}

/**
 * Validate billing interval
 */
export function isValidBillingInterval(interval: string): boolean {
	return ['monthly', 'annual'].includes(interval)
}

/**
 * Sanitize and validate checkout request data
 */
export interface ValidatedCheckoutData {
	planId: 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
	interval: 'monthly' | 'annual'
	successUrl?: string
	cancelUrl?: string
}

export function validateCheckoutData(
	data: unknown
): ValidatedCheckoutData | null {
	try {
		if (!data || typeof data !== 'object') {
			return null
		}

		const obj = data as Record<string, unknown>

		// Validate plan ID
		if (
			!obj.planId ||
			typeof obj.planId !== 'string' ||
			!isValidPlanId(obj.planId) ||
			obj.planId === 'FREETRIAL'
		) {
			return null
		}

		// Validate billing interval
		if (
			!obj.interval ||
			typeof obj.interval !== 'string' ||
			!isValidBillingInterval(obj.interval)
		) {
			return null
		}

		// Validate URLs if provided
		if (
			obj.successUrl &&
			typeof obj.successUrl === 'string' &&
			!isValidUrl(obj.successUrl)
		) {
			return null
		}

		if (
			obj.cancelUrl &&
			typeof obj.cancelUrl === 'string' &&
			!isValidUrl(obj.cancelUrl)
		) {
			return null
		}

		const result: ValidatedCheckoutData = {
			planId: obj.planId as 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX',
			interval: obj.interval as 'monthly' | 'annual'
		}

		if (typeof obj.successUrl === 'string') {
			result.successUrl = obj.successUrl
		}
		if (typeof obj.cancelUrl === 'string') {
			result.cancelUrl = obj.cancelUrl
		}

		return result
	} catch {
		return null
	}
}

/**
 * Security headers for API requests
 */
export function getSecurityHeaders(): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		'X-Requested-With': 'XMLHttpRequest',
		// Add CSRF token if available
		...(typeof window !== 'undefined' && {
			'X-CSRF-Token': localStorage.getItem('csrf-token') || ''
		})
	}
}

/**
 * Rate limiting helper for client-side requests
 */
class RateLimiter {
	private requests: number[] = []
	private maxRequests: number
	private windowMs: number

	constructor(maxRequests: number = 5, windowMs: number = 60000) {
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
export const checkoutRateLimiter = new RateLimiter(3, 60000) // 3 requests per minute

/**
 * Validate authentication token format
 */
export function isValidAuthToken(token: string): boolean {
	// JWT tokens should have 3 parts separated by dots
	const parts = token.split('.')
	return parts.length === 3 && parts.every(part => part.length > 0)
}
