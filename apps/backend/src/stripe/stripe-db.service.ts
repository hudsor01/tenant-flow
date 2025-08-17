import { Injectable, Logger } from '@nestjs/common'

/**
 * StripeDBService - Provides Stripe analytics through direct Supabase queries
 * This service provides mock analytics data for Stripe metrics
 * NOTE: This service is deprecated. Use StripeFdwService instead.
 */
@Injectable()
export class StripeDBService {
	private readonly logger = new Logger(StripeDBService.name)

	constructor() {
		this.logger.log('StripeDBService initialized (deprecated - use StripeFdwService)')
	}

	/**
	 * Execute raw SQL - placeholder implementation
	 * @deprecated Use StripeFdwService instead
	 */
	private async executeRawSQL(_query: string, _params?: unknown[]): Promise<unknown[]> {
		this.logger.warn('executeRawSQL called on deprecated service. Use StripeFdwService instead.')
		return []
	}

	/**
	 * Get Stripe customer by ID using foreign table
	 */
	async getCustomer(customerId: string) {
		try {
			const query = `
				SELECT * FROM stripe_customers 
				WHERE id = $1
			`
			const result = await this.executeRawSQL(query, [customerId])
			return result[0] || null
		} catch (error) {
			this.logger.error('Failed to get Stripe customer:', error)
			return null
		}
	}

	/**
	 * Get subscription with customer data
	 */
	async getSubscription(subscriptionId: string) {
		try {
			const query = `
				SELECT 
					s.*,
					c.email as customer_email,
					c.name as customer_name
				FROM stripe_subscriptions s
				LEFT JOIN stripe_customers c ON s.customer = c.id
				WHERE s.id = $1
			`
			const result = await this.executeRawSQL(query, [subscriptionId])
			return result[0] || null
		} catch (error) {
			this.logger.error('Failed to get subscription:', error)
			return null
		}
	}

	/**
	 * Get all subscriptions for a customer
	 */
	async getCustomerSubscriptions(customerId: string) {
		try {
			const query = `
				SELECT * FROM stripe_subscriptions 
				WHERE customer = $1 
				ORDER BY created DESC
			`
			const result = await this.executeRawSQL(query, [customerId])
			return result || []
		} catch (error) {
			this.logger.error('Failed to get customer subscriptions:', error)
			return []
		}
	}

	/**
	 * Get recent invoices for analytics
	 */
	async getRecentInvoices(limit = 100) {
		try {
			const query = `
				SELECT 
					i.*,
					c.email as customer_email
				FROM stripe_invoices i
				LEFT JOIN stripe_customers c ON i.customer = c.id
				WHERE i.created > extract(epoch from (now() - interval '30 days'))
				ORDER BY i.created DESC
				LIMIT $1
			`
			const result = await this.executeRawSQL(query, [limit])
			return result || []
		} catch (error) {
			this.logger.error('Failed to get recent invoices:', error)
			return []
		}
	}

	/**
	 * Get payment intents with status breakdown
	 */
	async getPaymentIntentsByStatus(days = 7) {
		try {
			const query = `
				SELECT 
					status,
					COUNT(*) as count,
					SUM(amount) as total_amount
				FROM stripe_payment_intents
				WHERE created > extract(epoch from (now() - interval '${days} days'))
				GROUP BY status
				ORDER BY count DESC
			`
			const result = await this.executeRawSQL(query, [])
			return result || []
		} catch (error) {
			this.logger.error('Failed to get payment intents by status:', error)
			return []
		}
	}

	/**
	 * Get subscription analytics
	 */
	async getSubscriptionAnalytics(days = 30) {
		try {
			const query = `
				SELECT 
					status,
					COUNT(*) as count,
					COUNT(DISTINCT customer) as unique_customers
				FROM stripe_subscriptions
				WHERE created > extract(epoch from (now() - interval '${days} days'))
				GROUP BY status
			`
			const result = await this.executeRawSQL(query, [])
			return result || []
		} catch (error) {
			this.logger.error('Failed to get subscription analytics:', error)
			return []
		}
	}

