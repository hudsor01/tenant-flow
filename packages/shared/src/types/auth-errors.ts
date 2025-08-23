/**
 * Comprehensive authentication error handling types
 * Provides secure, typed error handling for authentication flows
 */

import type { AuthErrorCode } from './auth'

/**
 * Authentication error with detailed typing
 */
export interface TypedAuthError extends Error {
	code: AuthErrorCode
	field?: string
	details?: Record<string, string | number | boolean>
	cause?: unknown
}

/**
 * Error constructor for authentication errors
 */
export class AuthenticationError extends Error implements TypedAuthError {
	public readonly code: AuthErrorCode
	public readonly field?: string
	public readonly details?: Record<string, string | number | boolean>

	constructor(
		code: AuthErrorCode,
		message: string,
		field?: string,
		details?: Record<string, string | number | boolean>
	) {
		super(message)
		this.name = 'AuthenticationError'
		this.code = code
		this.field = field
		this.details = details
	}
}

/**
 * Type guard to check if error is an authentication error
 */
export function isAuthError(error: unknown): error is TypedAuthError {
	return (
		error instanceof Error &&
		'code' in error &&
		typeof (error as TypedAuthError).code === 'string'
	)
}

/**
 * Type guard for Supabase errors
 */
export interface SupabaseError {
	message: string
	status?: number
	statusCode?: number
	error_description?: string
	error?: string
}

export function isSupabaseError(error: unknown): error is SupabaseError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as SupabaseError).message === 'string'
	)
}

/**
 * Maps common Supabase errors to our typed error codes
 */
export function mapSupabaseError(error: SupabaseError): AuthErrorCode {
	const message = error.message.toLowerCase()

	if (message.includes('invalid login credentials')) {
		return 'INVALID_CREDENTIALS'
	}
	if (message.includes('email not confirmed')) {
		return 'EMAIL_NOT_VERIFIED'
	}
	if (message.includes('user not found')) {
		return 'USER_NOT_FOUND'
	}
	if (message.includes('signup disabled')) {
		return 'ACCOUNT_LOCKED'
	}
	if (message.includes('password') && message.includes('weak')) {
		return 'PASSWORD_TOO_WEAK'
	}
	if (message.includes('email') && message.includes('already')) {
		return 'EMAIL_ALREADY_EXISTS'
	}
	if (message.includes('token') && message.includes('invalid')) {
		return 'INVALID_TOKEN'
	}
	if (message.includes('token') && message.includes('expired')) {
		return 'TOKEN_EXPIRED'
	}
	if (message.includes('rate limit') || message.includes('too many')) {
		return 'RATE_LIMITED'
	}
	if (error.status === 422 || error.statusCode === 422) {
		return 'VALIDATION_ERROR'
	}
	if (error.status && error.status >= 500) {
		return 'NETWORK_ERROR'
	}

	return 'UNKNOWN_ERROR'
}

/**
 * Creates a typed authentication error from any error
 */
export function createAuthError(
	error: unknown,
	defaultCode: AuthErrorCode = 'UNKNOWN_ERROR',
	field?: string
): TypedAuthError {
	if (isAuthError(error)) {
		return error
	}

	if (isSupabaseError(error)) {
		const code = mapSupabaseError(error)
		return new AuthenticationError(code, error.message, field)
	}

	if (error instanceof Error) {
		return new AuthenticationError(defaultCode, error.message, field)
	}

	if (typeof error === 'string') {
		return new AuthenticationError(defaultCode, error, field)
	}

	return new AuthenticationError(
		defaultCode,
		'An unexpected error occurred during authentication',
		field
	)
}

/**
 * Sanitizes error messages for safe display to users
 */
export function sanitizeAuthErrorMessage(error: TypedAuthError): string {
	// Predefined safe error messages
	const safeMessages: Record<AuthErrorCode, string> = {
		INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
		USER_NOT_FOUND: 'No account found with this email address.',
		EMAIL_NOT_VERIFIED:
			'Please verify your email address before signing in.',
		ACCOUNT_LOCKED:
			'Your account has been temporarily locked. Please contact support.',
		PASSWORD_TOO_WEAK:
			'Password must be at least 8 characters with a mix of letters, numbers, and symbols.',
		EMAIL_ALREADY_EXISTS:
			'An account with this email address already exists.',
		INVALID_TOKEN:
			'Invalid or expired verification link. Please request a new one.',
		TOKEN_EXPIRED:
			'Verification link has expired. Please request a new one.',
		RATE_LIMITED:
			'Too many attempts. Please wait a few minutes before trying again.',
		NETWORK_ERROR:
			'Network error. Please check your connection and try again.',
		VALIDATION_ERROR: 'Please check your input and try again.',
		UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
	}

	return safeMessages[error.code] || safeMessages.UNKNOWN_ERROR
}

/**
 * Form validation result with typed errors
 */
export interface AuthFormResult {
	success: boolean
	data?: Record<string, unknown>
	errors?: {
		_form?: string[]
		[field: string]: string[] | undefined
	}
}

/**
 * Creates a form result from an authentication error
 */
export function createFormErrorResult(
	error: unknown,
	field?: string
): AuthFormResult {
	const authError = createAuthError(error, 'UNKNOWN_ERROR', field)
	const sanitizedMessage = sanitizeAuthErrorMessage(authError)

	if (authError.field) {
		return {
			success: false,
			errors: {
				[authError.field]: [sanitizedMessage]
			}
		}
	}

	return {
		success: false,
		errors: {
			_form: [sanitizedMessage]
		}
	}
}

/**
 * Rate limiting error details
 */
export interface RateLimitError extends TypedAuthError {
	code: 'RATE_LIMITED'
	remainingTime?: number
	maxAttempts?: number
	currentAttempts?: number
}

/**
 * Creates a rate limit error
 */
export function createRateLimitError(
	remainingTime?: number,
	maxAttempts?: number,
	currentAttempts?: number
): RateLimitError {
	const minutes = remainingTime ? Math.ceil(remainingTime / 60) : 5
	const message = `Too many attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`

	return Object.assign(new AuthenticationError('RATE_LIMITED', message), {
		remainingTime,
		maxAttempts,
		currentAttempts
	}) as RateLimitError
}
