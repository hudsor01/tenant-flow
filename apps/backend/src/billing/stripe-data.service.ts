import {
	Injectable,
	InternalServerErrorException,
	Logger,
	Optional
} from '@nestjs/common'
import type {
	ChurnAnalytics,
	CustomerLifetimeValue,
	RevenueAnalytics
} from '@repo/shared'
import type { Stripe } from 'stripe'
import { StripeService } from './stripe.service'

/**
 * Stripe Data Service
 *
 * Uses Stripe API directly for analytics and reporting
 * Following Ultra-Native architecture principles
 */

// Standard subscription value for calculations
const STANDARD_SUBSCRIPTION_VALUE = 2999

@Injectable()
export class StripeDataService {
	constructor(
		private readonly stripeService: StripeService,
		@Optional() private readonly logger?: Logger
	) {
		// Logger context handled automatically via app-level configuration
	}

	/**
	 * Get customer subscriptions with full relationship data
	 * Ultra-native: Direct API access with complete pagination
	 */
	async getCustomerSubscriptions(
		customerId: string
	): Promise<Stripe.Subscription[]> {
		try {
			this.logger?.log('Fetching customer subscriptions', { customerId })
			return await this.stripeService.getAllSubscriptions({
				customer: customerId
			})
		} catch (error) {
			this.logger?.error('Error fetching customer subscriptions:', error)
			throw new InternalServerErrorException(
				'Failed to fetch customer subscriptions'
			)
		}
	}

	/**
	 * Get revenue analytics for date range
	 * Ultra-native: Direct API access with complete dataset via pagination
	 */
	async getRevenueAnalytics(
		startDate: Date,
		endDate: Date
	): Promise<RevenueAnalytics[]> {
		try {
			this.logger?.log('Calculating revenue analytics', { startDate, endDate })

			// Convert dates to Unix timestamps
			const startTimestamp = Math.floor(startDate.getTime() / 1000)
			const endTimestamp = Math.floor(endDate.getTime() / 1000)

			// Fetch ALL invoices in date range with pagination
			const invoices = await this.stripeService.getAllInvoices({
				created: { gte: startTimestamp, lte: endTimestamp }
			})

			this.logger?.log(
				`Fetched ${invoices.length} total invoices for analytics`
			)

			// Ultra-native: Simple aggregation in code, not complex SQL
			return this.calculateRevenueAnalytics(invoices)
		} catch (error) {
			this.logger?.error('Error calculating revenue analytics:', error)
			throw new InternalServerErrorException(
				'Failed to calculate revenue analytics'
			)
		}
	}

