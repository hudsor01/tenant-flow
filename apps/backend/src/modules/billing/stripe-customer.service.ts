import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeClientService } from '../../shared/stripe-client.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class StripeCustomerService {
	private stripe: Stripe

	private readonly STRIPE_DEFAULT_LIMIT = 100

	constructor(
		private readonly stripeClientService: StripeClientService,
		private readonly logger: AppLogger
	) {
		this.stripe = this.stripeClientService.getClient()
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
					limit: this.STRIPE_DEFAULT_LIMIT,
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
	 * Create a Customer for recurring payments
	 * Follows official Stripe customer creation patterns
	 */
	async createCustomer(
		params: Stripe.CustomerCreateParams,
		idempotencyKey?: string
	): Promise<Stripe.Customer> {
		try {
			const requestOptions = idempotencyKey ? { idempotencyKey } : undefined

			const customer = await this.stripe.customers.create(
				params,
				requestOptions
			)

			this.logger.log('Customer created', { id: customer.id })
			return customer
		} catch (error) {
			this.logger.error('Failed to create customer', { error })
			throw error
		}
	}
}
