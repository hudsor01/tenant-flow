/**
 * Error message sanitization utilities
 * Sanitizes error messages for safe display to users
 */

export function sanitizeErrorMessage(error: unknown, context?: string): string {
	if (typeof error === 'string') {
		return error
	}

	if (error instanceof Error) {
		// Remove stack traces and sensitive information
		let message = error?.message.replace(/\n.*$/s, '') // Remove everything after first newline

		// Add context-specific sanitization for auth errors
		if (context?.includes('auth')) {
			// Remove technical details from auth errors
			message = message.replace(
				/JWT|Bearer|token|session/gi,
				'authentication'
			)
			message = message.replace(
				/Invalid.*credentials/i,
				'Invalid email or password'
			)
		}

		return message
	}

	if (error && typeof error === 'object' && 'message' in error) {
		return sanitizeErrorMessage(
			(error as { message: unknown })?.message,
			context
		)
	}

	return 'An unexpected error occurred'
}

export function isAuthError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false
	}
	const maybe = error as Record<string, unknown>
	const name = typeof maybe.name === 'string' ? maybe.name : undefined
	const type = typeof maybe.type === 'string' ? maybe.type : undefined
	const code = typeof maybe.code === 'string' ? maybe.code : undefined

	return (
		name === 'AuthError' ||
		type === 'auth_error' ||
		(code?.startsWith('auth_') ?? false)
	)
}

export function isNetworkError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false
	}
	const maybe = error as Record<string, unknown>
	const name = typeof maybe.name === 'string' ? maybe.name : undefined
	const code = typeof maybe.code === 'string' ? maybe.code : undefined
	const message =
		typeof maybe.message === 'string' ? maybe.message : undefined

	return (
		name === 'NetworkError' ||
		code === 'NETWORK_ERROR' ||
		(message !== undefined &&
			(message.includes('fetch') || message.includes('network'))) ||
		false
	)
}
