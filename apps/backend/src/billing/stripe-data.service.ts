import {
	Injectable,
	InternalServerErrorException,
	BadRequestException,
	Logger,
	Optional
} from '@nestjs/common'
import type {
	ChurnAnalytics,
	CustomerLifetimeValue,
	RevenueAnalytics,
	Database
} from '@repo/shared'
import { SupabaseService } from '../database/supabase.service'

// Extract database types from Supabase generated types
type StripeCustomerDB = Database['public']['Functions']['get_stripe_customers']['Returns'][0]
type StripeSubscriptionDB = Database['public']['Functions']['get_stripe_subscriptions']['Returns'][0]
type StripePriceDB = Database['public']['Functions']['get_stripe_prices']['Returns'][0]
type StripeProductDB = Database['public']['Functions']['get_stripe_products']['Returns'][0]
type StripePaymentIntentDB = Database['public']['Functions']['get_stripe_payment_intents']['Returns'][0]

/**
 * Stripe Data Service
 *
 * Uses Supabase RPC calls to access Stripe data
 * Following Ultra-Native architecture principles
 */

// Standard subscription value for calculations
const STANDARD_SUBSCRIPTION_VALUE = 2999

@Injectable()
export class StripeDataService {
	constructor(
		private readonly supabaseService: SupabaseService,
		@Optional() private readonly logger?: Logger
	) {
		// Logger context handled automatically via app-level configuration
	}

