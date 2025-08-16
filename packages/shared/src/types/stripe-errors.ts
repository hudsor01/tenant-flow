/**
 * Stripe Error Type Definitions for TenantFlow
 *
 * Comprehensive error types and error handling patterns based on official Stripe API documentation.
 * These types cover all error categories, decline codes, and best practices for error handling.
 */

// ========================
// Error Type Constants
// ========================

export const STRIPE_ERROR_TYPES = {
	API_ERROR: 'api_error',
	CARD_ERROR: 'card_error',
	IDEMPOTENCY_ERROR: 'idempotency_error',
	INVALID_REQUEST_ERROR: 'invalid_request_error',
	RATE_LIMIT_ERROR: 'rate_limit_error',
	AUTHENTICATION_ERROR: 'authentication_error'
} as const

export type StripeErrorType =
	(typeof STRIPE_ERROR_TYPES)[keyof typeof STRIPE_ERROR_TYPES]

// ========================
// Card Decline Codes
// ========================

export const CARD_DECLINE_CODES = {
	APPROVE_WITH_ID: 'approve_with_id',
	CALL_ISSUER: 'call_issuer',
	CARD_NOT_SUPPORTED: 'card_not_supported',
	CARD_VELOCITY_EXCEEDED: 'card_velocity_exceeded',
	CURRENCY_NOT_SUPPORTED: 'currency_not_supported',
	DO_NOT_HONOR: 'do_not_honor',
	DO_NOT_TRY_AGAIN: 'do_not_try_again',
	DUPLICATE_TRANSACTION: 'duplicate_transaction',
	EXPIRED_CARD: 'expired_card',
	FRAUDULENT: 'fraudulent',
	GENERIC_DECLINE: 'generic_decline',
	INCORRECT_NUMBER: 'incorrect_number',
	INCORRECT_CVC: 'incorrect_cvc',
	INCORRECT_PIN: 'incorrect_pin',
	INCORRECT_ZIP: 'incorrect_zip',
	INSUFFICIENT_FUNDS: 'insufficient_funds',
	INVALID_ACCOUNT: 'invalid_account',
	INVALID_AMOUNT: 'invalid_amount',
	INVALID_CVC: 'invalid_cvc',
	INVALID_EXPIRY_MONTH: 'invalid_expiry_month',
	INVALID_EXPIRY_YEAR: 'invalid_expiry_year',
	INVALID_NUMBER: 'invalid_number',
	INVALID_PIN: 'invalid_pin',
	ISSUER_NOT_AVAILABLE: 'issuer_not_available',
	LOST_CARD: 'lost_card',
	MERCHANT_BLACKLIST: 'merchant_blacklist',
	NEW_ACCOUNT_INFORMATION_AVAILABLE: 'new_account_information_available',
	NO_ACTION_TAKEN: 'no_action_taken',
	NOT_PERMITTED: 'not_permitted',
	OFFLINE_PIN_REQUIRED: 'offline_pin_required',
	ONLINE_OR_OFFLINE_PIN_REQUIRED: 'online_or_offline_pin_required',
	PICKUP_CARD: 'pickup_card',
	PIN_TRY_EXCEEDED: 'pin_try_exceeded',
	PROCESSING_ERROR: 'processing_error',
	REENTER_TRANSACTION: 'reenter_transaction',
	RESTRICTED_CARD: 'restricted_card',
	REVOCATION_OF_ALL_AUTHORIZATIONS: 'revocation_of_all_authorizations',
	REVOCATION_OF_AUTHORIZATION: 'revocation_of_authorization',
	SECURITY_VIOLATION: 'security_violation',
	SERVICE_NOT_ALLOWED: 'service_not_allowed',
	STOLEN_CARD: 'stolen_card',
	STOP_PAYMENT_ORDER: 'stop_payment_order',
	TESTMODE_DECLINE: 'testmode_decline',
	TRANSACTION_NOT_ALLOWED: 'transaction_not_allowed',
	TRY_AGAIN_LATER: 'try_again_later',
	WITHDRAWAL_COUNT_LIMIT_EXCEEDED: 'withdrawal_count_limit_exceeded'
} as const

export type CardDeclineCode =
	(typeof CARD_DECLINE_CODES)[keyof typeof CARD_DECLINE_CODES]

// ========================
// HTTP Status Codes
// ========================