	/**
	 * Get revenue metrics
	 */
	async getRevenueMetrics(days = 30) {
		try {
			const query = `
				SELECT 
					DATE(to_timestamp(created)) as date,
					COUNT(*) as invoice_count,
					SUM(amount_paid) as total_revenue,
					AVG(amount_paid) as avg_invoice_amount
				FROM stripe_invoices
				WHERE created > extract(epoch from (now() - interval '${days} days'))
					AND status = 'paid'
				GROUP BY DATE(to_timestamp(created))
				ORDER BY date DESC
			`
			const result = await this.executeRawSQL(query, [])
			return result || []
		} catch (error) {
			this.logger.error('Failed to get revenue metrics:', error)
			return []
		}
	}

	/**
	 * Get failed payment analysis
	 */
	async getFailedPaymentAnalysis(days = 30) {
		try {
			const query = `
				SELECT 
					pi.last_payment_error->>'code' as error_code,
					pi.last_payment_error->>'message' as error_message,
					COUNT(*) as occurrence_count,
					SUM(pi.amount) as total_failed_amount
				FROM stripe_payment_intents pi
				WHERE pi.created > extract(epoch from (now() - interval '${days} days'))
					AND pi.status = 'requires_payment_method'
					AND pi.last_payment_error IS NOT NULL
				GROUP BY error_code, error_message
				ORDER BY occurrence_count DESC
			`
			const result = await this.executeRawSQL(query, [])
			return result || []
		} catch (error) {
			this.logger.error('Failed to get failed payment analysis:', error)
			return []
		}
	}

	/**
	 * Get customer churn analysis
	 */
	async getCustomerChurnAnalysis(days = 90) {
		try {
			const query = `
				SELECT 
					DATE(to_timestamp(canceled_at)) as churn_date,
					COUNT(*) as churned_customers,
					AVG(extract(epoch from (to_timestamp(canceled_at) - to_timestamp(created)))) / 86400 as avg_lifetime_days
				FROM stripe_subscriptions
				WHERE canceled_at IS NOT NULL
					AND canceled_at > extract(epoch from (now() - interval '${days} days'))
				GROUP BY DATE(to_timestamp(canceled_at))
				ORDER BY churn_date DESC
			`
			const result = await this.executeRawSQL(query, [])
			return result || []
		} catch (error) {
			this.logger.error('Failed to get churn analysis:', error)
			return []
		}
	}

	/**
	 * Get subscription health metrics
	 */
	async getSubscriptionHealthMetrics() {
		try {
			const query = `
				SELECT 
					COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
					COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscriptions,
					COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_subscriptions,
					COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trialing_subscriptions,
					COUNT(*) as total_subscriptions
				FROM stripe_subscriptions
			`
			const result = await this.executeRawSQL(query, [])
			return (
				result[0] || {
					active_subscriptions: 0,
					past_due_subscriptions: 0,
					canceled_subscriptions: 0,
					trialing_subscriptions: 0,
					total_subscriptions: 0
				}
			)
		} catch (error) {
			this.logger.error(
				'Failed to get subscription health metrics:',
				error
			)
			return {
				active_subscriptions: 0,
				past_due_subscriptions: 0,
				canceled_subscriptions: 0,
				trialing_subscriptions: 0,
				total_subscriptions: 0
			}
		}
	}

	/**
	 * Health check for Stripe foreign data wrapper
	 */
	async healthCheck(): Promise<{
		stripe_customers: boolean
		stripe_subscriptions: boolean
		stripe_invoices: boolean
	}> {
		const health = {
			stripe_customers: false,
			stripe_subscriptions: false,
			stripe_invoices: false
		}

		try {
			// Test customers table
			await this.executeRawSQL('SELECT 1 FROM stripe_customers LIMIT 1')
			health.stripe_customers = true
		} catch (error) {
			this.logger.warn('Stripe customers table not accessible:', error)
		}

		try {
			// Test subscriptions table
			await this.executeRawSQL(
				'SELECT 1 FROM stripe_subscriptions LIMIT 1'
			)
			health.stripe_subscriptions = true
		} catch (error) {
			this.logger.warn(
				'Stripe subscriptions table not accessible:',
				error
			)
		}

		try {
			// Test invoices table
			await this.executeRawSQL('SELECT 1 FROM stripe_invoices LIMIT 1')
			health.stripe_invoices = true
		} catch (error) {
			this.logger.warn('Stripe invoices table not accessible:', error)
		}

		return health
	}
}
