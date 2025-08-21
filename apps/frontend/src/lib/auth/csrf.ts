import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

const CSRF_TOKEN_NAME = 'csrf-token'

/**
 * Get CSRF token from cookies (server-side)
 */
async function getStoredCSRFToken(): Promise<string | null> {
	try {
		const cookieStore = await cookies()
		const token = cookieStore.get(CSRF_TOKEN_NAME)
		return token?.value || null
	} catch (error) {
		logger.warn('Failed to get CSRF token from cookies', { error })
		return null
	}
}

/**
 * Validate CSRF token from request
 */
async function validateCSRFToken(
	providedToken: string | null
): Promise<boolean> {
	if (!providedToken) {
		logger.debug('CSRF validation: No token provided')
		return false
	}

	const storedToken = await getStoredCSRFToken()

	if (!storedToken) {
		logger.debug('CSRF validation: No stored token')
		return false
	}

	// Constant-time comparison to prevent timing attacks
	const isValid = timingSafeEqual(providedToken, storedToken)

	if (!isValid) {
		logger.warn('CSRF validation failed: Token mismatch')
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
 * Production CSRF protection for server actions
 * Validates double-submit cookie pattern with timing attack protection
 */
export async function requireCSRFToken(formData: FormData): Promise<void> {
	const providedToken = formData.get('_csrf') as string | null
	
	// Production security: require token
	if (!providedToken) {
		logger.warn('CSRF protection: No token provided in form data')
		throw new Error('Security validation required. Please refresh the page and try again.')
	}

	// Validate token length (production requirement)
	if (providedToken.length !== 64) {
		logger.warn('CSRF protection: Invalid token length')
		throw new Error('Security validation failed. Please refresh the page and try again.')
	}

	const isValid = await validateCSRFToken(providedToken)

	if (!isValid) {
		logger.warn('CSRF protection: Token validation failed')
		throw new Error(
			'Security validation failed. Please refresh the page and try again.'
		)
	}

	logger.debug('CSRF protection: Token validated successfully')
}
