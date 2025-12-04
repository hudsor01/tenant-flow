import {
	BadRequestException,
	Injectable,
	Logger,
	Optional
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { getTokenFromRequest } from '../../../database/auth-token.utils'
import type {
	PropertyFinancialData,
	DetailedQueryProperty,
	DetailedQueryUnit,
	DetailedQueryLease
} from '@repo/shared/src/types/financial-statements.js'

const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const

/**
 * Property Financial Analytics Service
 *
 * Calculates financial metrics per property including revenue, expenses, and profit margins.
 * Analyzes rent payments and maintenance costs within specified timeframes.
 */
@Injectable()
export class PropertyFinancialAnalyticsService {
	private readonly logger: Logger

	constructor(
		private readonly supabase: SupabaseService,
		@Optional() logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertyFinancialAnalyticsService.name)
	}

	/**
	 * Parse timeframe string to date range
	 */
	parseTimeframe(timeframe: string): { start: Date; end: Date } {
		const now = new Date()
		const days = parseInt(timeframe.replace('d', ''), 10)
		const start = new Date(now)
		start.setDate(now.getDate() - days)
		return { start, end: now }
	}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profit metrics per property
	 */
	async getPropertyFinancialAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string },
		getPropertyForUser: (
			req: AuthenticatedRequest,
			property_id: string
		) => Promise<{ data: unknown | null }>
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

		// Validate timeframe using constant
		if (
			!VALID_TIMEFRAMES.includes(query.timeframe as (typeof VALID_TIMEFRAMES)[number])
		) {
			this.logger.warn('[ANALYTICS:FINANCIAL:VALIDATION] Invalid timeframe', {
				user_id,
				timeframe: query.timeframe
			})
			throw new BadRequestException(
				`Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`
			)
		}

		// Parse timeframe to date range
		const { start, end } = this.parseTimeframe(query.timeframe)

		// SECURITY: Verify property ownership before proceeding
		if (query.property_id) {
			const { data: property } = await getPropertyForUser(req, query.property_id)
			if (!property) {
				this.logger.warn('[ANALYTICS:FINANCIAL:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}
		}

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:FINANCIAL] No auth token', { user_id })
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

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

		// Filter by property_id if provided
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

		// Process each property's financial data
		const result = (properties ?? []).map((property) =>
			this.processFinancialData(
				property as DetailedQueryProperty,
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
	 * Process property data to calculate financial metrics
	 */
	processFinancialData(
		property: DetailedQueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyFinancialData {
		let totalRevenue = 0
		let totalExpenses = 0

		const units = property.units || []
		units.forEach((unit: DetailedQueryUnit) => {
			// Revenue from payments
			unit.leases?.forEach((lease: DetailedQueryLease) => {
				lease.rent_payments?.forEach((payment) => {
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
			unit.maintenance_requests?.forEach((req) => {
				if (
					req.completed_at &&
					new Date(req.completed_at) >= start &&
					new Date(req.completed_at) <= end
				) {
					totalExpenses += req.actual_cost || req.estimated_cost || 0
				}
				req.expenses?.forEach((exp) => {
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
