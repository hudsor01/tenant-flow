import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

const CSRF_TOKEN_NAME = 'csrf-token'

/**
 * Get CSRF token from cookies (server-side)
 */
async function getStoredCSRFToken(): Promise<string | null> {
	const cookieStore = await cookies()
	const token = cookieStore.get(CSRF_TOKEN_NAME)

	return token?.value || null
}

/**
 * Validate CSRF token from request
 */
async function validateCSRFToken(
	providedToken: string | null
): Promise<boolean> {
	if (!providedToken) {
		logger.warn('CSRF validation failed: No token provided', {
			component: 'CSRF'
		})
		return false
	}

	const storedToken = await getStoredCSRFToken()

	if (!storedToken) {
		logger.warn('CSRF validation failed: No stored token', {
			component: 'CSRF'
		})
		return false
	}

	// Constant-time comparison to prevent timing attacks
	const isValid = timingSafeEqual(providedToken, storedToken)

	if (!isValid) {
		logger.warn('CSRF validation failed: Token mismatch', {
			component: 'CSRF',
			providedPrefix: providedToken.substring(0, 8),
			storedPrefix: storedToken.substring(0, 8)
		})
	}

	return isValid
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false
	}

	let result = 0
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i)
	}

	return result === 0
}

/**
 * CSRF protection for server actions
 * Add this check to all state-changing server actions
 */
export async function requireCSRFToken(formData: FormData): Promise<void> {
	const providedToken = formData.get('_csrf') as string | null

	const isValid = await validateCSRFToken(providedToken)

	if (!isValid) {
		throw new Error(
			'Invalid or missing CSRF token. Please refresh the page and try again.'
		)
	}
}
