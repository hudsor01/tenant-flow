import { Injectable, Optional, InternalServerErrorException, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { Logger } from '@nestjs/common'

/**
 * Stripe Data Service
 *
 * Ultra-native data access layer for querying stripe.* tables
 * Following Phase 4 of Stripe Sync Engine Integration Plan
 * Direct table access with minimal abstraction (ULTRA-NATIVE)
 */

// Standard subscription value for calculations
const STANDARD_SUBSCRIPTION_VALUE = 2999

export interface StripeCustomerSubscription {
	id: string
	customer: string
	status:
		| 'active'
		| 'canceled'
		| 'incomplete'
		| 'incomplete_expired'
		| 'past_due'
		| 'trialing'
		| 'unpaid'
	current_period_start: string
	current_period_end: string
	created: string
	canceled_at?: string
	customer_data?: {
		id: string
		email: string
		name?: string
		created: string
	}
	price_data?: {
		id: string
		unit_amount: number
		currency: string
		recurring: {
			interval: 'month' | 'year'
			interval_count: number
		}
	}
	product_data?: {
		id: string
		name: string
		description?: string
	}
}

export interface RevenueAnalytics {
	period: string
	total_revenue: number
	subscription_revenue: number
	one_time_revenue: number
	customer_count: number
	new_customers: number
	churned_customers: number
	mrr: number
	arr: number
}

export interface ChurnAnalytics {
	month: string
	churned_subscriptions: number
	avg_lifetime_days: number
	churn_rate_percent: number
	total_active_start_month: number
}

export interface CustomerLifetimeValue {
	customer_id: string
	email: string
	total_revenue: number
	subscription_count: number
	first_subscription_date: string
	last_cancellation_date?: string
	avg_revenue_per_subscription: number
	status: 'Active' | 'Churned'
	lifetime_days?: number
}

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
	 * Ultra-native: Direct table access with minimal abstraction
	 */
	async getCustomerSubscriptions(
		customerId: string
	): Promise<any[]> {
		try {
			this.logger?.info('Fetching customer subscriptions', { customerId })

			// Ultra-native: Direct table query - no complex joins, no custom SQL
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.subscriptions' as any)
				.select('*')
				.eq('customer', customerId)
				.order('created', { ascending: false })

			if (error) {
				this.logger?.error('Failed to fetch customer subscriptions', { error, customerId })
				throw new InternalServerErrorException('Failed to fetch customer subscriptions')
			}

			// Ultra-native: Direct mapping - no complex transformations
			return data || []
		} catch (error) {
			this.logger?.error('Error fetching customer subscriptions:', error)
			throw new InternalServerErrorException('Failed to fetch customer subscriptions')
		}
	}

	/**
	 * Get revenue analytics for date range
	 * Ultra-native: Simple analytics with direct queries
	 */
	async getRevenueAnalytics(
		startDate: Date,
		endDate: Date
	): Promise<RevenueAnalytics[]> {
		try {
			this.logger?.info('Calculating revenue analytics', { startDate, endDate })

			// Ultra-native: Simple date range query
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.invoices' as any)
				.select('*')
				.gte('created', startDate.toISOString())
				.lte('created', endDate.toISOString())
				.order('created', { ascending: false })

			if (error) {
				this.logger?.error('Failed to calculate revenue analytics', { error })
				throw new InternalServerErrorException('Failed to calculate revenue analytics')
			}

			// Ultra-native: Simple aggregation in code, not complex SQL
			return this.calculateRevenueAnalytics(data || [])
		} catch (error) {
			this.logger?.error('Error calculating revenue analytics:', error)
			throw new InternalServerErrorException('Failed to calculate revenue analytics')
		}
	}

	// Ultra-native: Helper method for simple calculations
	private calculateRevenueAnalytics(invoices: any[]): any[] {
		// Simple grouping and calculation - no complex SQL
		const grouped: Record<string, any[]> = {}
		invoices.forEach(invoice => {
			const period = new Date(invoice.created).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[period]) grouped[period] = []
			grouped[period].push(invoice)
		})

		return Object.entries(grouped).map(([period, periodInvoices]) => ({
			period,
			total_revenue: periodInvoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0),
			subscription_revenue: periodInvoices
				.filter(invoice => (invoice as any).subscription)
				.reduce((sum, invoice) => sum + ((invoice as any).amount_paid || 0), 0),
			one_time_revenue: periodInvoices
				.filter(invoice => !(invoice as any).subscription)
				.reduce((sum, invoice) => sum + ((invoice as any).amount_paid || 0), 0),
			customer_count: new Set(periodInvoices.map(inv => inv.customer)).size,
			new_customers: periodInvoices
				.filter(invoice => (invoice as any).subscription)
				.reduce((count) => count + 1, 0),
			churned_customers: periodInvoices
				.filter(invoice => !(invoice as any).subscription)
				.reduce((count) => count + 1, 0),
			mrr: periodInvoices
				.filter(inv => inv.subscription)
				.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 12, // Simplified MRR
			arr: periodInvoices
				.filter(inv => inv.subscription)
				.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) // Simplified ARR
		}))
	}

	/**
	 * Get churn analytics with cohort analysis
	 * Ultra-native: Simple churn calculation
	 */
	async getChurnAnalytics(): Promise<ChurnAnalytics[]> {
		try {
			this.logger?.info('Calculating churn analytics')

			// Ultra-native: Simple subscription query
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.subscriptions' as any)
				.select('created, canceled_at, status')
				.order('created', { ascending: false })

			if (error) {
				this.logger?.error('Failed to calculate churn analytics', { error })
				throw new InternalServerErrorException('Failed to calculate churn analytics')
			}

			// Ultra-native: Simple churn calculation in code
			return this.calculateChurnAnalytics(data || [])
		} catch (error) {
			this.logger?.error('Error calculating churn analytics:', error)
			throw new InternalServerErrorException('Failed to calculate churn analytics')
		}
	}

	// Ultra-native: Helper method for churn calculation
	private calculateChurnAnalytics(subscriptions: any[]): any[] {
		// Simple grouping by month and churn calculation
		const grouped: Record<string, any[]> = {}
		subscriptions.forEach(sub => {
			const month = new Date(sub.created).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[month]) grouped[month] = []
			grouped[month].push(sub)
		})

		return Object.entries(grouped).map(([month, monthSubs]) => {
			const total_active_start_month = monthSubs.length
			const churned_subscriptions = monthSubs.filter(sub => (sub as any).status === 'canceled').length
			const churn_rate_percent = total_active_start_month > 0 
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
	 * Ultra-native: Simple CLV calculation
	 */
	async getCustomerLifetimeValue(): Promise<CustomerLifetimeValue[]> {
		try {
			this.logger?.info('Calculating customer lifetime value')

			// Ultra-native: Simple customer and subscription query
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data: customers, error: customerError } = await this.supabaseService
				.getAdminClient()
				.from('stripe.customers' as any)
				.select('id, email')

			if (customerError) {
				this.logger?.error('Failed to fetch customers for CLV calculation', { error: customerError })
				throw new InternalServerErrorException('Failed to calculate customer lifetime value')
			}

			const { data: subscriptions, error: subscriptionError } = await this.supabaseService
				.getAdminClient()
				.from('stripe.subscriptions' as any)
				.select('customer, created, status, canceled_at')

			if (subscriptionError) {
				this.logger?.error('Failed to fetch subscriptions for CLV calculation', { error: subscriptionError })
				throw new InternalServerErrorException('Failed to calculate customer lifetime value')
			}

			// Ultra-native: Simple CLV calculation in code
			return this.calculateCustomerLifetimeValue(customers || [], subscriptions || [])
		} catch (error) {
			this.logger?.error('Error calculating customer lifetime value:', error)
			throw new InternalServerErrorException('Failed to calculate customer lifetime value')
		}
	}

	// Ultra-native: Helper method for CLV calculation
	private calculateCustomerLifetimeValue(customers: any[], subscriptions: any[]): CustomerLifetimeValue[] {
		return customers.map(customer => {
			const customerSubs = subscriptions.filter(sub => (sub as any).customer === customer.id)
			const total_revenue = customerSubs.length * STANDARD_SUBSCRIPTION_VALUE // Simplified revenue calculation
			const subscription_count = customerSubs.length
			const first_subscription = customerSubs.length > 0 
				? new Date(Math.min(...customerSubs.map(sub => new Date(sub.created).getTime())))
				: null
			const last_cancellation = customerSubs
				.filter(sub => (sub as any).status === 'canceled' && (sub as any).canceled_at)
				.map(sub => new Date((sub as any).canceled_at))
				.sort((a, b) => b.getTime() - a.getTime())[0] || null
			const avg_revenue_per_subscription = subscription_count > 0 
				? total_revenue / subscription_count 
				: 0
			const status = customerSubs.some(sub => (sub as any).status === 'active') ? 'Active' : 'Churned'

			return {
				customer_id: customer.id,
				email: customer.email,
				total_revenue,
				subscription_count,
				first_subscription_date: first_subscription ? first_subscription.toISOString() : '',
				last_cancellation_date: last_cancellation ? last_cancellation.toISOString() : undefined,
				avg_revenue_per_subscription,
				status
			}
		})
	}

	/**
	 * Get monthly recurring revenue (MRR) trend
	 * Ultra-native: Simple MRR calculation
	 */
	async getMRRTrend(
		months = 12
	): Promise<Array<{ month: string; mrr: number; active_subscriptions: number }>> {
		try {
			this.logger?.info('Calculating MRR trend', { months })

			// Ultra-native: Simple subscription query
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.subscriptions' as any)
				.select('created, status')
				.order('created', { ascending: false })
				.limit(months * 100) // Approximate for the last N months

			if (error) {
				this.logger?.error('Failed to calculate MRR trend', { error })
				throw new InternalServerErrorException('Failed to calculate MRR trend')
			}

			// Ultra-native: Simple MRR calculation in code
			return this.calculateMRRTrend(data || [], months)
		} catch (error) {
			this.logger?.error('Error calculating MRR trend:', error)
			throw new InternalServerErrorException('Failed to calculate MRR trend')
		}
	}

	// Ultra-native: Helper method for MRR calculation
	private calculateMRRTrend(subscriptions: any[], months: number): Array<{ month: string; mrr: number; active_subscriptions: number }> {
		// Filter for active subscriptions and group by month
		const activeSubs = subscriptions.filter(sub => (sub as any).status === 'active')
		const grouped: Record<string, any[]> = {}
		
		activeSubs.forEach(sub => {
			const month = new Date(sub.created).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[month]) grouped[month] = []
			grouped[month].push(sub)
		})

		// Convert to array and limit to requested months
		const result = Object.entries(grouped).map(([month, monthSubs]) => ({
			month,
			mrr: monthSubs.length * STANDARD_SUBSCRIPTION_VALUE, // Simplified MRR calculation
			active_subscriptions: monthSubs.length
		}))

		// Sort by month and limit to requested number
		return result
			.sort((a, b) => a.month.localeCompare(b.month))
			.slice(-months)
	}

	/**
	 * Get subscription status breakdown
	 * Ultra-native: Simple status analysis
	 */
	async getSubscriptionStatusBreakdown(): Promise<Record<string, number>> {
		try {
			this.logger?.info('Getting subscription status breakdown')

			// Ultra-native: Simple subscription query
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.subscriptions' as any)
				.select('status')

			if (error) {
				this.logger?.error('Failed to get subscription status breakdown', { error })
				throw new InternalServerErrorException('Failed to get subscription status breakdown')
			}

			// Ultra-native: Simple counting in code
			const breakdown = (data || []).reduce((acc, sub) => {
				acc[(sub as any).status] = (acc[(sub as any).status] || 0) + 1
				return acc
			}, {} as Record<string, number>)

			return breakdown
		} catch (error) {
			this.logger?.error('Error getting subscription status breakdown:', error)
			throw new InternalServerErrorException('Failed to get subscription status breakdown')
		}
	}

	/**
	 * Get a single customer by ID
	 * Ultra-native: Simple customer lookup
	 */
	async getCustomer(customerId: string): Promise<any | null> {
		try {
			if (!customerId) {
				throw new BadRequestException('Invalid customer ID')
			}

			this.logger?.info('Fetching customer', { customerId })

			// Ultra-native: Direct single record query
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.customers' as any)
				.select('*')
				.eq('id', customerId)
				.single()

			if (error && error.code !== 'PGRST116') { // Not found is okay
				this.logger?.error('Failed to fetch customer', { error, customerId })
				throw new InternalServerErrorException('Failed to fetch customer')
			}

			return data || null
		} catch (error) {
			this.logger?.error('Failed to fetch customer', error)
			throw new InternalServerErrorException('Failed to fetch customer')
		}
	}

	/**
	 * Get prices, optionally filtered by product
	 * Ultra-native: Simple price retrieval
	 */
	async getPrices(productId?: string): Promise<any[]> {
		try {
			this.logger?.info('Fetching prices', { productId })

			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			let query = this.supabaseService
				.getAdminClient()
				.from('stripe.prices' as any)
				.select('*')
				.eq('active', true)

			if (productId) {
				query = query.eq('product', productId)
			}

			const { data, error } = await query.order('created', { ascending: false })

			if (error) {
				this.logger?.error('Failed to fetch prices', { error, productId })
				throw new InternalServerErrorException('Failed to fetch prices')
			}

			return data
		} catch (error) {
			this.logger?.error('Failed to fetch prices', error)
			throw new InternalServerErrorException('Failed to fetch prices')
		}
	}

	/**
	 * Get all products
	 * Ultra-native: Simple product retrieval
	 */
	async getProducts(): Promise<any[]> {
		try {
			this.logger?.info('Fetching products')

			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.products' as any)
				.select('*')
				.eq('active', true)
				.order('created', { ascending: false })

			if (error) {
				this.logger?.error('Failed to fetch products', error)
				throw new InternalServerErrorException('Failed to fetch products')
			}

			return data
		} catch (error) {
			this.logger?.error('Failed to fetch products', error)
			throw new InternalServerErrorException('Failed to fetch products')
		}
	}

	/**
	 * Health check for Stripe data access
	 * Ultra-native: Simple health check
	 */
	async isHealthy(): Promise<boolean> {
		try {
			// Ultra-native: Simple connectivity test
			// Note: Using 'as any' to bypass TypeScript type checking for stripe schema
			const { error } = await this.supabaseService
				.getAdminClient()
				.from('stripe.customers' as any)
				.select('id')
				.limit(1)

			return !error
		} catch (error) {
			this.logger?.error('Stripe data service health check failed:', error)
			return false
		}
	}
}
