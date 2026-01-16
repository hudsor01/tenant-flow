/**
 * FinancialAnalyticsService
 *
 * Handles property financial analytics calculations.
 * Extracted from PropertyAnalyticsService for single responsibility.
 */
import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../../../../database/supabase.service'
import { AppLogger } from '../../../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../../../../shared/types/express-request.types'
import { getTokenFromRequest } from '../../../../database/auth-token.utils'

// Valid timeframes for financial queries
const VALID_TIMEFRAMES = ['7d', '30d', '90d', '365d'] as const

export interface PropertyFinancialData {
	property_id: string
	property_name: string
	timeframe: string
	total_revenue: number
	total_expenses: number
	net_income: number
	profit_margin: number
}

interface QueryProperty {
	id: string
	name: string
	units?: QueryUnit[]
}

interface QueryUnit {
	id: string
	leases?: QueryLease[]
	maintenance_requests?: QueryMaintenanceRequest[]
}

interface QueryLease {
	id: string
	rent_payments?: QueryPayment[]
}

interface QueryPayment {
	amount: number
	status: string
	paid_date: string | null
}

interface QueryMaintenanceRequest {
	id: string
	status: string
	estimated_cost: number | null
	actual_cost: number | null
	completed_at: string | null
	expenses?: QueryExpense[]
}

interface QueryExpense {
	amount: number
	expense_date: string
}

@Injectable()
export class FinancialAnalyticsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profit metrics per property
	 */
	async getPropertyFinancialAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string }
	): Promise<PropertyFinancialData[]> {
		const user_id = req.user.id
		const startTime = Date.now()

		this.logger.log(
			'[ANALYTICS:FINANCIAL:START] Financial analytics request received',
			{
				user_id,
				property_id: query.property_id,
				timeframe: query.timeframe
			}
		)

		this.validateTimeframe(query.timeframe, user_id)

		const { start, end } = this.parseTimeframe(query.timeframe)

		// SECURITY: Verify property ownership before proceeding
		if (query.property_id) {
			await this.verifyPropertyAccess(req, query.property_id)
		}

		const client = this.getAuthenticatedClient(req)

		// Build query - fetch properties with units, leases, payments, and maintenance
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id,
				leases (
					id,
					rent_payments (
						amount,
						status,
						paid_date
					)
				),
				maintenance_requests (
					id,
					status,
					estimated_cost,
					actual_cost,
					completed_at,
					expenses (
						amount,
						expense_date
					)
				)
			)
		`)

		if (query.property_id) {
			propertiesQuery = propertiesQuery.eq('id', query.property_id)
		}

		const { data: properties, error } = await propertiesQuery

		if (error) {
			this.logger.error('[ANALYTICS:FINANCIAL] Query failed', {
				user_id,
				error: error.message
			})
			return []
		}

		const result = (properties ?? []).map(property =>
			this.processFinancialData(
				property as QueryProperty,
				start,
				end,
				query.timeframe
			)
		)

		this.logger.log(
			'[ANALYTICS:FINANCIAL:COMPLETE] Financial analytics completed',
			{
				user_id,
				property_id: query.property_id,
				resultCount: result.length,
				duration_ms: Date.now() - startTime
			}
		)

		return result
	}

	/**
	 * Validate timeframe parameter
	 */
	private validateTimeframe(timeframe: string, user_id: string): void {
		if (
			!VALID_TIMEFRAMES.includes(timeframe as (typeof VALID_TIMEFRAMES)[number])
		) {
			this.logger.warn('[ANALYTICS:FINANCIAL:VALIDATION] Invalid timeframe', {
				user_id,
				timeframe
			})
			throw new BadRequestException(
				`Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`
			)
		}
	}

	/**
	 * Parse timeframe string to date range
	 */
	private parseTimeframe(timeframe: string): { start: Date; end: Date } {
		const now = new Date()
		const days = parseInt(timeframe.replace('d', ''), 10)
		const start = new Date(now)
		start.setDate(now.getDate() - days)
		return { start, end: now }
	}

	/**
	 * Get authenticated Supabase client
	 */
	private getAuthenticatedClient(req: AuthenticatedRequest): SupabaseClient {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:FINANCIAL] No auth token', {
				user_id: req.user.id
			})
			throw new BadRequestException('Authentication required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Verify property ownership/access
	 */
	private async verifyPropertyAccess(
		req: AuthenticatedRequest,
		property_id: string
	): Promise<void> {
		this.logger.debug(
			'[ANALYTICS:FINANCIAL:SECURITY] Verifying property access',
			{
				user_id: req.user.id,
				property_id
			}
		)

		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('Property lookup requested without auth token', {
				property_id
			})
			throw new BadRequestException('Property not found or access denied')
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('properties')
			.select('id')
			.eq('id', property_id)
			.single()

		if (error || !data) {
			this.logger.warn('[ANALYTICS:FINANCIAL:SECURITY] Property not found', {
				user_id: req.user.id,
				property_id
			})
			throw new BadRequestException('Property not found or access denied')
		}

		this.logger.debug(
			'[ANALYTICS:FINANCIAL:SECURITY] Property access verified',
			{
				user_id: req.user.id,
				property_id
			}
		)
	}

	/**
	 * Process property data to calculate financial metrics
	 */
	private processFinancialData(
		property: QueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyFinancialData {
		let totalRevenue = 0
		let totalExpenses = 0

		const units = property.units || []
		units.forEach(unit => {
			// Revenue from payments
			unit.leases?.forEach(lease => {
				lease.rent_payments?.forEach(payment => {
					if (
						payment.status === 'succeeded' &&
						payment.paid_date &&
						new Date(payment.paid_date) >= start &&
						new Date(payment.paid_date) <= end
					) {
						totalRevenue += payment.amount || 0
					}
				})
			})

			// Expenses from maintenance
			unit.maintenance_requests?.forEach(req => {
				if (
					req.completed_at &&
					new Date(req.completed_at) >= start &&
					new Date(req.completed_at) <= end
				) {
					totalExpenses += req.actual_cost || req.estimated_cost || 0
				}
				req.expenses?.forEach(exp => {
					if (
						exp.expense_date &&
						new Date(exp.expense_date) >= start &&
						new Date(exp.expense_date) <= end
					) {
						totalExpenses += exp.amount || 0
					}
				})
			})
		})

		const netIncome = totalRevenue - totalExpenses
		const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

		return {
			property_id: property.id,
			property_name: property.name,
			timeframe,
			total_revenue: totalRevenue / 100,
			total_expenses: totalExpenses / 100,
			net_income: netIncome / 100,
			profit_margin: profitMargin
		}
	}
}
