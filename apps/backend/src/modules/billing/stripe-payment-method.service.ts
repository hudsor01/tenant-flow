import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeClientService } from '../../shared/stripe-client.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class StripePaymentMethodService {
	private stripe: Stripe

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly logger: AppLogger
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Create a Payment Intent for one-time payments
	 * Follows official Stripe Payment Intent patterns
	 * Uses idempotency key to prevent duplicate charges on retries
	 */
	async createPaymentIntent(
		params: Stripe.PaymentIntentCreateParams,
		idempotencyKey?: string
	): Promise<Stripe.PaymentIntent> {
		try {
			const requestOptions = idempotencyKey ? { idempotencyKey } : undefined

			const paymentIntent = await this.stripe.paymentIntents.create(
				params,
				requestOptions
			)

			this.logger.log('Payment intent created', { id: paymentIntent.id })
			return paymentIntent
		} catch (error) {
			this.logger.error('Failed to create payment intent', { error })
			throw error
		}
	}

	/**
	 * Create a Checkout Session for payment collection
	 * Implements official Stripe Checkout patterns
	 */
	async createCheckoutSession(
		params: Stripe.Checkout.SessionCreateParams,
		idempotencyKey?: string
	): Promise<Stripe.Checkout.Session> {
		try {
			const requestOptions = idempotencyKey ? { idempotencyKey } : undefined

			const session = await this.stripe.checkout.sessions.create(
				params,
				requestOptions
			)

			this.logger.log('Checkout session created', { id: session.id })
			return session
		} catch (error) {
			this.logger.error('Failed to create checkout session', { error })
			throw error
		}
	}

	/**
	 * Get a specific charge
	 * Used for retrieving charge details and failure messages
	 */
	async getCharge(chargeId: string): Promise<Stripe.Charge | null> {
		try {
			const charge = await this.stripe.charges.retrieve(chargeId)
			return charge
		} catch (error) {
			this.logger.error('Failed to get charge', { error, chargeId })
			return null
		}
	}


	/**
	 * List payment methods for a customer
	 */
	async listPaymentMethods(
		customerId: string,
		type?: 'card' | 'us_bank_account'
	): Promise<Stripe.PaymentMethod[]> {
		try {
			const params: Stripe.PaymentMethodListParams = {
				customer: customerId,
				limit: 10
			}
			if (type) {
				params.type = type
			}

			const paymentMethods = await this.stripe.paymentMethods.list(params)
			return paymentMethods.data
		} catch (error) {
			this.logger.error('Failed to list payment methods', {
				error,
				customerId
			})
			throw error
		}
	}

	/**
	 * Detach a payment method from a customer
	 */
	async detachPaymentMethod(paymentMethodId: string): Promise<void> {
		try {
			await this.stripe.paymentMethods.detach(paymentMethodId)
			this.logger.log('Payment method detached', { paymentMethodId })
		} catch (error) {
			this.logger.error('Failed to detach payment method', {
				error,
				paymentMethodId
			})
			throw error
		}
	}
}
