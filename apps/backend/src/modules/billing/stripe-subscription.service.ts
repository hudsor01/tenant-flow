import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { createHash } from 'node:crypto'
import { StripeClientService } from '../../shared/stripe-client.service'
import { AppLogger } from '../../logger/app-logger.service'
import { RedisCacheService } from '../../cache/cache.service'

@Injectable()
export class StripeSubscriptionService {
	private stripe: Stripe

	private readonly STRIPE_DEFAULT_LIMIT = 100
	private readonly STRIPE_MAX_TOTAL_ITEMS = 1000
	private readonly SUBSCRIPTIONS_CACHE_TTL_MS = 90_000

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly logger: AppLogger,
		private readonly cache: RedisCacheService
	) {
		this.stripe = this.stripeClientService.getClient()
	}

	/**
	 * List subscriptions with optional customer filter
	 */
	async listSubscriptions(params?: {
		customer?: string
		status?: Stripe.SubscriptionListParams.Status
		limit?: number
	}): Promise<Stripe.Subscription[]> {
		// PERFORMANCE: Cache subscriptions per customer, status, and limit
		const cacheKey = this.buildCacheKey('subscriptions', {
			customer: params?.customer ?? null,
			status: params?.status ?? null,
			limit: params?.limit ?? 10
		})

		const cached = await this.getCachedValue<Stripe.Subscription[]>(cacheKey)
		if (cached) {
			this.logger.debug('Returning cached subscriptions', { cacheKey })
			return cached
		}

		try {
			const requestParams: Stripe.SubscriptionListParams = {
				limit: params?.limit ?? 10,
				expand: ['data.customer', 'data.items']
			}
			if (params?.customer) {
				requestParams.customer = params.customer
			}
			if (params?.status) {
				requestParams.status = params.status
			}
			const subscriptions = await this.stripe.subscriptions.list(requestParams)

			// Cache for 90s (subscriptions change frequently)
			await this.setCachedValue(
				cacheKey,
				subscriptions.data,
				this.SUBSCRIPTIONS_CACHE_TTL_MS
			)

			return subscriptions.data
		} catch (error) {
			this.logger.error('Failed to list subscriptions', { error })
			throw error
		}
	}

	/**
	 * Get ALL subscriptions with complete pagination
	 */
	async getAllSubscriptions(params?: {
		customer?: string
		status?: Stripe.SubscriptionListParams.Status
	}): Promise<Stripe.Subscription[]> {
		try {
			const allSubscriptions: Stripe.Subscription[] = []
			let hasMore = true
			let startingAfter: string | undefined

			while (hasMore && allSubscriptions.length < this.STRIPE_MAX_TOTAL_ITEMS) {
				const requestParams: Stripe.SubscriptionListParams = {
					limit: this.STRIPE_DEFAULT_LIMIT,
					expand: ['data.customer', 'data.items']
				}
				if (params?.customer) {
					requestParams.customer = params.customer
				}
				if (params?.status) {
					requestParams.status = params.status
				}
				if (startingAfter) {
					requestParams.starting_after = startingAfter
				}

				const subscriptions =
					await this.stripe.subscriptions.list(requestParams)

				allSubscriptions.push(...subscriptions.data)
				hasMore = subscriptions.has_more

				if (hasMore && subscriptions.data.length > 0) {
					startingAfter = subscriptions.data[subscriptions.data.length - 1]?.id
				}
			}

			if (allSubscriptions.length >= this.STRIPE_MAX_TOTAL_ITEMS) {
				this.logger.warn(
					`getAllSubscriptions hit max limit of ${this.STRIPE_MAX_TOTAL_ITEMS} items. Consider using listSubscriptions with pagination instead.`
				)
			}

			this.logger.log(`Fetched ${allSubscriptions.length} total subscriptions`)
			return allSubscriptions
		} catch (error) {
			this.logger.error('Failed to get all subscriptions', { error })
			throw error
		}
	}

	/**
	 * Search for resources using Stripe's search API
	 */
	async searchSubscriptions(query: string): Promise<Stripe.Subscription[]> {
		try {
			const result = await this.stripe.subscriptions.search({
				query,
				limit: this.STRIPE_DEFAULT_LIMIT,
				expand: ['data.customer']
			})
			return result.data
		} catch (error) {
			this.logger.error('Failed to search subscriptions', { error, query })
			throw error
		}
	}

	/**
	 * Create a Subscription for recurring payments
	 * Implements official Stripe subscription patterns with proper error handling
	 */
	async createSubscription(
		params: Stripe.SubscriptionCreateParams,
		idempotencyKey?: string
	): Promise<Stripe.Subscription> {
		try {
			const requestOptions = idempotencyKey ? { idempotencyKey } : undefined

			const subscription = await this.stripe.subscriptions.create(
				params,
				requestOptions
			)

			this.logger.log('Subscription created', { id: subscription.id })
			return subscription
		} catch (error) {
			this.logger.error('Failed to create subscription', { error })
			throw error
		}
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
		try {
			const requestOptions = idempotencyKey ? { idempotencyKey } : undefined

			const subscription = await this.stripe.subscriptions.update(
				subscriptionId,
				params,
				requestOptions
			)

			this.logger.log('Subscription updated', { id: subscription.id })
			return subscription
		} catch (error) {
			this.logger.error('Failed to update subscription', { error })
			throw error
		}
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
