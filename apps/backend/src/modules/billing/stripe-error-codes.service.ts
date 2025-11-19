import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'

/**
 * Stripe Error Code Service
 *
 * Extracts and maps Stripe error codes for client-side error handling
 * Following official Stripe error code documentation:
 * https://stripe.com/docs/error-codes
 *
 * Error codes allow clients to:
 * 1. Display user-friendly error messages
 * 2. Trigger specific recovery flows (e.g., 3D Secure for authentication_required)
 * 3. Log errors with appropriate severity
 * 4. Implement retry logic based on error type
 */
@Injectable()
export class StripeErrorCodesService {
	private readonly logger = new Logger(StripeErrorCodesService.name)

	/**
	 * Extract error code from Stripe error
	 * Per Stripe documentation, error codes are stable and should be used for string matching
	 *
	 * @param error Stripe error object
	 * @returns Error code or null if not available
	 */
	extractErrorCode(error: Stripe.errors.StripeError): string | null {
		// Standard Stripe error structure
		if ('code' in error && typeof error.code === 'string') {
			return error.code
		}

		// Fallback to error type if code is not available
		if ('type' in error) {
			return error.type
		}

		return null
	}

	/**
	 * Determine if error is retryable
	 * Per Stripe documentation, some errors are transient and should trigger retry logic
	 */
	isRetryable(errorCode: string | null): boolean {
		if (!errorCode) {
			return false
		}

		// Transient errors that should be retried
		const retryableErrors = [
			'rate_limit', // API rate limit hit, wait and retry
			'api_connection_error', // Network error, retry with backoff
			'api_error', // Temporary API issue, retry with backoff
			'timeout', // Request timeout
			'temporary_error' // Generic temporary error
		]

		return retryableErrors.includes(errorCode)
	}

	/**
	 * Determine if error requires 3D Secure authentication
	 * Per Stripe documentation, authentication_required indicates 3D Secure is needed
	 */
	requires3DSecure(errorCode: string | null): boolean {
		return errorCode === 'authentication_required'
	}

	/**
	 * Determine if error is a card decline
	 * Per Stripe documentation, card_error type indicates various card issues
	 */
	isCardDecline(error: Stripe.errors.StripeError): boolean {
		return error.type === 'StripeCardError'
	}

	/**
	 * Extract decline reason from card error
	 * Per Stripe documentation, decline_code provides specific decline reason
	 * Examples: lost_card, stolen_card, expired_card, incorrect_cvc, etc.
	 */
	extractDeclineReason(error: Stripe.errors.StripeError): string | null {
		if (!this.isCardDecline(error)) {
			return null
		}

		// TypeScript type narrowing
		const cardError = error as Stripe.errors.StripeCardError

		// Check for decline_code property (official Stripe property)
		if ('decline_code' in cardError && typeof cardError.decline_code === 'string') {
			return cardError.decline_code
		}

		return null
	}

