import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'

/**
 * Stripe 3D Secure Service
 *
 * Handles 3D Secure (Strong Customer Authentication) challenges for card payments
 * Per Stripe documentation: https://docs.stripe.com/payments/3d-secure/authentication-flow
 *
 * 3D Secure is triggered when:
 * 1. Authentication_required error code is returned from payment attempt
 * 2. Payment intent status transitions to requires_action
 * 3. Bank requests additional authentication via soft decline
 * 4. Regulatory requirements (SCA/PSD2 in Europe)
 *
 * Client flow:
 * 1. Client receives payment intent with status=requires_action
 * 2. Client extracts clientSecret and calls stripe.handleCardAction()
 * 3. User completes 3D Secure challenge in bank's authentication interface
 * 4. Client receives success/failure and notifies server
 * 5. Server confirms payment intent again to complete charge
 */
@Injectable()
export class Stripe3DSecureService {
	private readonly logger = new Logger(Stripe3DSecureService.name)

	/**
	 * Check if payment intent requires 3D Secure action
	 * Per Stripe docs, status requires_action means next_action must be handled
	 */
	requires3DSecure(paymentIntent: Stripe.PaymentIntent): boolean {
		return paymentIntent.status === 'requires_action'
	}

	/**
	 * Extract 3D Secure action details from payment intent
	 * Returns information client needs to display 3D Secure challenge
	 */
	extract3DSecureAction(
		paymentIntent: Stripe.PaymentIntent
	): {
		clientSecret: string | null
		nextActionType: string | null
		requiresClientAction: boolean
	} {
		if (!this.requires3DSecure(paymentIntent)) {
			return {
				clientSecret: null,
				nextActionType: null,
				requiresClientAction: false
			}
		}

		// Per Stripe API docs, next_action tells client what to do
		const nextAction = paymentIntent.next_action
		let nextActionType: string | null = null

		if (nextAction && 'type' in nextAction) {
			nextActionType = nextAction.type
		}

		return {
			clientSecret: paymentIntent.client_secret || null,
			nextActionType,
			requiresClientAction: true
		}
	}

	/**
	 * Map 3D Secure error to user-friendly message
	 * Helps clients understand authentication failures
	 */
	map3DSecureError(
		lastPaymentError: Stripe.PaymentIntent.LastPaymentError | undefined | null
	): {
		userMessage: string
		actionType: 'retry' | 'update_payment_method' | 'contact_support'
		shouldRetry: boolean
	} {
		if (!lastPaymentError) {
			return {
				userMessage: 'Authentication failed. Please try again.',
				actionType: 'retry',
				shouldRetry: true
			}
		}

		const code = lastPaymentError.code || ''

		// Map specific error codes to user-friendly messages
		const errorMessages: Record<string, string> = {
			authentication_not_handled:
				'Authentication was not completed. Please try your payment again.',
			authentication_error:
				'Authentication failed. Please verify your card details and try again.',
			card_error:
				'Your card was declined. Please try a different card or contact your bank.',
			requires_action_not_handled:
				'Your payment requires authentication. Please try again with a different payment method.',
			declined: 'Your card was declined. Please try a different payment method.',
			expired_card: 'Your card has expired. Please update your payment method.'
		}

		const userMessage =
			errorMessages[code] ||
			lastPaymentError.message ||
			'Payment failed. Please try again or contact support.'

		// Determine if retry is advisable
		const retryableErrors = [
			'authentication_not_handled',
			'authentication_error',
			'temporary_error',
			'api_error'
		]
		const shouldRetry = retryableErrors.includes(code)

		// Determine action type
		let actionType: 'retry' | 'update_payment_method' | 'contact_support' = 'retry'
		if (
			(code as string) === 'card_error' ||
			(code as string) === 'declined' ||
			(code as string) === 'expired_card'
		) {
			actionType = 'update_payment_method'
		} else if (!shouldRetry) {
			actionType = 'contact_support'
		}

		return {
			userMessage,
			actionType,
			shouldRetry
		}
	}

	/**
	 * Format 3D Secure response for client
	 * Provides all information client needs to handle authentication
	 */
	format3DSecureResponse(
		paymentIntent: Stripe.PaymentIntent
	): {
		clientSecret: string | null
		status: string
		requiresAuthentication: boolean
		nextActionType: string | null
		userMessage: string
		actionType?: 'retry' | 'update_payment_method' | 'contact_support'
	} {
		const is3DSecure = this.requires3DSecure(paymentIntent)
		const actionDetails = this.extract3DSecureAction(paymentIntent)

		let userMessage =
			'Your payment requires additional authentication. ' +
			'Please complete the authentication process in your browser or app.'
		let actionType: 'retry' | 'update_payment_method' | 'contact_support' | undefined

		if (!is3DSecure && paymentIntent.last_payment_error) {
			const errorMapping = this.map3DSecureError(paymentIntent.last_payment_error)
			userMessage = errorMapping.userMessage
			actionType = errorMapping.actionType
		}

		this.logger.debug('3D Secure response formatted', {
			paymentIntentId: paymentIntent.id,
			status: paymentIntent.status,
			requiresAuthentication: is3DSecure,
			nextActionType: actionDetails.nextActionType
		})

		return {
			clientSecret: actionDetails.clientSecret,
			status: paymentIntent.status,
			requiresAuthentication: is3DSecure,
			nextActionType: actionDetails.nextActionType,
			userMessage,
			...(actionType && { actionType })
		}
	}

	/**
	 * Check if payment intent can be confirmed after 3D Secure
	 * Per Stripe docs, status requires_confirmation means server should confirm
	 */
	canConfirmAfter3DSecure(paymentIntent: Stripe.PaymentIntent): boolean {
		return paymentIntent.status === 'requires_confirmation'
	}

	/**
	 * Check if 3D Secure authentication timed out
	 * Per Stripe docs, 3DS session expires after 1 hour
	 * Payment intent transitions back to requires_payment_method
	 */
	did3DSecureTimeout(paymentIntent: Stripe.PaymentIntent): boolean {
		return (
			paymentIntent.status === 'requires_payment_method' &&
			(paymentIntent.last_payment_error?.code as string) === 'requires_action_not_handled'
		)
	}

	/**
	 * Log 3D Secure event for monitoring and debugging
	 */
	log3DSecureEvent(
		eventType:
			| 'authentication_required'
			| 'authentication_completed'
			| 'authentication_failed'
			| 'authentication_timeout',
		paymentIntent: Stripe.PaymentIntent,
		metadata?: Record<string, unknown>
	): void {
		this.logger.log(`3D Secure event: ${eventType}`, {
			paymentIntentId: paymentIntent.id,
			status: paymentIntent.status,
			amount: paymentIntent.amount,
			currency: paymentIntent.currency,
			...metadata
		})
	}
}
