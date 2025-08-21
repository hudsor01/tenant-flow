import { logger } from '@/lib/logger'

/**
 * Maps internal error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
	// Authentication errors
	invalid_credentials: 'Invalid email or password',
	user_not_found: 'Invalid email or password', // Don't reveal if user exists
	invalid_password: 'Invalid email or password', // Don't reveal password is wrong
	email_not_confirmed: 'Please verify your email address before signing in',
	email_not_verified: 'Please verify your email address before signing in',
	weak_password:
		'Password must be at least 8 characters with a mix of letters and numbers',

	// Rate limiting
	too_many_requests: 'Too many attempts. Please try again later',
	rate_limit_exceeded: 'Too many attempts. Please try again later',

	// Registration errors
	user_already_exists: 'An account with this email already exists',
	email_already_registered: 'An account with this email already exists',
	invalid_email: 'Please enter a valid email address',

	// Password reset
	password_reset_failed: 'Unable to reset password. Please try again',
	invalid_recovery_token:
		'Password reset link has expired. Please request a new one',
	expired_recovery_token:
		'Password reset link has expired. Please request a new one',

	// Session errors
	session_expired: 'Your session has expired. Please sign in again',
	invalid_session: 'Your session is invalid. Please sign in again',
	refresh_token_expired: 'Your session has expired. Please sign in again',

	// Network/Server errors
	network_error: 'Connection error. Please check your internet and try again',
	server_error: 'Something went wrong. Please try again',
	service_unavailable:
		'Service temporarily unavailable. Please try again later',
	database_error: 'Something went wrong. Please try again',

	// Generic fallback
	unknown_error: 'Something went wrong. Please try again'
}

/**
 * Sanitizes error messages for production
 * Logs the original error internally while returning safe message to user
 */
export function sanitizeErrorMessage(error: unknown, context?: string): string {
	// Extract error details
	let errorCode: string | undefined
	let errorMessage: string
	const originalError: unknown = error

	if (error instanceof Error) {
		errorMessage = error.message
		// Check for Supabase error structure
		if ('code' in error && typeof error.code === 'string') {
			errorCode = error.code
		}
	} else if (typeof error === 'string') {
		errorMessage = error
	} else if (error && typeof error === 'object' && 'message' in error) {
		errorMessage = String(error.message)
		if ('code' in error) {
			errorCode = String(error.code)
		}
	} else {
		errorMessage = 'unknown_error'
	}

	// Log the original error for debugging (not in production)
	if (process.env.NODE_ENV !== 'production') {
		logger.error('Original error:', originalError, {
			component: 'ErrorSanitizer',
			context,
			errorCode,
			errorMessage
		})
	} else {
		// In production, log minimal info
		logger.error('Auth error occurred', new Error('Sanitized error'), {
			component: 'ErrorSanitizer',
			context,
			errorCode: errorCode || 'unknown'
			// Don't log the actual message in production
		})
	}

	// Check for known error patterns in the message
	const lowerMessage = errorMessage.toLowerCase()

	// Map common error patterns
	if (
		lowerMessage.includes('invalid credentials') ||
		lowerMessage.includes('invalid login')
	) {
		return (
			ERROR_MESSAGES['invalid_credentials'] ||
			ERROR_MESSAGES['unknown_error'] ||
			'An error occurred'
		)
	}

	if (
		lowerMessage.includes('email not confirmed') ||
		lowerMessage.includes('email not verified')
	) {
		return (
			ERROR_MESSAGES['email_not_confirmed'] ||
			ERROR_MESSAGES['unknown_error'] ||
			'An error occurred'
		)
	}

	if (
		lowerMessage.includes('user already registered') ||
		lowerMessage.includes('user already exists')
	) {
		return (
			ERROR_MESSAGES['user_already_exists'] ||
			ERROR_MESSAGES['unknown_error'] ||
			'An error occurred'
		)
	}

	if (
		lowerMessage.includes('rate limit') ||
		lowerMessage.includes('too many requests')
	) {
		return (
			ERROR_MESSAGES['too_many_requests'] ||
			ERROR_MESSAGES['unknown_error'] ||
			'An error occurred'
		)
	}

	if (
		lowerMessage.includes('network') ||
		lowerMessage.includes('fetch failed')
	) {
		return (
			ERROR_MESSAGES['network_error'] ||
			ERROR_MESSAGES['unknown_error'] ||
			'An error occurred'
		)
	}

	if (
		lowerMessage.includes('session expired') ||
		lowerMessage.includes('jwt expired')
	) {
		return (
			ERROR_MESSAGES['session_expired'] ||
			ERROR_MESSAGES['unknown_error'] ||
			'An error occurred'
		)
	}

	// Check error code mappings
	if (errorCode && ERROR_MESSAGES[errorCode]) {
		return (
			ERROR_MESSAGES[errorCode] ||
			ERROR_MESSAGES['unknown_error'] ||
			'An error occurred'
		)
	}

	// Default to generic message in production
	if (process.env.NODE_ENV === 'production') {
		return ERROR_MESSAGES['unknown_error'] || 'An error occurred'
	}

	// In development, return the original message for debugging
	return errorMessage
}

/**
 * Wraps async functions with error sanitization
 */
export function withErrorSanitization<
	T extends (...args: unknown[]) => Promise<unknown>
>(fn: T, context?: string): T {
	return (async (...args: Parameters<T>): Promise<unknown> => {
		try {
			return await fn(...args)
		} catch (error) {
			const sanitizedMessage = sanitizeErrorMessage(error, context)
			throw new Error(sanitizedMessage)
		}
	}) as T
}
