import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../supabase/supabase.service'

export interface StripeCustomerFDW {
	id: string
	email: string
	name: string
	description?: string
	phone?: string
	currency?: string
	balance?: number
	delinquent?: boolean
	livemode?: boolean
	metadata?: Record<string, string | number | boolean | null>
	created_at?: Date
}

export interface StripeSubscriptionFDW {
	id: string
	customer_id: string
	status: string
	cancel_at_period_end?: boolean
	currency?: string
	default_payment_method?: string
	description?: string
	livemode?: boolean
	metadata?: Record<string, string | number | boolean | null>
	created_at?: Date
	current_period_start?: Date
	current_period_end?: Date
	trial_end?: Date
}

export interface StripePaymentIntentFDW {
	id: string
	amount: number
	currency: string
	customer_id?: string
	status: string
	description?: string
	receipt_email?: string
	livemode?: boolean
	metadata?: Record<string, string | number | boolean | null>
	created_at?: Date
}

export interface StripeProductFDW {
	id: string
	name: string
	description?: string
	active?: boolean
	type?: string
	livemode?: boolean
	metadata?: Record<string, string | number | boolean | null>
	created_at?: Date
	updated_at?: Date
}

export interface StripePriceFDW {
	id: string
	product_id: string
	unit_amount?: number
	currency: string
	type: string
	active?: boolean
	billing_scheme?: string
	recurring?: { interval: string; interval_count?: number }
	livemode?: boolean
	metadata?: Record<string, string | number | boolean | null>
	created_at?: Date
}

@Injectable()
export class StripeFdwService {
	private readonly logger = new Logger(StripeFdwService.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get all customers from Stripe via Foreign Data Wrapper
	 */
	async getCustomers(limit = 50): Promise<StripeCustomerFDW[]> {
		try {
			const { data, error } = await this.supabase.getAdminClient().rpc(
				'get_stripe_customers' as never,
				{
					limit_count: limit
				} as never
			)

			if (error) {
				throw error
			}
			return (data as StripeCustomerFDW[]) || []
		} catch (error) {
			this.logger.error(
				'Failed to fetch Stripe customers via FDW:',
				error
			)
			throw error
		}
	}

	/**
	 * Get customer by ID from Stripe via Foreign Data Wrapper
	 */
	async getCustomerById(
		customerId: string
	): Promise<StripeCustomerFDW | null> {
		try {
			const { data, error } = await this.supabase.getAdminClient().rpc(
				'get_stripe_customer_by_id' as never,
				{
					customer_id: customerId
				} as never
			)

			if (error) {
				throw error
			}
			return data || null
		} catch (error) {
			this.logger.error(
				`Failed to fetch Stripe customer ${customerId} via FDW:`,
				error
			)
			throw error
		}
	}

	/**
	 * Get subscriptions from Stripe via Foreign Data Wrapper
	 */
	async getSubscriptions(
		customerId?: string,
		limit = 50
	): Promise<StripeSubscriptionFDW[]> {
		try {
			const { data, error } = await this.supabase.getAdminClient().rpc(
				'get_stripe_subscriptions' as never,
				{
					customer_id: customerId || null,
					limit_count: limit
				} as never
			)

			if (error) {
				throw error
			}
			return (data as StripeSubscriptionFDW[]) || []
		} catch (error) {
			this.logger.error(
				'Failed to fetch Stripe subscriptions via FDW:',
				error
			)
			throw error
		}
	}

	/**
	 * Get payment intents from Stripe via Foreign Data Wrapper
	 */
	async getPaymentIntents(
		customerId?: string,
		limit = 50
	): Promise<StripePaymentIntentFDW[]> {
		try {
			const { data, error } = await this.supabase.getAdminClient().rpc(
				'get_stripe_payment_intents' as never,
				{
					customer_id: customerId || null,
					limit_count: limit
				} as never
			)

			if (error) {
				throw error
			}
			return (data as StripePaymentIntentFDW[]) || []
		} catch (error) {
			this.logger.error(
				'Failed to fetch Stripe payment intents via FDW:',
				error
			)
			throw error
		}
	}

	/**
	 * Get products from Stripe via Foreign Data Wrapper
	 */
	async getProducts(
		activeOnly = true,
		limit = 50
	): Promise<StripeProductFDW[]> {
		try {
			const { data, error } = await this.supabase.getAdminClient().rpc(
				'get_stripe_products' as never,
				{
					active_only: activeOnly,
					limit_count: limit
				} as never
			)

			if (error) {
				throw error
			}
			return (data as StripeProductFDW[]) || []
		} catch (error) {
			this.logger.error('Failed to fetch Stripe products via FDW:', error)
			throw error
		}
	}

	/**
	 * Get prices from Stripe via Foreign Data Wrapper
	 */
	async getPrices(
		productId?: string,
		activeOnly = true,
		limit = 50
	): Promise<StripePriceFDW[]> {
		try {
			const { data, error } = await this.supabase.getAdminClient().rpc(
				'get_stripe_prices' as never,
				{
					product_id: productId || null,
					active_only: activeOnly,
					limit_count: limit
				} as never
			)

			if (error) {
				throw error
			}
			return (data as StripePriceFDW[]) || []
		} catch (error) {
			this.logger.error('Failed to fetch Stripe prices via FDW:', error)
			throw error
		}
	}

	/**
	 * Get customer payment history with related data
	 */
	async getCustomerPaymentHistory(customerId: string): Promise<{
		customer: StripeCustomerFDW | null
		subscriptions: StripeSubscriptionFDW[]
		paymentIntents: StripePaymentIntentFDW[]
	}> {
		try {
			const [customer, subscriptions, paymentIntents] = await Promise.all(
				[
					this.getCustomerById(customerId),
					this.getSubscriptions(customerId),
					this.getPaymentIntents(customerId)
				]
			)

			return {
				customer,
				subscriptions,
				paymentIntents
			}
		} catch (error) {
			this.logger.error(
				`Failed to fetch payment history for customer ${customerId}:`,
				error
			)
			throw error
		}
	}

	/**
	 * Execute custom SQL queries on Stripe data via FDW
	 * Use with caution - this allows direct SQL access
	 */
	async executeCustomQuery(query: string): Promise<unknown[]> {
		try {
			const { data, error } = await this.supabase.getAdminClient().rpc(
				'execute_stripe_fdw_query' as never,
				{
					sql_query: query
				} as never
			)

			if (error) {
				throw error
			}
			return data || []
		} catch (error) {
			this.logger.error(
				'Failed to execute custom Stripe FDW query:',
				error
			)
			throw error
		}
	}

	/**
	 * Get subscription analytics from Stripe data
	 */
	async getSubscriptionAnalytics(): Promise<{
		totalSubscriptions: number
		activeSubscriptions: number
		canceledSubscriptions: number
		trialSubscriptions: number
		monthlyRevenue: number
	}> {
		try {
			const { data, error } = await this.supabase
				.getAdminClient()
				.rpc('get_stripe_subscription_analytics' as never)

			if (error) {
				throw error
			}
			return (
				data || {
					totalSubscriptions: 0,
					activeSubscriptions: 0,
					canceledSubscriptions: 0,
					trialSubscriptions: 0,
					monthlyRevenue: 0
				}
			)
		} catch (error) {
			this.logger.error(
				'Failed to calculate subscription analytics:',
				error
			)
			throw error
		}
	}
}
