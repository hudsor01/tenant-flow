import { Injectable, Optional, InternalServerErrorException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { Logger } from '@nestjs/common'
import type {
	Database,
	RevenueAnalytics,
	ChurnAnalytics,
	CustomerLifetimeValue
} from '@repo/shared'

/**
 * Stripe Data Service
 *
 * Ultra-native data access layer for querying Stripe data via Supabase functions
 * Following Phase 4 of Stripe Sync Engine Integration Plan
 * Direct function access with proper TypeScript types (ULTRA-NATIVE)
 */

// Standard subscription value for calculations
const STANDARD_SUBSCRIPTION_VALUE = 2999

// Type aliases for Supabase Stripe functions
type StripeCustomer = Database['public']['Functions']['get_stripe_customers']['Returns'][0]
type StripeSubscription = Database['public']['Functions']['get_stripe_subscriptions']['Returns'][0]
type StripePaymentIntent = Database['public']['Functions']['get_stripe_payment_intents']['Returns'][0]
type StripePrice = Database['public']['Functions']['get_stripe_prices']['Returns'][0]
type StripeProduct = Database['public']['Functions']['get_stripe_products']['Returns'][0]

@Injectable()
export class StripeDataService {
	constructor(
		private readonly supabaseService: SupabaseService,
		@Optional() private readonly logger?: Logger
	) {
		// Logger context handled automatically via app-level configuration
	}

	/**
	 * Get customer subscriptions using Supabase Stripe function
	 * Ultra-native: Direct Supabase function call with proper types
	 */
	async getCustomerSubscriptions(customerId: string): Promise<StripeSubscription[]> {
		try {
			this.logger?.log('Fetching customer subscriptions', { customerId })

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_subscriptions', { customer_id: customerId })

			if (error) {
				this.logger?.error('Failed to fetch customer subscriptions', { error, customerId })
				throw new InternalServerErrorException('Failed to fetch customer subscriptions')
			}

			return data || []
		} catch (error) {
			this.logger?.error('Error fetching customer subscriptions:', error)
			throw new InternalServerErrorException('Failed to fetch customer subscriptions')
		}
	}

	/**
	 * Get revenue analytics for date range
	 * Ultra-native: Simple analytics calculation using typed data
	 */
	async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<RevenueAnalytics[]> {
		try {
			this.logger?.log('Calculating revenue analytics', { startDate, endDate })

			// Get payment intents within date range via Supabase function
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_payment_intents', { limit_count: 1000 })

			if (error) {
				this.logger?.error('Failed to calculate revenue analytics', { error })
				throw new InternalServerErrorException('Failed to calculate revenue analytics')
			}

			// Filter by date range and calculate analytics
			const filteredData = (data || []).filter(intent => {
				const createdDate = new Date(intent.created_at)
				return createdDate >= startDate && createdDate <= endDate
			})

			return this.calculateRevenueAnalytics(filteredData)
		} catch (error) {
			this.logger?.error('Error calculating revenue analytics:', error)
			throw new InternalServerErrorException('Failed to calculate revenue analytics')
		}
	}

	/**
	 * Get churn analytics using typed subscription data
	 * Ultra-native: Simple churn calculation with proper types
	 */
	async getChurnAnalytics(): Promise<ChurnAnalytics[]> {
		try {
			this.logger?.log('Calculating churn analytics')

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_subscriptions', { limit_count: 1000 })

			if (error) {
				this.logger?.error('Failed to calculate churn analytics', { error })
				throw new InternalServerErrorException('Failed to calculate churn analytics')
			}

			return this.calculateChurnAnalytics(data || [])
		} catch (error) {
			this.logger?.error('Error calculating churn analytics:', error)
			throw new InternalServerErrorException('Failed to calculate churn analytics')
		}
	}

	/**
	 * Calculate Customer Lifetime Value with advanced metrics
	 * Ultra-native: Simple CLV calculation using typed data
	 */
	async getCustomerLifetimeValue(): Promise<CustomerLifetimeValue[]> {
		try {
			this.logger?.log('Calculating customer lifetime value')

			// Get customers and subscriptions using Supabase functions
			const [customersResult, subscriptionsResult] = await Promise.all([
				this.supabaseService.getAdminClient().rpc('get_stripe_customers', { limit_count: 1000 }),
				this.supabaseService.getAdminClient().rpc('get_stripe_subscriptions', { limit_count: 1000 })
			])

			if (customersResult.error) {
				this.logger?.error('Failed to fetch customers for CLV calculation', { error: customersResult.error })
				throw new InternalServerErrorException('Failed to calculate customer lifetime value')
			}

			if (subscriptionsResult.error) {
				this.logger?.error('Failed to fetch subscriptions for CLV calculation', { error: subscriptionsResult.error })
				throw new InternalServerErrorException('Failed to calculate customer lifetime value')
			}

			return this.calculateCustomerLifetimeValue(
				customersResult.data || [],
				subscriptionsResult.data || []
			)
		} catch (error) {
			this.logger?.error('Error calculating customer lifetime value:', error)
			throw new InternalServerErrorException('Failed to calculate customer lifetime value')
		}
	}

	/**
	 * Get monthly recurring revenue (MRR) trend
	 * Ultra-native: Simple MRR calculation using typed subscriptions
	 */
	async getMRRTrend(months = 12): Promise<Array<{ month: string; mrr: number; active_subscriptions: number }>> {
		try {
			this.logger?.log('Calculating MRR trend', { months })

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_subscriptions', { limit_count: months * 100 })

			if (error) {
				this.logger?.error('Failed to calculate MRR trend', { error })
				throw new InternalServerErrorException('Failed to calculate MRR trend')
			}

			return this.calculateMRRTrend(data || [], months)
		} catch (error) {
			this.logger?.error('Error calculating MRR trend:', error)
			throw new InternalServerErrorException('Failed to calculate MRR trend')
		}
	}

	/**
	 * Get subscription status breakdown
	 * Ultra-native: Simple status analysis using typed subscriptions
	 */
	async getSubscriptionStatusBreakdown(): Promise<Record<string, number>> {
		try {
			this.logger?.log('Getting subscription status breakdown')

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_subscriptions', { limit_count: 1000 })

			if (error) {
				this.logger?.error('Failed to get subscription status breakdown', { error })
				throw new InternalServerErrorException('Failed to get subscription status breakdown')
			}

			// Ultra-native: Simple counting with proper types
			const breakdown = (data || []).reduce((acc: Record<string, number>, sub) => {
				const status = sub.status
				acc[status] = (acc[status] || 0) + 1
				return acc
			}, {} as Record<string, number>)

			return breakdown
		} catch (error) {
			this.logger?.error('Error getting subscription status breakdown:', error)
			throw new InternalServerErrorException('Failed to get subscription status breakdown')
		}
	}

	/**
	 * Get a single customer by ID using Supabase function
	 * Ultra-native: Direct function call with proper typing
	 */
	async getCustomer(customerId: string): Promise<StripeCustomer | null> {
		try {
			if (!customerId) {
				throw new BadRequestException('Invalid customer ID')
			}

			this.logger?.log('Fetching customer', { customerId })

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_customer_by_id', { customer_id: customerId })

			if (error) {
				this.logger?.error('Failed to fetch customer', { error, customerId })
				throw new InternalServerErrorException('Failed to fetch customer')
			}

			return (data as StripeCustomer) || null
		} catch (error) {
			this.logger?.error('Failed to fetch customer', error)
			throw new InternalServerErrorException('Failed to fetch customer')
		}
	}

	/**
	 * Get prices using Supabase function
	 * Ultra-native: Direct function call with proper typing
	 */
	async getPrices(activeOnly = true): Promise<StripePrice[]> {
		try {
			this.logger?.log('Fetching prices', { activeOnly })

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_prices', {
					active_only: activeOnly,
					limit_count: 1000
				})

			if (error) {
				this.logger?.error('Failed to fetch prices', { error, activeOnly })
				throw new InternalServerErrorException('Failed to fetch prices')
			}

			return data || []
		} catch (error) {
			this.logger?.error('Failed to fetch prices', error)
			throw new InternalServerErrorException('Failed to fetch prices')
		}
	}

	/**
	 * Get all products using Supabase function
	 * Ultra-native: Direct function call with proper typing
	 */
	async getProducts(activeOnly = true): Promise<StripeProduct[]> {
		try {
			this.logger?.log('Fetching products', { activeOnly })

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_products', {
					active_only: activeOnly,
					limit_count: 1000
				})

			if (error) {
				this.logger?.error('Failed to fetch products', { error, activeOnly })
				throw new InternalServerErrorException('Failed to fetch products')
			}

			return data || []
		} catch (error) {
			this.logger?.error('Failed to fetch products', error)
			throw new InternalServerErrorException('Failed to fetch products')
		}
	}

	/**
	 * Health check for Stripe data access
	 * Ultra-native: Simple health check using Supabase functions
	 */
	async isHealthy(): Promise<boolean> {
		try {
			const { error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_stripe_customers', { limit_count: 1 })

			return !error
		} catch (error) {
			this.logger?.error('Stripe data service health check failed:', error)
			return false
		}
	}

	// Private helper methods with proper types

	private calculateRevenueAnalytics(paymentIntents: StripePaymentIntent[]): RevenueAnalytics[] {
		const grouped: Record<string, StripePaymentIntent[]> = {}

		paymentIntents.forEach(intent => {
			const period = new Date(intent.created_at).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[period]) grouped[period] = []
			grouped[period].push(intent)
		})

		return Object.entries(grouped).map(([period, periodIntents]) => ({
			period,
			total_revenue: periodIntents.reduce((sum, intent) => sum + (intent.amount || 0), 0),
			subscription_revenue: periodIntents
				.filter(intent => intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0),
			one_time_revenue: periodIntents
				.filter(intent => !intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0),
			customer_count: new Set(periodIntents.map(intent => intent.customer_id)).size,
			new_customers: periodIntents.length, // Simplified calculation
			churned_customers: 0, // Would need additional data to calculate
			mrr: periodIntents
				.filter(intent => intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0) / 12,
			arr: periodIntents
				.filter(intent => intent.description?.includes('subscription'))
				.reduce((sum, intent) => sum + (intent.amount || 0), 0)
		}))
	}

	private calculateChurnAnalytics(subscriptions: StripeSubscription[]): ChurnAnalytics[] {
		const grouped: Record<string, StripeSubscription[]> = {}

		subscriptions.forEach(sub => {
			const month = new Date(sub.created_at).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[month]) grouped[month] = []
			grouped[month].push(sub)
		})

		return Object.entries(grouped).map(([month, monthSubs]) => {
			const total_active_start_month = monthSubs.length
			const churned_subscriptions = monthSubs.filter(sub => sub.status === 'canceled').length
			const churn_rate_percent = total_active_start_month > 0
				? (churned_subscriptions / total_active_start_month) * 100
				: 0

			return {
				month,
				churned_subscriptions,
				avg_lifetime_days: 30, // Simplified calculation
				churn_rate_percent,
				total_active_start_month
			}
		})
	}

	private calculateCustomerLifetimeValue(
		customers: StripeCustomer[],
		subscriptions: StripeSubscription[]
	): CustomerLifetimeValue[] {
		return customers.map(customer => {
			const customerSubs = subscriptions.filter(sub => sub.customer_id === customer.id)
			const total_revenue = customerSubs.length * STANDARD_SUBSCRIPTION_VALUE
			const subscription_count = customerSubs.length
			const first_subscription = customerSubs.length > 0
				? new Date(Math.min(...customerSubs.map(sub => new Date(sub.created_at).getTime())))
				: null
			const last_cancellation = customerSubs
				.filter(sub => sub.status === 'canceled')
				.map(sub => new Date(sub.current_period_end))
				.sort((a, b) => b.getTime() - a.getTime())[0] || null
			const avg_revenue_per_subscription = subscription_count > 0
				? total_revenue / subscription_count
				: 0
			const status = customerSubs.some(sub => sub.status === 'active') ? 'Active' : 'Churned'

			return {
				customer_id: customer.id,
				email: customer.email || '',
				total_revenue,
				subscription_count,
				first_subscription_date: first_subscription ? first_subscription.toISOString() : '',
				last_cancellation_date: last_cancellation ? last_cancellation.toISOString() : undefined,
				avg_revenue_per_subscription,
				status
			}
		})
	}

	private calculateMRRTrend(
		subscriptions: StripeSubscription[],
		months: number
	): Array<{ month: string; mrr: number; active_subscriptions: number }> {
		const activeSubs = subscriptions.filter(sub => sub.status === 'active')
		const grouped: Record<string, StripeSubscription[]> = {}

		activeSubs.forEach(sub => {
			const month = new Date(sub.created_at).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[month]) grouped[month] = []
			grouped[month].push(sub)
		})

		const result = Object.entries(grouped).map(([month, monthSubs]) => ({
			month,
			mrr: monthSubs.length * STANDARD_SUBSCRIPTION_VALUE,
			active_subscriptions: monthSubs.length
		}))

		return result
			.sort((a, b) => a.month.localeCompare(b.month))
			.slice(-months)
	}
}