export const HTTP_STATUS_CODES = {
	// Success codes
	OK: 200,
	CREATED: 201,

	// Client error codes
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	REQUEST_FAILED: 402,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,

	// Server error codes
	INTERNAL_SERVER_ERROR: 500,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504
} as const

export type HttpStatusCode =
	(typeof HTTP_STATUS_CODES)[keyof typeof HTTP_STATUS_CODES]

// ========================
// Error Interfaces
// ========================

/**
 * Base Stripe Error interface
 */
export interface StripeErrorBase {
	readonly type: StripeErrorType
	readonly code?: string
	readonly decline_code?: CardDeclineCode
	readonly message: string
	readonly param?: string
	readonly request_log_url?: string
	readonly charge?: string
	readonly doc_url?: string
	readonly payment_intent?: {
		readonly id: string
		readonly status: string
	}
	readonly payment_method?: {
		readonly id: string
		readonly type: string
	}
	readonly setup_intent?: {
		readonly id: string
		readonly status: string
	}
	readonly source?: {
		readonly id: string
		readonly type: string
	}
}

/**
 * API Error - Rare, covers API issues
 */
export interface StripeApiError extends StripeErrorBase {
	readonly type: 'api_error'
}

/**
 * Card Error - Most common, payment card issues
 */
export interface StripeCardError extends StripeErrorBase {
	readonly type: 'card_error'
	readonly decline_code?: CardDeclineCode
	readonly charge?: string
}

/**
 * Idempotency Error - Misuse of idempotency keys
 */
export interface StripeIdempotencyError extends StripeErrorBase {
	readonly type: 'idempotency_error'
}

/**
 * Invalid Request Error - Bad request parameters
 */
export interface StripeInvalidRequestError extends StripeErrorBase {
	readonly type: 'invalid_request_error'
	readonly param?: string
}

/**
 * Rate Limit Error - Too many requests
 */
export interface StripeRateLimitError extends StripeErrorBase {
	readonly type: 'rate_limit_error'
}

/**
 * Authentication Error - Invalid API key or insufficient permissions
 */
export interface StripeAuthenticationError extends StripeErrorBase {
	readonly type: 'authentication_error'
}

/**
 * Union type for all Stripe errors
 */
export type StripeError =
	| StripeApiError
	| StripeCardError
	| StripeIdempotencyError
	| StripeInvalidRequestError
	| StripeRateLimitError
	| StripeAuthenticationError

/**
 * Enhanced error response with HTTP details
 */
export interface StripeErrorResponse {
	readonly error: StripeError
	readonly status: HttpStatusCode
	readonly headers?: Record<string, string>
	readonly request_id?: string
}

// ========================
// Error Context Types
// ========================

/**
 * Error context for logging and debugging
 */
export interface StripeErrorContext {
	readonly operation: string
	readonly resource_type?: string
	readonly resource_id?: string
	readonly user_id?: string
	readonly organization_id?: string
	readonly correlation_id?: string
	readonly timestamp: number
	readonly environment: 'test' | 'live'
}

/**
 * User-friendly error information
 */
export interface UserFriendlyError {
	readonly title: string
	readonly message: string
	readonly action?: string
	readonly severity: 'info' | 'warning' | 'error' | 'critical'
	readonly retry_allowed: boolean
	readonly contact_support: boolean
}

// ========================
// Error Mapping Constants
// ========================

/**
 * User-friendly messages for common card errors
 */
