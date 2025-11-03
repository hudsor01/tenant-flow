import { Inject, Injectable, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import Stripe from 'stripe'
import { StripeClientService } from '../../shared/stripe-client.service'

/**
 * Ultra-Native Stripe Service
 *
 * Direct integration with Stripe SDK
 * No abstractions, wrappers, or custom middleware
 */
@Injectable()
export class StripeService {
	private readonly logger = new Logger(StripeService.name)
	private stripe: Stripe

	constructor(
		private readonly stripeClientService: StripeClientService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache
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
		// PERFORMANCE: Cache subscriptions per customer, status, and limit
		const cacheKey = `stripe:subscriptions:${params?.customer || 'all'}:${params?.status || 'all'}:${params?.limit || 'all'}`
		
		const cached = await this.cacheManager.get<Stripe.Subscription[]>(cacheKey)
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
			
			// Cache for 2 minutes (subscriptions change frequently)
			await this.cacheManager.set(cacheKey, subscriptions.data, 120000)
			
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

			while (hasMore) {
				const requestParams: Stripe.SubscriptionListParams = {
					limit: 100,
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

			this.logger.log(`Fetched ${allSubscriptions.length} total subscriptions`)
			return allSubscriptions
		} catch (error) {
			this.logger.error('Failed to get all subscriptions', { error })
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
		// PERFORMANCE: Cache invoices per customer, subscription, status, created date, and limit
		const cacheKey = `stripe:invoices:${params?.customer || 'all'}:${params?.subscription || 'all'}:${params?.status || 'all'}:${params?.limit || 'all'}:${params?.created ? JSON.stringify(params.created) : 'all'}`
		
		const cached = await this.cacheManager.get<Stripe.Invoice[]>(cacheKey)
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
			
			// Cache for 1 minute (invoices can update frequently)
			await this.cacheManager.set(cacheKey, invoices.data, 60000)
			
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
					limit: 100,
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
		try {
			const requestParams: Stripe.CustomerListParams = {
				limit: params?.limit ?? 10,
				expand: ['data.subscriptions']
			}
			if (params?.email) {
				requestParams.email = params.email
			}
			const customers = await this.stripe.customers.list(requestParams)
			// Filter out deleted customers
			return customers.data.filter(c => !('deleted' in c))
		} catch (error) {
			this.logger.error('Failed to list customers', { error })
			throw error
		}
	}

	/**
	 * Get ALL customers with complete pagination
	 */
	async getAllCustomers(params?: {
		email?: string
	}): Promise<Stripe.Customer[]> {
		try {
			const allCustomers: Stripe.Customer[] = []
			let hasMore = true
			let startingAfter: string | undefined

			while (hasMore) {
				const requestParams: Stripe.CustomerListParams = {
					limit: 100,
					expand: ['data.subscriptions']
				}
				if (params?.email) {
					requestParams.email = params.email
				}
				if (startingAfter) {
					requestParams.starting_after = startingAfter
				}
				const customers = await this.stripe.customers.list(requestParams)

				// Filter out deleted customers
				const activeCustomers = customers.data.filter(c => !('deleted' in c))
				allCustomers.push(...activeCustomers)
				hasMore = customers.has_more

				if (hasMore && customers.data.length > 0) {
					startingAfter = customers.data[customers.data.length - 1]?.id
				}
			}

			this.logger.log(`Fetched ${allCustomers.length} total customers`)
			return allCustomers
		} catch (error) {
			this.logger.error('Failed to get all customers', { error })
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
			this.logger.error('Failed to get customer', { error, customerId })
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
			this.logger.error('Failed to search subscriptions', { error, query })
			throw error
		}
	}
}
