import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { createHash } from 'node:crypto'
import { StripeClientService } from '../../shared/stripe-client.service'
import { AppLogger } from '../../logger/app-logger.service'
import { RedisCacheService } from '../../cache/cache.service'
import { StripeCustomerService } from './stripe-customer.service'
import { SubscriptionService } from './subscriptions/subscription.service'
import { PaymentMethodService } from './subscriptions/payment-method.service'

/**
 * Ultra-Native Stripe Service
 *
 * Direct integration with Stripe SDK
 * No abstractions, wrappers, or custom middleware
 */
@Injectable()
export class StripeService {
	private stripe: Stripe

	// Stripe API pagination defaults
	private readonly STRIPE_DEFAULT_LIMIT = 100 // Maximum items per page for Stripe API
		private readonly INVOICES_CACHE_TTL_MS = 45_000

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly logger: AppLogger,
		private readonly cache: RedisCacheService,
		private readonly stripeCustomerService: StripeCustomerService,
		private readonly subscriptionService: SubscriptionService,
		private readonly paymentMethodService: PaymentMethodService
	) {
		this.stripe = this.stripeClientService.getClient()
		this.logger.log('Stripe SDK initialized')
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
		return this.subscriptionService.listSubscriptions(params)
	}

	/**
	 * Get ALL subscriptions with complete pagination
	 */
	async getAllSubscriptions(params?: {
		customer?: string
		status?: Stripe.SubscriptionListParams.Status
	}): Promise<Stripe.Subscription[]> {
		return this.subscriptionService.getAllSubscriptions(params)
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
		// PERFORMANCE: Cache invoices per customer, subscription, status, created date, and limit
		const cacheKey = this.buildCacheKey('invoices', {
			customer: params?.customer ?? null,
			subscription: params?.subscription ?? null,
			status: params?.status ?? null,
			limit: params?.limit ?? 10,
			created: params?.created ?? null
		})

		const cached = await this.getCachedValue<Stripe.Invoice[]>(cacheKey)
		if (cached) {
			this.logger.debug('Returning cached invoices', { cacheKey })
			return cached
		}

		try {
			const requestParams: Stripe.InvoiceListParams = {
				limit: params?.limit ?? 10,
				expand: ['data.subscription', 'data.customer']
			}
			if (params?.customer) {
				requestParams.customer = params.customer
			}
			if (params?.subscription) {
				requestParams.subscription = params.subscription
			}
			if (params?.status) {
				requestParams.status = params.status as Stripe.InvoiceListParams.Status
			}
			if (params?.created) {
				requestParams.created = params.created
			}
			const invoices = await this.stripe.invoices.list(requestParams)

			// Cache for 45s (invoices can update frequently)
			await this.setCachedValue(
				cacheKey,
				invoices.data,
				this.INVOICES_CACHE_TTL_MS
			)

			return invoices.data
		} catch (error) {
			this.logger.error('Failed to list invoices', { error })
			throw error
		}
	}

	/**
	 * Get ALL invoices with complete pagination
	 */
	async getAllInvoices(params?: {
		customer?: string
		subscription?: string
		status?: string
		created?: { gte?: number; lte?: number }
	}): Promise<Stripe.Invoice[]> {
		try {
			const allInvoices: Stripe.Invoice[] = []
			let hasMore = true
			let startingAfter: string | undefined

			while (hasMore) {
				const requestParams: Stripe.InvoiceListParams = {
					limit: this.STRIPE_DEFAULT_LIMIT,
					expand: ['data.subscription', 'data.customer']
				}
				if (params?.customer) {
					requestParams.customer = params.customer
				}
				if (params?.subscription) {
					requestParams.subscription = params.subscription
				}
				if (params?.status) {
					requestParams.status =
						params.status as Stripe.InvoiceListParams.Status
				}
				if (params?.created) {
					requestParams.created = params.created
				}
				if (startingAfter) {
					requestParams.starting_after = startingAfter
				}

				const invoices = await this.stripe.invoices.list(requestParams)

				allInvoices.push(...invoices.data)
				hasMore = invoices.has_more

				if (hasMore && invoices.data.length > 0) {
					startingAfter = invoices.data[invoices.data.length - 1]?.id
				}
			}

			this.logger.log(`Fetched ${allInvoices.length} total invoices`)
			return allInvoices
		} catch (error) {
			this.logger.error('Failed to get all invoices', { error })
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
		return this.stripeCustomerService.listCustomers(params)
	}

	/**
	 * Get ALL customers with complete pagination
	 */
	async getAllCustomers(params?: {
		email?: string
	}): Promise<Stripe.Customer[]> {
		return this.stripeCustomerService.getAllCustomers(params)
	}

	/**
	 * Get a specific customer
	 */
	async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
		return this.stripeCustomerService.getCustomer(customerId)
	}

	/**
	 * Search for resources using Stripe's search API
	 */
	async searchSubscriptions(query: string): Promise<Stripe.Subscription[]> {
		return this.subscriptionService.searchSubscriptions(query)
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
		return this.paymentMethodService.createPaymentIntent(
			params,
			idempotencyKey
		)
	}

	/**
	 * Create a Customer for recurring payments
	 * Follows official Stripe customer creation patterns
	 */
	async createCustomer(
		params: Stripe.CustomerCreateParams,
		idempotencyKey?: string
	): Promise<Stripe.Customer> {
		return this.stripeCustomerService.createCustomer(params, idempotencyKey)
	}

	/**
	 * Create a Subscription for recurring payments
	 * Implements official Stripe subscription patterns with proper error handling
	 */
	async createSubscription(
		params: Stripe.SubscriptionCreateParams,
		idempotencyKey?: string
	): Promise<Stripe.Subscription> {
		return this.subscriptionService.createSubscription(
			params,
			idempotencyKey
		)
	}

	/**
	 * Update a Subscription
	 * Handles plan changes with proper proration and billing cycle management
	 */
	async updateSubscription(
		subscriptionId: string,
		params: Stripe.SubscriptionUpdateParams,
		idempotencyKey?: string
	): Promise<Stripe.Subscription> {
		return this.subscriptionService.updateSubscription(
			subscriptionId,
			params,
			idempotencyKey
		)
	}

	/**
	 * Create a Checkout Session for payment collection
	 * Implements official Stripe Checkout patterns
	 */
	async createCheckoutSession(
		params: Stripe.Checkout.SessionCreateParams,
		idempotencyKey?: string
	): Promise<Stripe.Checkout.Session> {
		return this.paymentMethodService.createCheckoutSession(
			params,
			idempotencyKey
		)
	}

	/**
	 * Get a specific charge
	 * Used for retrieving charge details and failure messages
	 */
	async getCharge(chargeId: string): Promise<Stripe.Charge | null> {
		return this.paymentMethodService.getCharge(chargeId)
	}

	private buildCacheKey(prefix: string, params: unknown): string {
		const hash = this.hashParams(params)
		return `stripe:${prefix}:${hash}`
	}

	private hashParams(params: unknown): string {
		const stable = this.stableStringify(params)
		return createHash('md5').update(stable).digest('hex')
	}

	private stableStringify(value: unknown): string {
		if (value === null || typeof value !== 'object') {
			return JSON.stringify(value)
		}

		if (Array.isArray(value)) {
			return `[${value.map(item => this.stableStringify(item)).join(',')}]`
		}

		const record = value as Record<string, unknown>
		const keys = Object.keys(record).sort()
		return `{${keys
			.map(key => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
			.join(',')}}`
	}

	private async getCachedValue<T>(cacheKey: string): Promise<T | null> {
		return this.cache.get<T>(cacheKey)
	}

	private async setCachedValue<T>(
		cacheKey: string,
		value: T,
		ttlMs: number
	): Promise<void> {
		await this.cache.set(cacheKey, value, {
			ttlMs,
			tier: 'short',
			tags: ['stripe']
		})
	}
}