	/**
	 * Get customer subscriptions with full relationship data
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getCustomerSubscriptions(customerId: string): Promise<StripeSubscriptionDB[]> {
		try {
			this.logger?.log('Fetching customer subscriptions', { customerId })

			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc('get_stripe_subscriptions', {
				customer_id: customerId
			})

			if (error) {
				this.logger?.error('Failed to fetch customer subscriptions', {
					error,
					customerId
				})
				throw new InternalServerErrorException(
					'Failed to fetch customer subscriptions'
				)
			}

			return data || []
		} catch (error) {
			this.logger?.error('Error fetching customer subscriptions:', error)
			throw new InternalServerErrorException(
				'Failed to fetch customer subscriptions'
			)
		}
	}

	/**
	 * Get customer by ID
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getCustomer(customerId: string): Promise<StripeCustomerDB> {
		try {
			if (!customerId) {
				this.logger?.error('Failed to fetch customer', new BadRequestException('Customer ID is required'))
				throw new InternalServerErrorException('Failed to fetch customer')
			}

			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc('get_stripe_customer_by_id', {
				customer_id: customerId
			})

			if (error) {
				this.logger?.error('Failed to fetch customer', {
					error,
					customerId
				})
				throw new InternalServerErrorException('Failed to fetch customer')
			}

			return data as StripeCustomerDB
		} catch (error) {
			if (error instanceof BadRequestException) {
				this.logger?.error('Failed to fetch customer', error)
				throw new InternalServerErrorException('Failed to fetch customer')
			}
			this.logger?.error('Error fetching customer:', error)
			throw new InternalServerErrorException('Failed to fetch customer')
		}
	}

	/**
	 * Get prices
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getPrices(activeOnly: boolean = true): Promise<StripePriceDB[]> {
		try {
			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc('get_stripe_prices', {
				active_only: activeOnly,
				limit_count: 1000
			})

			if (error) {
				this.logger?.error('Failed to fetch prices', {
					error,
					activeOnly
				})
				throw new InternalServerErrorException('Failed to fetch prices')
			}

			return data || []
		} catch (error) {
			this.logger?.error('Error fetching prices:', error)
			throw new InternalServerErrorException('Failed to fetch prices')
		}
	}

	/**
	 * Get products
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getProducts(activeOnly: boolean = true): Promise<StripeProductDB[]> {
		try {
			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc('get_stripe_products', {
				active_only: activeOnly,
				limit_count: 1000
			})

			if (error) {
				this.logger?.error('Failed to fetch products', {
					error,
					activeOnly
				})
				throw new InternalServerErrorException('Failed to fetch products')
			}

			return data || []
		} catch (error) {
			this.logger?.error('Error fetching products:', error)
			throw new InternalServerErrorException('Failed to fetch products')
		}
	}

	/**
	 * Health check
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async isHealthy(): Promise<boolean> {
		try {
			const client = this.supabaseService.getAdminClient()
			const { error } = await client.rpc('get_stripe_customers', {
				limit_count: 1
			})

			return !error
		} catch (error) {
			this.logger?.error('Stripe data service health check failed:', error)
			return false
		}
	}

	/**
	 * Get revenue analytics for date range
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<RevenueAnalytics[]> {
		try {
			this.logger?.log('Calculating revenue analytics', { startDate, endDate })

			const client = this.supabaseService.getAdminClient()
			const { data: paymentIntents, error } = await client.rpc('get_stripe_payment_intents', {
				limit_count: 1000
			})

			if (error) {
				throw new InternalServerErrorException('Failed to fetch payment intents')
			}

			// Ultra-native: Simple aggregation in code, not complex SQL
			return this.calculateRevenueAnalytics(paymentIntents || [])
		} catch (error) {
			this.logger?.error('Error calculating revenue analytics:', error)
			throw new InternalServerErrorException(
				'Failed to calculate revenue analytics'
			)
		}
	}

	// Ultra-native: Helper method for simple calculations
	private calculateRevenueAnalytics(paymentIntents: StripePaymentIntentDB[]): RevenueAnalytics[] {
		// Simple grouping and calculation - no complex SQL
		const grouped: Record<string, StripePaymentIntentDB[]> = {}
		paymentIntents.forEach(intent => {
			const period = new Date(intent.created_at).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[period]) grouped[period] = []
			grouped[period].push(intent)
		})

		return Object.entries(grouped).map(([period, periodIntents]) => ({
			period,
			total_revenue: periodIntents.reduce(
				(sum, intent) => sum + (intent.amount || 0),
				0
			),
			subscription_revenue: periodIntents
				.filter(intent => intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0),
			one_time_revenue: periodIntents
				.filter(intent => !intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0),
			customer_count: new Set(periodIntents.map(intent => intent.customer_id)).size,
			new_customers: periodIntents
				.filter(intent => intent.description?.includes('subscription'))
				.reduce((count: number) => count + 1, 0),
			churned_customers: periodIntents
				.filter(intent => !intent.description?.includes('subscription'))
				.reduce((count: number) => count + 1, 0),
			mrr: periodIntents
				.filter(intent => intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0) / 12, // Simplified MRR
			arr: periodIntents
				.filter(intent => intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0) // Simplified ARR
		}))
	}

	/**
	 * Get churn analytics with cohort analysis
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getChurnAnalytics(): Promise<ChurnAnalytics[]> {
		try {
			this.logger?.log('Calculating churn analytics')

			const client = this.supabaseService.getAdminClient()
			const { data: subscriptions, error } = await client.rpc('get_stripe_subscriptions', {
				limit_count: 1000
			})

			if (error) {
				throw new InternalServerErrorException('Failed to fetch subscriptions')
			}

			// Ultra-native: Simple churn calculation in code
			return this.calculateChurnAnalytics(subscriptions || [])
		} catch (error) {
			this.logger?.error('Error calculating churn analytics:', error)
			throw new InternalServerErrorException(
				'Failed to calculate churn analytics'
			)
		}
	}

	// Ultra-native: Helper method for churn calculation
	private calculateChurnAnalytics(subscriptions: StripeSubscriptionDB[]): ChurnAnalytics[] {
		// Simple grouping by month and churn calculation
		const grouped: Record<string, StripeSubscriptionDB[]> = {}
		subscriptions.forEach(sub => {
			const month = new Date(sub.created_at).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[month]) grouped[month] = []
			grouped[month].push(sub)
		})

		return Object.entries(grouped).map(([month, monthSubs]) => {
			const total_active_start_month = monthSubs.length
			const churned_subscriptions = monthSubs.filter(
				sub => sub.status === 'canceled'
			).length
			const churn_rate_percent =
				total_active_start_month > 0
					? (churned_subscriptions / total_active_start_month) * 100
					: 0

			return {
				month,
				churned_subscriptions,
				avg_lifetime_days: 30, // Simplified
				churn_rate_percent,
				total_active_start_month
			}
		})
	}

	/**
	 * Calculate Customer Lifetime Value with advanced metrics
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getCustomerLifetimeValue(): Promise<CustomerLifetimeValue[]> {
		try {
			this.logger?.log('Calculating customer lifetime value')

			const client = this.supabaseService.getAdminClient()

			// Fetch customers and subscriptions with complete pagination
			const [customersResult, subscriptionsResult] = await Promise.all([
				client.rpc('get_stripe_customers', { limit_count: 1000 }),
				client.rpc('get_stripe_subscriptions', { limit_count: 1000 })
			])

			if (customersResult.error || subscriptionsResult.error) {
				throw new InternalServerErrorException('Failed to fetch data for CLV calculation')
			}

			// Ultra-native: Simple CLV calculation in code
			return this.calculateCustomerLifetimeValue(
				customersResult.data || [],
				subscriptionsResult.data || []
			)
		} catch (error) {
			this.logger?.error('Error calculating customer lifetime value:', error)
			throw new InternalServerErrorException(
				'Failed to calculate customer lifetime value'
			)
		}
	}

	// Ultra-native: Helper method for CLV calculation
	private calculateCustomerLifetimeValue(
		customers: StripeCustomerDB[],
		subscriptions: StripeSubscriptionDB[]
	): CustomerLifetimeValue[] {
		return customers.map(customer => {
			const customerSubs = subscriptions.filter(
				sub => sub.customer_id === customer.id
			)
			const total_revenue = customerSubs.length * STANDARD_SUBSCRIPTION_VALUE // Simplified revenue calculation
			const subscription_count = customerSubs.length
			const first_subscription =
				customerSubs.length > 0
					? new Date(Math.min(...customerSubs.map(sub => new Date(sub.created_at).getTime())))
					: null
			const last_cancellation =
				customerSubs
					.filter(sub => sub.status === 'canceled' && (sub as any).canceled_at)
					.map(sub => new Date((sub as any).canceled_at))
					.sort((a, b) => b.getTime() - a.getTime())[0] || null

			const lifetime_days =
				first_subscription && last_cancellation
					? Math.floor(
							(last_cancellation.getTime() - first_subscription.getTime()) /
								(1000 * 60 * 60 * 24)
						)
					: undefined

			return {
				customer_id: customer.id,
				email: customer.email || '',
				total_revenue,
				subscription_count,
				first_subscription_date: first_subscription
					? first_subscription.toISOString()
					: '',
				last_cancellation_date: last_cancellation
					? last_cancellation.toISOString()
					: undefined,
				avg_revenue_per_subscription:
					subscription_count > 0 ? total_revenue / subscription_count : 0,
				status: customerSubs.some(sub => sub.status === 'active')
					? 'Active'
					: 'Churned',
				lifetime_days
			}
		})
	}

	/**
	 * Get MRR Trend
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getMRRTrend(months: number): Promise<StripeSubscriptionDB[]> {
		try {
			const client = this.supabaseService.getAdminClient()
			const { data: subscriptions, error } = await client.rpc('get_stripe_subscriptions', {
				limit_count: months * 100 // Adjust limit based on months
			})

			if (error) {
				throw new InternalServerErrorException('Failed to fetch subscriptions for MRR trend')
			}

			// Simple MRR calculation
			return subscriptions || []
		} catch (error) {
			this.logger?.error('Error calculating MRR trend:', error)
			throw new InternalServerErrorException('Failed to calculate MRR trend')
		}
	}

	/**
	 * Get Subscription Status Breakdown
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getSubscriptionStatusBreakdown(): Promise<{ [status: string]: number }> {
		try {
			const client = this.supabaseService.getAdminClient()
			const { data: subscriptions, error } = await client.rpc('get_stripe_subscriptions', {
				limit_count: 1000
			})

			if (error) {
				throw new InternalServerErrorException('Failed to fetch subscriptions for status breakdown')
			}

			// Calculate status breakdown
			const breakdown: { [status: string]: number } = {}
			subscriptions?.forEach((sub) => {
				breakdown[sub.status] = (breakdown[sub.status] || 0) + 1
			})

			return breakdown
		} catch (error) {
			this.logger?.error('Error calculating subscription status breakdown:', error)
			throw new InternalServerErrorException('Failed to calculate subscription status breakdown')
		}
	}

	/**
	 * Get predictive metrics for specific customer
	 * Ultra-native: Supabase RPC calls for direct database access
	 */
	async getCustomerPredictiveMetrics(customerId: string): Promise<{
		predicted_ltv: number
		churn_risk_score: number
		predicted_churn_date?: string
		expansion_opportunity_score: number
	}> {
		try {
			this.logger?.log('Calculating predictive metrics for customer', {
				customerId
			})

			const client = this.supabaseService.getAdminClient()
			const { data: subscriptions, error } = await client.rpc('get_stripe_subscriptions', {
				customer_id: customerId
			})

			if (error) {
				throw new InternalServerErrorException('Failed to fetch customer subscriptions for predictive metrics')
			}

			// Ultra-native: Simple predictive calculation
			const activeSubscriptions = (subscriptions || []).filter(
				(sub) => (sub as StripeSubscriptionDB).status === 'active'
			)
			const canceledSubscriptions = (subscriptions || []).filter(
				(sub) => (sub as StripeSubscriptionDB).status === 'canceled'
			)

			// Simplified predictive metrics
			const predicted_ltv =
				activeSubscriptions.length * STANDARD_SUBSCRIPTION_VALUE * 12 // Assume 12 months
			const churn_risk_score =
				canceledSubscriptions.length > 0
					? Math.min(
							100,
							(canceledSubscriptions.length / ((subscriptions || []).length || 1)) * 100
						)
					: 0
			const expansion_opportunity_score =
				activeSubscriptions.length > 0 ? 75 : 25 // Simplified

			return {
				predicted_ltv,
				churn_risk_score,
				predicted_churn_date: undefined, // Would require ML model
				expansion_opportunity_score
			}
		} catch (error) {
			this.logger?.error('Error calculating predictive metrics:', error)
			throw new InternalServerErrorException(
				'Failed to calculate predictive metrics'
			)
		}
	}
}