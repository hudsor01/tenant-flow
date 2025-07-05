import type { StripeError } from '@stripe/stripe-js'

export interface StripeErrorInfo {
	message: string
	type:
		| 'card_error'
		| 'validation_error'
		| 'api_error'
		| 'authentication_error'
		| 'rate_limit_error'
		| 'idempotency_error'
		| 'invalid_request_error'
		| 'unknown_error'
	userFriendlyMessage: string
	actionable: boolean
	retryable: boolean
}

export function parseStripeError(error: StripeError): StripeErrorInfo {
	const baseInfo: StripeErrorInfo = {
		message: error.message || 'An unknown error occurred',
		type: error.type || 'unknown_error',
		userFriendlyMessage: '',
		actionable: false,
		retryable: false
	}

	switch (error.type) {
		case 'card_error':
			baseInfo.actionable = true
			baseInfo.retryable = false

			switch (error.code) {
				case 'card_declined':
					baseInfo.userFriendlyMessage =
						'Your card was declined. Please try a different payment method or contact your bank.'
					break
				case 'insufficient_funds':
					baseInfo.userFriendlyMessage =
						'Your card has insufficient funds. Please try a different payment method.'
					break
				case 'expired_card':
					baseInfo.userFriendlyMessage =
						'Your card has expired. Please use a different payment method.'
					break
				case 'incorrect_cvc':
					baseInfo.userFriendlyMessage =
						'The security code (CVC) is incorrect. Please check and try again.'
					break
				case 'incorrect_number':
					baseInfo.userFriendlyMessage =
						'The card number is incorrect. Please check and try again.'
					break
				case 'incorrect_zip':
					baseInfo.userFriendlyMessage =
						'The postal code is incorrect. Please check and try again.'
					break
				case 'processing_error':
					baseInfo.userFriendlyMessage =
						'An error occurred while processing your card. Please try again.'
					baseInfo.retryable = true
					break
				default:
					baseInfo.userFriendlyMessage = `Card error: ${error.message}`
			}
			break

		case 'validation_error':
			baseInfo.actionable = true
			baseInfo.retryable = false
			baseInfo.userFriendlyMessage =
				'Please check your payment information and try again.'
			break

		case 'api_error':
			baseInfo.retryable = true
			baseInfo.userFriendlyMessage =
				'A temporary error occurred. Please try again in a moment.'
			break

		case 'authentication_error':
			baseInfo.userFriendlyMessage =
				'Authentication failed. Please refresh the page and try again.'
			baseInfo.retryable = true
			break

		case 'rate_limit_error':
			baseInfo.retryable = true
			baseInfo.userFriendlyMessage =
				'Too many requests. Please wait a moment and try again.'
			break

		case 'idempotency_error':
			baseInfo.retryable = true
			baseInfo.userFriendlyMessage =
				'A duplicate request was detected. Please wait a moment and try again.'
			break

		case 'invalid_request_error':
			baseInfo.userFriendlyMessage =
				'Invalid request. Please refresh the page and try again.'
			break

		default:
			baseInfo.userFriendlyMessage =
				'An unexpected error occurred. Please try again or contact support if the issue persists.'
			baseInfo.retryable = true
	}

	return baseInfo
}

export function getRetryDelay(attemptNumber: number): number {
	// Exponential backoff: 1s, 2s, 4s, 8s, max 30s
	return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000)
}

export function shouldRetryError(
	error: StripeError,
	attemptNumber: number
): boolean {
	const maxRetries = 3
	if (attemptNumber >= maxRetries) return false

	const errorInfo = parseStripeError(error)
	return errorInfo.retryable
}

export class StripeErrorHandler {
	private maxRetries = 3
	private retryDelays: number[] = [1000, 2000, 4000] // 1s, 2s, 4s

	constructor(maxRetries = 3) {
		this.maxRetries = maxRetries
	}

	async executeWithRetry<T>(
		operation: () => Promise<T>,
		onError?: (error: StripeErrorInfo, attempt: number) => void
	): Promise<T> {
		let lastError: StripeError

		for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error as StripeError
				const errorInfo = parseStripeError(lastError)

				if (onError) {
					onError(errorInfo, attempt)
				}

				// Don't retry if it's not retryable or we've hit max retries
				if (!errorInfo.retryable || attempt >= this.maxRetries) {
					throw lastError
				}

				// Wait before retrying
				const delay = this.retryDelays[attempt - 1] || 4000
				await new Promise(resolve => setTimeout(resolve, delay))
			}
		}

		throw lastError!
	}
}

// Utility function for React components
export function useStripeErrorHandler() {
	const handler = new StripeErrorHandler()

	return {
		executeWithRetry: handler.executeWithRetry.bind(handler),
		parseError: parseStripeError,
		shouldRetry: shouldRetryError,
		getRetryDelay
	}
}
