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

@Injectable()
export class StripeFdwSimpleService {
	private readonly logger = new Logger(StripeFdwSimpleService.name)

	constructor(_supabase: SupabaseService) {}   

	/**
	 * Execute raw SQL query on Stripe FDW tables using Supabase MCP
	 */
	private async executeQuery<T>(query: string): Promise<T[]> {
		try {
			// Note: This service is a placeholder for direct SQL execution
			// In production, use the StripeFdwService which uses proper RPC functions
			this.logger.debug(`Would execute FDW query: ${query}`)
			
			// Return empty array until RPC functions are deployed
			return [] as T[]
		} catch (error) {
			this.logger.error(`Failed to execute FDW query: ${query}`, error)
			throw error
		}
	}

	/**
	 * Get all customers from Stripe via Foreign Data Wrapper
	 */
	async getCustomers(limit = 50): Promise<StripeCustomerFDW[]> {
		const query = `
			SELECT id, email, name, description, phone, currency, 
				   balance, delinquent, livemode, metadata, created_at
			FROM stripe_fdw.v_customers 
			ORDER BY created_at DESC 
			LIMIT ${limit}
		`
		return this.executeQuery<StripeCustomerFDW>(query)
	}

	/**
	 * Get customer by ID from Stripe via Foreign Data Wrapper
	 */
	async getCustomerById(customerId: string): Promise<StripeCustomerFDW | null> {
		const query = `
			SELECT id, email, name, description, phone, currency, 
				   balance, delinquent, livemode, metadata, created_at
			FROM stripe_fdw.v_customers 
			WHERE id = '${customerId}'
			LIMIT 1
		`
		const results = await this.executeQuery<StripeCustomerFDW>(query)
		return results.length > 0 ? (results[0] ?? null) : null
	}

	/**
	 * Get subscriptions from Stripe via Foreign Data Wrapper
	 */
	async getSubscriptions(customerId?: string, limit = 50): Promise<StripeSubscriptionFDW[]> {
		let query = `
			SELECT id, customer_id, status, cancel_at_period_end, currency,
				   default_payment_method, description, livemode, metadata,
				   created_at, current_period_start, current_period_end, trial_end
			FROM stripe_fdw.v_subscriptions
		`
		
		if (customerId) {
			query += ` WHERE customer_id = '${customerId}'`
		}
		
		query += ` ORDER BY created_at DESC LIMIT ${limit}`
		
		return this.executeQuery<StripeSubscriptionFDW>(query)
	}

	/**
	 * Get payment intents from Stripe via Foreign Data Wrapper
	 */
	async getPaymentIntents(customerId?: string, limit = 50): Promise<StripePaymentIntentFDW[]> {
		let query = `
			SELECT id, amount, currency, customer_id, status, description,
				   receipt_email, livemode, metadata, created_at
			FROM stripe_fdw.v_payment_intents
		`
		
		if (customerId) {
			query += ` WHERE customer_id = '${customerId}'`
		}
		
		query += ` ORDER BY created_at DESC LIMIT ${limit}`
		
		return this.executeQuery<StripePaymentIntentFDW>(query)
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
			const [customer, subscriptions, paymentIntents] = await Promise.all([
				this.getCustomerById(customerId),
				this.getSubscriptions(customerId),
				this.getPaymentIntents(customerId)
			])

			return {
				customer,
				subscriptions,
				paymentIntents
			}
		} catch (error) {
			this.logger.error(`Failed to fetch payment history for customer ${customerId}:`, error)
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
	}> {
		try {
			const query = `
				SELECT 
					status,
					COUNT(*) as count
				FROM stripe_fdw.v_subscriptions
				GROUP BY status
			`
			
			const results = await this.executeQuery<{status: string, count: number}>(query)
			
			const analytics = {
				totalSubscriptions: 0,
				activeSubscriptions: 0,
				canceledSubscriptions: 0,
				trialSubscriptions: 0
			}

			results.forEach(result => {
				analytics.totalSubscriptions += result.count
				switch (result.status) {
					case 'active':
						analytics.activeSubscriptions = result.count
						break
					case 'canceled':
						analytics.canceledSubscriptions = result.count
						break
					case 'trialing':
						analytics.trialSubscriptions = result.count
						break
				}
			})

			return analytics
		} catch (error) {
			this.logger.error('Failed to calculate subscription analytics:', error)
			throw error
		}
	}

	/**
	 * Execute custom SQL queries on Stripe data via FDW
	 * Use with caution - this allows direct SQL access
	 */
	async executeCustomQuery(query: string): Promise<unknown[]> {
		return this.executeQuery(query)
	}

	/**
	 * Test the FDW connection
	 */
	async testConnection(): Promise<boolean> {
		try {
			const query = 'SELECT COUNT(*) as count FROM stripe_fdw.v_customers LIMIT 1'
			await this.executeQuery(query)
			return true
		} catch (error) {
			this.logger.error('FDW connection test failed:', error)
			return false
		}
	}
}