export const CARD_ERROR_MESSAGES: Record<CardDeclineCode, UserFriendlyError> = {
	[CARD_DECLINE_CODES.INSUFFICIENT_FUNDS]: {
		title: 'Insufficient Funds',
		message:
			'Your card has insufficient funds to complete this transaction.',
		action: 'Please try a different payment method or add funds to your account.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.EXPIRED_CARD]: {
		title: 'Card Expired',
		message: 'Your card has expired.',
		action: 'Please update your payment method with current card information.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INCORRECT_CVC]: {
		title: 'Incorrect Security Code',
		message: 'The security code (CVC) you entered is incorrect.',
		action: 'Please check your card and try again.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INCORRECT_NUMBER]: {
		title: 'Incorrect Card Number',
		message: 'The card number you entered is incorrect.',
		action: 'Please check your card number and try again.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.GENERIC_DECLINE]: {
		title: 'Payment Declined',
		message:
			'Your card was declined. No additional information was provided.',
		action: 'Please try a different payment method or contact your bank.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.FRAUDULENT]: {
		title: 'Payment Blocked',
		message: 'Your payment was blocked due to suspected fraud.',
		action: 'Please contact your bank or try a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: true
	},
	[CARD_DECLINE_CODES.LOST_CARD]: {
		title: 'Card Reported Lost',
		message: 'This card has been reported as lost.',
		action: 'Please use a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.STOLEN_CARD]: {
		title: 'Card Reported Stolen',
		message: 'This card has been reported as stolen.',
		action: 'Please use a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.PROCESSING_ERROR]: {
		title: 'Processing Error',
		message: 'An error occurred while processing your payment.',
		action: 'Please try again in a few moments.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.CARD_NOT_SUPPORTED]: {
		title: 'Card Not Supported',
		message: 'This type of card is not supported.',
		action: 'Please try a different payment method.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.CURRENCY_NOT_SUPPORTED]: {
		title: 'Currency Not Supported',
		message: 'Your card does not support this currency.',
		action: 'Please try a different payment method.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.DO_NOT_HONOR]: {
		title: 'Payment Declined',
		message: 'Your card issuer declined the payment.',
		action: 'Please contact your bank or try a different payment method.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.DO_NOT_TRY_AGAIN]: {
		title: 'Payment Cannot Be Processed',
		message:
			'Your card issuer has declined this payment and requested not to retry.',
		action: 'Please use a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.TESTMODE_DECLINE]: {
		title: 'Test Mode Decline',
		message: 'This payment was declined in test mode.',
		action: 'This is expected behavior for test payments.',
		severity: 'info',
		retry_allowed: true,
		contact_support: false
	},
	// Add remaining decline codes with appropriate messages
	[CARD_DECLINE_CODES.APPROVE_WITH_ID]: {
		title: 'Authorization Required',
		message:
			'Your bank requires additional authorization for this payment.',
		action: 'Please contact your bank to authorize this transaction.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.CALL_ISSUER]: {
		title: 'Contact Your Bank',
		message: 'Your bank requires you to contact them about this payment.',
		action: 'Please call the phone number on the back of your card.',
		severity: 'warning',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.CARD_VELOCITY_EXCEEDED]: {
		title: 'Too Many Transactions',
		message:
			'You have exceeded the allowed number of transactions for this card.',
		action: 'Please wait and try again later, or use a different payment method.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.DUPLICATE_TRANSACTION]: {
		title: 'Duplicate Transaction',
		message: 'A transaction with identical details was recently submitted.',
		action: 'Please wait a moment before trying again.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INCORRECT_PIN]: {
		title: 'Incorrect PIN',
		message: 'The PIN you entered is incorrect.',
		action: 'Please try again with the correct PIN.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INCORRECT_ZIP]: {
		title: 'Incorrect Postal Code',
		message: 'The postal code you entered does not match your card.',
		action: 'Please check your billing address and try again.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INVALID_ACCOUNT]: {
		title: 'Invalid Account',
		message: 'The card account is invalid.',
		action: 'Please verify your card details or use a different payment method.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INVALID_AMOUNT]: {
		title: 'Invalid Amount',
		message: 'The payment amount is invalid.',
		action: 'Please verify the amount and try again.',
		severity: 'error',
		retry_allowed: true,
		contact_support: true
	},
	[CARD_DECLINE_CODES.INVALID_CVC]: {
		title: 'Invalid Security Code',
		message: 'The security code format is invalid.',
		action: 'Please check the 3 or 4 digit code on your card.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INVALID_EXPIRY_MONTH]: {
		title: 'Invalid Expiry Month',
		message: 'The expiry month you entered is invalid.',
		action: "Please check your card's expiration date.",
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INVALID_EXPIRY_YEAR]: {
		title: 'Invalid Expiry Year',
		message: 'The expiry year you entered is invalid.',
		action: "Please check your card's expiration date.",
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INVALID_NUMBER]: {
		title: 'Invalid Card Number',
		message: 'The card number format is invalid.',
		action: 'Please check your card number and try again.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.INVALID_PIN]: {
		title: 'Invalid PIN',
		message: 'The PIN format is invalid.',
		action: 'Please enter your correct PIN.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.ISSUER_NOT_AVAILABLE]: {
		title: 'Bank Unavailable',
		message: 'Your bank is currently unavailable.',
		action: 'Please try again later or use a different payment method.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.MERCHANT_BLACKLIST]: {
		title: 'Merchant Restricted',
		message: 'Your card cannot be used with this merchant.',
		action: 'Please use a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: true
	},
	[CARD_DECLINE_CODES.NEW_ACCOUNT_INFORMATION_AVAILABLE]: {
		title: 'Account Information Updated',
		message: 'New account information is available for your card.',
		action: 'Please contact your bank to update your account information.',
		severity: 'info',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.NO_ACTION_TAKEN]: {
		title: 'No Action Taken',
		message: 'No action was taken by the card issuer.',
		action: 'Please try again or contact your bank.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.NOT_PERMITTED]: {
		title: 'Transaction Not Permitted',
		message: 'This transaction is not permitted for your card.',
		action: 'Please contact your bank or use a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.OFFLINE_PIN_REQUIRED]: {
		title: 'PIN Required',
		message: 'An offline PIN is required for this transaction.',
		action: 'Please try a different payment method.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.ONLINE_OR_OFFLINE_PIN_REQUIRED]: {
		title: 'PIN Required',
		message: 'A PIN is required for this transaction.',
		action: 'Please try a different payment method.',
		severity: 'error',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.PICKUP_CARD]: {
		title: 'Card Restricted',
		message: 'Your card has been restricted by the issuer.',
		action: 'Please contact your bank immediately.',
		severity: 'critical',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.PIN_TRY_EXCEEDED]: {
		title: 'PIN Attempts Exceeded',
		message: 'You have exceeded the maximum number of PIN attempts.',
		action: 'Please contact your bank or try again later.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.REENTER_TRANSACTION]: {
		title: 'Please Try Again',
		message: 'There was a temporary issue processing your payment.',
		action: 'Please try your transaction again.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.RESTRICTED_CARD]: {
		title: 'Card Restricted',
		message: 'Your card has been restricted.',
		action: 'Please contact your bank or use a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.REVOCATION_OF_ALL_AUTHORIZATIONS]: {
		title: 'All Authorizations Revoked',
		message: 'All authorizations for this card have been revoked.',
		action: 'Please contact your bank immediately.',
		severity: 'critical',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.REVOCATION_OF_AUTHORIZATION]: {
		title: 'Authorization Revoked',
		message: 'The authorization for this card has been revoked.',
		action: 'Please contact your bank.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.SECURITY_VIOLATION]: {
		title: 'Security Violation',
		message: 'A security violation has been detected.',
		action: 'Please contact your bank immediately.',
		severity: 'critical',
		retry_allowed: false,
		contact_support: true
	},
	[CARD_DECLINE_CODES.SERVICE_NOT_ALLOWED]: {
		title: 'Service Not Allowed',
		message: 'This service is not allowed for your card.',
		action: 'Please use a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.STOP_PAYMENT_ORDER]: {
		title: 'Stop Payment Order',
		message: 'A stop payment order is in effect for this card.',
		action: 'Please contact your bank.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.TRANSACTION_NOT_ALLOWED]: {
		title: 'Transaction Not Allowed',
		message: 'This type of transaction is not allowed for your card.',
		action: 'Please try a different payment method.',
		severity: 'error',
		retry_allowed: false,
		contact_support: false
	},
	[CARD_DECLINE_CODES.TRY_AGAIN_LATER]: {
		title: 'Temporary Issue',
		message: 'There is a temporary issue with your card.',
		action: 'Please try again in a few minutes.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	},
	[CARD_DECLINE_CODES.WITHDRAWAL_COUNT_LIMIT_EXCEEDED]: {
		title: 'Withdrawal Limit Exceeded',
		message: 'You have exceeded your daily withdrawal limit.',
		action: 'Please try again tomorrow or use a different payment method.',
		severity: 'warning',
		retry_allowed: true,
		contact_support: false
	}
}

// ========================
// Error Handling Utilities
// ========================

/**
 * Type guard for Stripe errors
 */
export function isStripeError(obj: unknown): obj is StripeError {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'type' in obj &&
		typeof obj.type === 'string' &&
		Object.values(STRIPE_ERROR_TYPES).includes(obj.type as StripeErrorType)
	)
}

