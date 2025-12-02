import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeClientService } from '../../shared/stripe-client.service'

/**
 * Stripe Connect Billing Service
 *
 * Handles customer and subscription management on connected accounts
 * - Creates customers for tenants on owner's connected account
 * - Creates subscriptions for recurring rent payments
 * - Manages cancellation and cleanup (SAGA compensation)
 */
@Injectable()
export class ConnectBillingService {
	private readonly logger = new Logger(ConnectBillingService.name)
	private stripe: Stripe

	constructor(private readonly stripeClientService: StripeClientService) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * Create a Stripe customer on a connected account
	 * Used for tenant billing when they're added to a lease
	 */
	async createCustomerOnConnectedAccount(
		connectedAccountId: string,
		params: {
			email: string
			name?: string
			phone?: string
			metadata?: Record<string, string>
		}
	): Promise<Stripe.Customer> {
		try {
			const customer = await this.stripe.customers.create(
				{
					email: params.email,
					...(params.name && { name: params.name }),
					...(params.phone && { phone: params.phone }),
					metadata: { platform: 'tenantflow', ...params.metadata }
				},
				{ stripeAccount: connectedAccountId }
			)

			this.logger.log('Created Stripe customer on connected account', {
				customer_id: customer.id,
				stripe_account_id: connectedAccountId,
				email: customer.email
			})

			return customer
		} catch (error) {
			this.logger.error('Failed to create Stripe customer on connected account', {
				error: error instanceof Error ? error.message : String(error),
				stripe_account_id: connectedAccountId,
				email: params.email
			})
			throw error
		}
	}

	/**
	 * Create a Stripe subscription on a connected account
	 * Used for setting up recurring rent payments for tenants
	 *
	 * @param connectedAccountId - The Stripe Connect account ID
	 * @param params.customerId - The Stripe customer ID on the connected account
	 * @param params.rentAmount - Monthly rent amount in cents
	 * @param params.currency - Currency code (default: 'usd')
	 * @param params.metadata - Additional metadata to attach to the subscription
	 * @param params.idempotencyKey - Optional key for safe retries
	 */
	async createSubscriptionOnConnectedAccount(
		connectedAccountId: string,
		params: {
			customerId: string
			rentAmount: number
			currency?: string
			metadata?: Record<string, string>
			idempotencyKey?: string
		}
	): Promise<Stripe.Subscription> {
		try {
			// Create a price object for the monthly rent
			const price = await this.stripe.prices.create(
				{
					currency: params.currency || 'usd',
					unit_amount: params.rentAmount,
					recurring: { interval: 'month' },
					product_data: { name: 'Monthly Rent Payment' }
				},
				{
					stripeAccount: connectedAccountId,
					...(params.idempotencyKey && { idempotencyKey: `${params.idempotencyKey}-price` })
				}
			)

			// Create subscription with the price
			const subscription = await this.stripe.subscriptions.create(
				{
					customer: params.customerId,
					items: [{ price: price.id }],
					payment_behavior: 'default_incomplete',
					expand: ['latest_invoice.payment_intent'],
					metadata: { platform: 'tenantflow', ...params.metadata }
				},
				{
					stripeAccount: connectedAccountId,
					...(params.idempotencyKey && { idempotencyKey: `${params.idempotencyKey}-subscription` })
				}
			)

			this.logger.log('Created Stripe subscription on connected account', {
				subscription_id: subscription.id,
				customer_id: params.customerId,
				stripe_account_id: connectedAccountId,
				rent_amount: params.rentAmount
			})

			return subscription
		} catch (error) {
			this.logger.error('Failed to create Stripe subscription on connected account', {
				error: error instanceof Error ? error.message : String(error),
				stripe_account_id: connectedAccountId,
				customer_id: params.customerId,
				rent_amount: params.rentAmount
			})
			throw error
		}
	}

	/**
	 * Delete a customer on a connected account
	 * Used for SAGA compensation/rollback
	 */
	async deleteCustomer(
		customerId: string,
		connectedAccountId: string
	): Promise<Stripe.DeletedCustomer> {
		try {
			const deletedCustomer = await this.stripe.customers.del(customerId, {
				stripeAccount: connectedAccountId
			})

			this.logger.log('Deleted Stripe customer on connected account', {
				customer_id: customerId,
				stripe_account_id: connectedAccountId
			})

			return deletedCustomer
		} catch (error) {
			this.logger.error('Failed to delete Stripe customer on connected account', {
				error: error instanceof Error ? error.message : String(error),
				stripe_account_id: connectedAccountId,
				customer_id: customerId
			})
			throw error
		}
	}

	/**
	 * Cancel a subscription on a connected account
	 * Used for SAGA compensation/rollback
	 */
	async cancelSubscription(
		subscriptionId: string,
		connectedAccountId: string
	): Promise<Stripe.Subscription> {
		try {
			const canceledSubscription = await this.stripe.subscriptions.cancel(
				subscriptionId,
				{},
				{ stripeAccount: connectedAccountId }
			)

			this.logger.log('Canceled Stripe subscription on connected account', {
				subscription_id: subscriptionId,
				stripe_account_id: connectedAccountId
			})

			return canceledSubscription
		} catch (error) {
			this.logger.error('Failed to cancel Stripe subscription on connected account', {
				error: error instanceof Error ? error.message : String(error),
				stripe_account_id: connectedAccountId,
				subscription_id: subscriptionId
			})
			throw error
		}
	}
}
