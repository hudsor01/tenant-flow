import type { StripeError } from '@stripe/stripe-js';

/**
 * We derive our error types directly from the official StripeError type
 * and add our own 'unknown_error' for catch-all cases.
 * This makes the code more maintainable, as it will automatically
 * include any new error types if the @stripe/stripe-js library is updated.
 */
export interface StripeErrorInfo {
	message: string;
	type: StripeError['type'] | 'unknown_error';
	userFriendlyMessage: string;
	actionable: boolean;
	retryable: boolean;
}

export function parseStripeError(error: StripeError): StripeErrorInfo {
	// Initialize with default values. The switch statement will override these.
	const parsedError: StripeErrorInfo = {
		message: error.message || 'An unknown error occurred.',
		type: error.type,
		userFriendlyMessage:
			'An unexpected error occurred. Please try again or contact support if the issue persists.',
		actionable: false,
		retryable: true,
	};

	switch (error.type) {
		case 'card_error':
			parsedError.actionable = true;
			parsedError.retryable = false;

			// The nested switch for specific card error codes is a great pattern.
			switch (error.code) {
				case 'card_declined':
					parsedError.userFriendlyMessage =
						'Your card was declined. Please try a different payment method or contact your bank.';
					break;
				case 'insufficient_funds':
					parsedError.userFriendlyMessage =
						'Your card has insufficient funds. Please try a different payment method.';
					break;
				case 'expired_card':
					parsedError.userFriendlyMessage =
						'Your card has expired. Please use a different payment method.';
					break;
				case 'incorrect_cvc':
					parsedError.userFriendlyMessage =
						'The security code (CVC) is incorrect. Please check and try again.';
					break;
				case 'incorrect_number':
					parsedError.userFriendlyMessage =
						'The card number is incorrect. Please check and try again.';
					break;
				case 'incorrect_zip':
					parsedError.userFriendlyMessage =
						'The postal code is incorrect. Please check and try again.';
					break;
				case 'processing_error':
					parsedError.userFriendlyMessage =
						'An error occurred while processing your card. Please try again.';
					parsedError.retryable = true;
					break;
				default:
					parsedError.userFriendlyMessage = error.message || 'An unknown card error occurred.';
			}
			break;

		case 'validation_error':
			parsedError.actionable = true;
			parsedError.retryable = false;
			parsedError.userFriendlyMessage =
				'Please check your payment information and try again.';
			break;

		case 'api_error':
			parsedError.retryable = true;
			parsedError.userFriendlyMessage =
				'A temporary error occurred on our side. Please try again in a moment.';
			break;

		case 'authentication_error':
			parsedError.retryable = true;
			parsedError.userFriendlyMessage =
				'Authentication failed. Please refresh the page and try again.';
			break;

		case 'rate_limit_error':
			parsedError.retryable = true;
			parsedError.userFriendlyMessage =
				'Too many requests. Please wait a moment and try again.';
			break;

		case 'idempotency_error':
			parsedError.retryable = true;
			parsedError.userFriendlyMessage =
				'A duplicate request was detected. Please wait a moment and try again.';
			break;

		case 'invalid_request_error':
			// These are typically developer errors and not actionable by the user,
			// but a refresh is a safe suggestion.
			parsedError.actionable = false;
			parsedError.retryable = false;
			parsedError.userFriendlyMessage =
				'Invalid request. Please refresh the page and try again.';
			break;

		// The default case is now implicitly handled by the initial object values.
		// If Stripe adds a new error type, it will gracefully fall back to the defaults.
		// We can add an explicit default to handle the 'unknown_error' type if needed,
		// but the initial setup already covers it.
	}

	// If for some reason error.type is null or undefined, we ensure a safe fallback.
	if (!parsedError.type) {
		parsedError.type = 'unknown_error';
	}


	return parsedError;
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
	private retryDelays: number[]

	constructor(maxRetries = 3) {
		this.maxRetries = maxRetries
		this.retryDelays = Array.from({ length: this.maxRetries }, (_, i) =>
			getRetryDelay(i + 1)
		)
	}

	async executeWithRetry<T>(
		operation: () => Promise<T>,
		onError?: (errorInfo: StripeErrorInfo, attempt: number) => void
	): Promise<T> {
		let lastError: StripeError | undefined

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

		throw lastError ?? new Error('Unknown error occurred during Stripe operation')
	}
}

// Utility function for React components
import { useMemo } from 'react'

export function useStripeErrorHandler() {
	const handler = useMemo(() => new StripeErrorHandler(), [])

	return {
		executeWithRetry: handler.executeWithRetry.bind(handler),
		parseError: parseStripeError,
		shouldRetry: shouldRetryError,
		getRetryDelay
	}
}