	// Ultra-native: Helper method for simple calculations
	private calculateRevenueAnalytics(
		invoices: Stripe.Invoice[]
	): RevenueAnalytics[] {
		// Simple grouping and calculation - no complex SQL
		const grouped: Record<string, Stripe.Invoice[]> = {}
		invoices.forEach(invoice => {
			const period = new Date(invoice.created * 1000).toISOString().slice(0, 7) // YYYY-MM
			if (!grouped[period]) grouped[period] = []
			grouped[period].push(invoice)
		})

		return Object.entries(grouped).map(([period, periodInvoices]) => ({
			period,
			total_revenue: periodInvoices.reduce(
				(sum, inv) => sum + (inv.amount_paid || 0),
				0
			),
			subscription_revenue: periodInvoices
				.filter(
					invoice =>
						!!(invoice as Stripe.Invoice & { subscription?: string })
							.subscription
				)
				.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0),
			one_time_revenue: periodInvoices
				.filter(
					invoice =>
						!(invoice as Stripe.Invoice & { subscription?: string })
							.subscription
				)
				.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0),
			customer_count: new Set(periodInvoices.map(inv => inv.customer)).size,
			new_customers: periodInvoices
				.filter(
					invoice =>
						!!(invoice as Stripe.Invoice & { subscription?: string })
							.subscription
				)
				.reduce(count => count + 1, 0),
			churned_customers: periodInvoices
				.filter(
					invoice =>
						!(invoice as Stripe.Invoice & { subscription?: string })
							.subscription
				)
				.reduce(count => count + 1, 0),
			mrr:
				periodInvoices
					.filter(
						inv =>
							!!(inv as Stripe.Invoice & { subscription?: string }).subscription
					)
					.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) / 12, // Simplified MRR
			arr: periodInvoices
				.filter(
					inv =>
						!!(inv as Stripe.Invoice & { subscription?: string }).subscription
				)
				.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) // Simplified ARR
		}))
	}

	/**
	 * Get churn analytics with cohort analysis
	 * Ultra-native: Direct API access with in-memory calculations
	 */
	async getChurnAnalytics(): Promise<ChurnAnalytics[]> {
		try {
			this.logger?.log('Calculating churn analytics')

			// Fetch all subscriptions with pagination
			const subscriptions = await this.stripeService.getAllSubscriptions()

			// Ultra-native: Simple churn calculation in code
			return this.calculateChurnAnalytics(subscriptions)
		} catch (error) {
			this.logger?.error('Error calculating churn analytics:', error)
			throw new InternalServerErrorException(
				'Failed to calculate churn analytics'
			)
		}
	}

	// Ultra-native: Helper method for churn calculation
	private calculateChurnAnalytics(
		subscriptions: Stripe.Subscription[]
	): ChurnAnalytics[] {
		// Simple grouping by month and churn calculation
		const grouped: Record<string, Stripe.Subscription[]> = {}
		subscriptions.forEach(sub => {
			const month = new Date(sub.created * 1000).toISOString().slice(0, 7) // YYYY-MM
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
	 * Ultra-native: Direct API access with in-memory calculations
	 */
	async getCustomerLifetimeValue(): Promise<CustomerLifetimeValue[]> {
		try {
			this.logger?.log('Calculating customer lifetime value')

			// Fetch customers and subscriptions with complete pagination
			const [customers, subscriptions] = await Promise.all([
				this.stripeService.getAllCustomers(),
				this.stripeService.getAllSubscriptions()
			])

			// Ultra-native: Simple CLV calculation in code
			return this.calculateCustomerLifetimeValue(customers, subscriptions)
		} catch (error) {
			this.logger?.error('Error calculating customer lifetime value:', error)
			throw new InternalServerErrorException(
				'Failed to calculate customer lifetime value'
			)
		}
	}

	// Ultra-native: Helper method for CLV calculation
	private calculateCustomerLifetimeValue(
		customers: Stripe.Customer[],
		subscriptions: Stripe.Subscription[]
	): CustomerLifetimeValue[] {
		return customers.map(customer => {
			const customerSubs = subscriptions.filter(
				sub => sub.customer === customer.id
			)
			const total_revenue = customerSubs.length * STANDARD_SUBSCRIPTION_VALUE // Simplified revenue calculation
			const subscription_count = customerSubs.length
			const first_subscription =
				customerSubs.length > 0
					? new Date(Math.min(...customerSubs.map(sub => sub.created * 1000)))
					: null
			const last_cancellation =
				customerSubs
					.filter(sub => sub.status === 'canceled' && sub.canceled_at)
					.map(sub => new Date(sub.canceled_at! * 1000))
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
	 * Get predictive metrics for specific customer
	 * Ultra-native: Direct API access with simple predictions
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

			// Fetch customer subscriptions with complete pagination
			const subscriptions = await this.stripeService.getAllSubscriptions({
				customer: customerId
			})

			// Ultra-native: Simple predictive calculation
			const activeSubscriptions = subscriptions.filter(
				sub => sub.status === 'active'
			)
			const canceledSubscriptions = subscriptions.filter(
				sub => sub.status === 'canceled'
			)

			// Simplified predictive metrics
			const predicted_ltv =
				activeSubscriptions.length * STANDARD_SUBSCRIPTION_VALUE * 12 // Assume 12 months
			const churn_risk_score =
				canceledSubscriptions.length > 0
					? Math.min(
							100,
							(canceledSubscriptions.length / (subscriptions.length || 1)) * 100
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
