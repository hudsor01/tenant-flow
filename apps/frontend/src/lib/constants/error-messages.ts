/**
 * Centralized error messages for consistent user feedback
 */

export const ERROR_MESSAGES = {
	// Checkout errors
	CHECKOUT_FAILED: 'Failed to create checkout session',
	CHECKOUT_START_FAILED: 'Failed to start checkout. Please try again.',

	// Form errors
	FORM_LOAD_FAILED: 'Failed to load form data',
	FORM_SUBMIT_FAILED: 'Failed to submit form. Please try again.',

	// CRUD operation errors
	GENERIC_FAILED: (action: string, entity: string) =>
		`Failed to ${action} ${entity}`,

	// Optimistic locking errors
	CONFLICT_UPDATE:
		'This item was modified by another user. Please refresh and try again.',

	// Auth errors
	PASSWORD_CHANGE_FAILED: 'Failed to change password',
	LOGIN_FAILED: 'Login failed. Please check your credentials.',
	SIGNUP_FAILED: 'Sign up failed. Please try again.',
	USER_NOT_AUTHENTICATED: 'User not authenticated',
	SESSION_EXPIRED: 'Session expired',
	NO_STRIPE_CUSTOMER: 'No Stripe customer found. Please contact support.',
	AUTH_SESSION_EXPIRED: 'Authentication session expired. Please log in again.',

	// Network errors
	NETWORK_ERROR: 'Network error. Please check your connection.',
	TIMEOUT_ERROR: 'Request timed out. Please try again.',

	// Permission errors
	UNAUTHORIZED: 'You are not authorized to perform this action.',
	FORBIDDEN: 'Access denied.'
} as const
