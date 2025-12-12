import {
	BadRequestException,
	Injectable
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { getTokenFromRequest } from '../../../database/auth-token.utils'
import type { PropertyFinancialData } from '@repo/shared/src/types/financial-statements.js'
import { AppLogger } from '../../../logger/app-logger.service'

const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const

/**
 * Property Financial Analytics Service
 *
 * Calculates financial metrics per property including revenue, expenses, and profit margins.
 * Analyzes rent payments and maintenance costs within specified timeframes.
 */
@Injectable()
export class PropertyFinancialAnalyticsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

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
		const startIso = start.toISOString()
		const endIso = end.toISOString()

		// Step 1: Get properties with units (lightweight)
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id
			)
		`)

		if (query.property_id) {
			propertiesQuery = propertiesQuery.eq('id', query.property_id)
		}

		const { data: properties, error: propError } = await propertiesQuery

		if (propError) {
			this.logger.error('[ANALYTICS:FINANCIAL] Properties query failed', {
				user_id,
				error: propError.message
			})
			return []
		}

		if (!properties || properties.length === 0) {
			return []
		}

		// Extract unit IDs for filtered queries
		const unitIds = properties.flatMap(p => (p.units || []).map(u => u.id))

		if (unitIds.length === 0) {
			return properties.map(p => ({
				property_id: p.id,
				property_name: p.name,
				timeframe: query.timeframe,
				total_revenue: 0,
				total_expenses: 0,
				net_income: 0,
				profit_margin: 0
			}))
		}

		// Step 2: Get rent payments with server-side date filtering
		const { data: payments } = await client
			.from('rent_payments')
			.select(`
				amount,
				status,
				paid_date,
				lease:leases!inner (
					unit_id
				)
			`)
			.in('lease.unit_id', unitIds)
			.eq('status', 'succeeded')
			.gte('paid_date', startIso)
			.lte('paid_date', endIso)

		// Step 3: Get maintenance costs with server-side date filtering
		const { data: maintenanceRequests } = await client
			.from('maintenance_requests')
			.select(`
				id,
				unit_id,
				estimated_cost,
				actual_cost,
				completed_at
			`)
			.in('unit_id', unitIds)
			.gte('completed_at', startIso)
			.lte('completed_at', endIso)

		// Step 4: Get expenses with server-side date filtering
		const { data: expenses } = await client
			.from('expenses')
			.select(`
				amount,
				expense_date,
				maintenance_request:maintenance_requests!inner (
					unit_id
				)
			`)
			.in('maintenance_request.unit_id', unitIds)
			.gte('expense_date', startIso)
			.lte('expense_date', endIso)

		// Build lookup maps for efficient processing
		const unitToPropertyMap = new Map<string, string>()
		for (const prop of properties) {
			for (const unit of prop.units || []) {
				unitToPropertyMap.set(unit.id, prop.id)
			}
		}

		// Aggregate data by property
		const propertyData = new Map<string, { revenue: number; expenses: number }>()
		for (const prop of properties) {
			propertyData.set(prop.id, { revenue: 0, expenses: 0 })
		}

		// Sum payments (already filtered by date and status)
		for (const payment of payments || []) {
			const unitId = (payment.lease as { unit_id: string })?.unit_id
			const propId = unitToPropertyMap.get(unitId)
			if (propId) {
				const data = propertyData.get(propId)!
				data.revenue += payment.amount || 0
			}
		}

		// Sum maintenance costs (already filtered by date)
		for (const req of maintenanceRequests || []) {
			const propId = unitToPropertyMap.get(req.unit_id)
			if (propId) {
				const data = propertyData.get(propId)!
				data.expenses += req.actual_cost || req.estimated_cost || 0
			}
		}

		// Sum expenses (already filtered by date)
		for (const exp of expenses || []) {
			const unitId = (exp.maintenance_request as { unit_id: string })?.unit_id
			const propId = unitToPropertyMap.get(unitId)
			if (propId) {
				const data = propertyData.get(propId)!
				data.expenses += exp.amount || 0
			}
		}

		// Build result
		const result = properties.map((property) => {
			const data = propertyData.get(property.id)!
			const netIncome = data.revenue - data.expenses
			const profitMargin = data.revenue > 0 ? (netIncome / data.revenue) * 100 : 0

			return {
				property_id: property.id,
				property_name: property.name,
				timeframe: query.timeframe,
				total_revenue: data.revenue / 100,
				total_expenses: data.expenses / 100,
				net_income: netIncome / 100,
				profit_margin: profitMargin
			}
		})

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

}