/**
 * Type guard for card errors
 */
export function isCardError(error: StripeError): error is StripeCardError {
	return error.type === 'card_error'
}

/**
 * Type guard for rate limit errors by HTTP status
 */
export function isRateLimitError(status: number): boolean {
	return status === HTTP_STATUS_CODES.TOO_MANY_REQUESTS
}

/**
 * Type guard for rate limit errors by error object
 */
export function isRateLimitErrorObject(
	error: StripeError
): error is StripeRateLimitError {
	return error.type === 'rate_limit_error'
}

/**
 * Type guard for authentication errors
 */
export function isAuthenticationError(
	error: StripeError
): error is StripeAuthenticationError {
	return error.type === 'authentication_error'
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: StripeError, status?: number): boolean {
	// Rate limit errors are retryable with backoff
	if (status === HTTP_STATUS_CODES.TOO_MANY_REQUESTS) {
		return true
	}

	// Server errors are retryable
	if (status && status >= 500) {
		return true
	}

	// Some card errors are retryable
	if (isCardError(error) && error.decline_code) {
		const errorInfo = CARD_ERROR_MESSAGES[error.decline_code]
		return errorInfo?.retry_allowed || false
	}

	// API errors might be retryable
	if (error.type === 'api_error') {
		return true
	}

	// Rate limit errors are retryable with backoff
	if (error.type === 'rate_limit_error') {
		return true
	}

	// Authentication errors are generally not retryable
	if (error.type === 'authentication_error') {
		return false
	}

	return false
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: StripeError): UserFriendlyError {
	if (isCardError(error) && error.decline_code) {
		return (
			CARD_ERROR_MESSAGES[error.decline_code] || {
				title: 'Payment Failed',
				message: error.message,
				severity: 'error',
				retry_allowed: true,
				contact_support: false
			}
		)
	}

	// Handle other error types
	switch (error.type) {
		case 'invalid_request_error':
			return {
				title: 'Invalid Request',
				message:
					'There was an issue with your request. Please check your information and try again.',
				severity: 'error',
				retry_allowed: true,
				contact_support: true
			}

		case 'api_error':
			return {
				title: 'Service Temporarily Unavailable',
				message:
					'Our payment service is temporarily unavailable. Please try again in a few moments.',
				severity: 'warning',
				retry_allowed: true,
				contact_support: true
			}

		case 'idempotency_error':
			return {
				title: 'Duplicate Request',
				message:
					'This request appears to be a duplicate. Please try again with different details.',
				severity: 'warning',
				retry_allowed: true,
				contact_support: false
			}

		case 'rate_limit_error':
			return {
				title: 'Too Many Requests',
				message:
					'You have made too many requests in a short period. Please wait and try again.',
				severity: 'warning',
				retry_allowed: true,
				contact_support: false
			}

		case 'authentication_error':
			return {
				title: 'Authentication Failed',
				message:
					'There was an authentication error. Please contact support if this persists.',
				severity: 'error',
				retry_allowed: false,
				contact_support: true
			}

		default:
			return {
				title: 'Payment Failed',
				message:
					error.message ||
					'An unexpected error occurred while processing your payment.',
				severity: 'error',
				retry_allowed: true,
				contact_support: true
			}
	}
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(attempt: number, baseDelay = 1000): number {
	const maxDelay = 30000 // 30 seconds
	const delay = baseDelay * Math.pow(2, attempt - 1)
	return Math.min(delay, maxDelay)
}

/**
 * Create error context for logging
 */
export function createErrorContext(
	operation: string,
	additionalContext: Partial<StripeErrorContext> = {}
): StripeErrorContext {
	return {
		operation,
		timestamp: Date.now(),
		environment: process.env.NODE_ENV === 'production' ? 'live' : 'test',
		...additionalContext
	}
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(
	error: StripeError,
	context: StripeErrorContext,
	response?: StripeErrorResponse
): {
	error_type: string
	error_code?: string
	decline_code?: string
	message: string
	http_status?: number
	request_id?: string
	context: StripeErrorContext
} {
	return {
		error_type: error.type,
		error_code: error.code,
		decline_code: isCardError(error) ? error.decline_code : undefined,
		message: error.message,
		http_status: response?.status,
		request_id: response?.request_id,
		context
	}
}