	/**
	 * Map Stripe error to client-friendly message and metadata
	 * Provides detailed information for client error handling
	 */
	mapErrorForClient(
		error: Stripe.errors.StripeError
	): {
		code: string | null
		type: string
		message: string
		userFriendlyMessage: string
		requiresAction: boolean
		actionType?: 'retry' | '3d_secure' | 'update_payment_method' | 'contact_support' | undefined
		retryAfterMs?: number | undefined
	} {
		const errorCode = this.extractErrorCode(error)
		const declineReason = this.extractDeclineReason(error)
		const isRetryable = this.isRetryable(errorCode)
		const requires3DS = this.requires3DSecure(errorCode)

		// Map specific error codes to user-friendly messages
		const userFriendlyMessages: Record<string, string> = {
			// Card decline errors (decline_code)
			lost_card: 'The card you provided is flagged as lost. Please use a different payment method.',
			stolen_card: 'The card you provided is flagged as stolen. Please use a different payment method.',
			expired_card: 'The card you provided has expired. Please update your payment method.',
			incorrect_cvc: 'The security code you provided is incorrect. Please try again.',
			processing_error: 'A processing error occurred. Please try again.',
			card_not_supported: 'This card type is not supported. Please use a different card.',
			currency_not_supported: 'This currency is not supported for your card. Please contact support.',
			duplicate_transaction: 'This transaction appears to be a duplicate. Please check your history.',
			fraudulent: 'Your transaction has been declined for security reasons. Please contact support.',
			generic_decline: 'Your payment was declined. Please contact your card issuer.',
			incorrect_number: 'The card number you provided is incorrect.',
			incorrect_zip: 'The postal code you provided is incorrect.',
			insufficient_funds: 'Your card does not have sufficient funds. Please use a different card.',
			merchant_blacklist: 'This merchant is blacklisted. Please contact support.',
			new_account_information_available: 'We have updated information for this card. Please update it.',
			no_account: 'The bank account associated with this card does not exist.',
			not_permitted: 'The card issuer does not allow this transaction.',
			pickup_card: 'The card issuer requires pickup of this card.',
			restricted_card: 'The card you provided has been restricted.',
			revocation_of_all_authorizations: 'The card issuer has revoked all authorizations.',
			revocation_of_one_authorization: 'The card issuer has revoked authorization.',
			testmode_decline_visa: 'This is a test card that always declines.',

			// API errors
			authentication_required: 'Additional authentication is required. Please complete 3D Secure.',
			rate_limit: 'Too many requests. Please wait a moment and try again.',
			api_connection_error: 'Network error. Please check your connection and try again.',
			api_error: 'Our payment processor encountered an issue. Please try again.',
			timeout: 'The request timed out. Please try again.',

			// Validation errors
			invalid_request_error: 'The request was invalid. Please check your information and try again.',
			invalid_expiry_month: 'The expiration month you provided is invalid.',
			invalid_expiry_year: 'The expiration year you provided is invalid.',
			invalid_cvc: 'The security code you provided is invalid.'
		}

		let userFriendlyMessage =
			userFriendlyMessages[errorCode || ''] ||
			userFriendlyMessages[declineReason || ''] ||
			error.message ||
			'An error occurred processing your payment. Please try again.'

		let actionType: 'retry' | '3d_secure' | 'update_payment_method' | 'contact_support' | undefined

		if (requires3DS) {
			actionType = '3d_secure'
			userFriendlyMessage = 'Additional authentication is required. Please complete 3D Secure verification.'
		} else if (this.isCardDecline(error) && declineReason) {
			actionType = 'update_payment_method'
		} else if (isRetryable) {
			actionType = 'retry'
		} else if (error.type === 'StripeAPIError' || error.type === 'StripeAuthenticationError') {
			actionType = 'contact_support'
		}

		// Calculate retry after time (exponential backoff: 1s, 2s, 4s, 8s)
		let retryAfterMs: number | undefined
		if (isRetryable && errorCode === 'rate_limit') {
			retryAfterMs = 1000 * (1 + Math.random()) // 1-2 seconds
		}

		this.logger.debug('Stripe error mapped for client', {
			errorCode,
			errorType: error.type,
			declineReason,
			actionType,
			retryAfterMs
		})

		return {
			code: errorCode,
			type: error.type,
			message: error.message || 'Unknown error',
			userFriendlyMessage,
			requiresAction: !!actionType,
			actionType,
			retryAfterMs
		}
	}

	/**
	 * Check if error should trigger exponential backoff retry
	 * Per Stripe documentation, some errors benefit from retry with exponential backoff
	 */
	getRetryBackoff(
		attempt: number,
		baseDelayMs: number = 100
	): number {
		// Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
		// Cap at 30 seconds
		const delay = Math.min(baseDelayMs * Math.pow(2, attempt), 30000)
		// Add jitter: ±10%
		const jitter = delay * 0.1 * (2 * Math.random() - 1)
		return Math.max(delay + jitter, baseDelayMs)
	}
}
