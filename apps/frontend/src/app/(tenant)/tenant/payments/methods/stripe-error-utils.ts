import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { StripeError } from '@stripe/stripe-js'

const logger = createLogger({ component: 'PaymentMethodSetupForm' })

/**
 * Extract user-friendly error message from Stripe errors
 */
export function getStripeErrorMessage(error: StripeError): string {
	switch (error.type) {
		case 'card_error':
			return error.message || 'Card error occurred'
		case 'validation_error':
			return error.message || 'Please check your payment information'
		case 'invalid_request_error':
			logger.error('Invalid request error', { error })
			return 'Invalid payment request. Please try again.'
		default:
			logger.error('Payment method creation error', { error })
			return error.message || 'Failed to create payment method'
	}
}
