import { Injectable, Logger, Optional } from '@nestjs/common'
import Stripe from 'stripe'

/**
 * Ultra-Native Stripe Service
 *
 * Direct integration with Stripe SDK
 * No abstractions, wrappers, or custom middleware
 */
@Injectable()
export class StripeService {
	private stripe: Stripe

	constructor(@Optional() private readonly logger?: Logger) {
		const stripeSecretKey = process.env.STRIPE_SECRET_KEY
		if (!stripeSecretKey) {
			throw new Error('STRIPE_SECRET_KEY is required')
		}

		this.stripe = new Stripe(stripeSecretKey, {
			apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion,
			typescript: true
		})

		this.logger?.log('Stripe SDK initialized')
	}

	/**
	 * Get the Stripe instance for direct API access
	 */
	getStripe(): Stripe {
		return this.stripe
	}

	/**
	 * List subscriptions with optional customer filter
	 */
	async listSubscriptions(params?: {
		customer?: string
		status?: Stripe.SubscriptionListParams.Status
		limit?: number
	}): Promise<Stripe.Subscription[]> {
		try {
			const subscriptions = await this.stripe.subscriptions.list({
				customer: params?.customer,
				status: params?.status,
				limit: params?.limit || 100,
				expand: ['data.customer', 'data.items']
			})
			return subscriptions.data
		} catch (error) {
			this.logger?.error('Failed to list subscriptions', { error })
			throw error
		}
	}

	/**
	 * List invoices with optional filters
	 */
	async listInvoices(params?: {
		customer?: string
		subscription?: string
		status?: string
		created?: { gte?: number; lte?: number }
		limit?: number
	}): Promise<Stripe.Invoice[]> {
		try {
			const invoices = await this.stripe.invoices.list({
				customer: params?.customer,
				subscription: params?.subscription,
				status: params?.status as Stripe.InvoiceListParams.Status,
				created: params?.created,
				limit: params?.limit || 100,
				expand: ['data.subscription', 'data.customer']
			})
			return invoices.data
		} catch (error) {
			this.logger?.error('Failed to list invoices', { error })
			throw error
		}
	}

	/**
	 * List customers with optional filters
	 */
	async listCustomers(params?: {
		email?: string
		limit?: number
	}): Promise<Stripe.Customer[]> {
		try {
			const customers = await this.stripe.customers.list({
				email: params?.email,
				limit: params?.limit || 100,
				expand: ['data.subscriptions']
			})
			// Filter out deleted customers
			return customers.data.filter(c => !('deleted' in c))
		} catch (error) {
			this.logger?.error('Failed to list customers', { error })
			throw error
		}
	}

	/**
	 * Get a specific customer
	 */
	async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
		try {
			const customer = await this.stripe.customers.retrieve(customerId, {
				expand: ['subscriptions']
			})
			if ('deleted' in customer) {
				return null
			}
			return customer
		} catch (error) {
			this.logger?.error('Failed to get customer', { error, customerId })
			return null
		}
	}

	/**
	 * Search for resources using Stripe's search API
	 */
	async searchSubscriptions(query: string): Promise<Stripe.Subscription[]> {
		try {
			const result = await this.stripe.subscriptions.search({
				query,
				limit: 100,
				expand: ['data.customer']
			})
			return result.data
		} catch (error) {
			this.logger?.error('Failed to search subscriptions', { error, query })
			throw error
		}
	}
}
