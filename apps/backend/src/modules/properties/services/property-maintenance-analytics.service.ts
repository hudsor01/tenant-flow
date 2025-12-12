import {
	BadRequestException,
	Injectable
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { getTokenFromRequest } from '../../../database/auth-token.utils'
import type { PropertyMaintenanceData } from '@repo/shared/src/types/financial-statements.js'
import { AppLogger } from '../../../logger/app-logger.service'

const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const

/**
 * Property Maintenance Analytics Service
 *
 * Calculates maintenance metrics per property including request counts, completion rates, and costs.
 * Analyzes maintenance requests and associated expenses within specified timeframes.
 */
@Injectable()
export class PropertyMaintenanceAnalyticsService {
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
	 * Get property maintenance analytics
	 * Maintenance request counts, completion rates, and costs per property
	 */
	async getPropertyMaintenanceAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; timeframe: string },
		getPropertyForUser: (
			req: AuthenticatedRequest,
			property_id: string
		) => Promise<{ data: unknown | null }>
	): Promise<PropertyMaintenanceData[]> {
		const user_id = req.user.id
		const startTime = Date.now()

		this.logger.log(
			'[ANALYTICS:MAINTENANCE:START] Maintenance analytics request received',
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
			this.logger.warn('[ANALYTICS:MAINTENANCE:VALIDATION] Invalid timeframe', {
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
				this.logger.warn('[ANALYTICS:MAINTENANCE:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}
		}

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:MAINTENANCE] No auth token', { user_id })
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
			this.logger.error('[ANALYTICS:MAINTENANCE] Properties query failed', {
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
				total_requests: 0,
				completed_requests: 0,
				total_cost: 0,
				average_cost_per_request: 0
			}))
		}

		// Step 2: Get maintenance requests with server-side date filtering
		const { data: maintenanceRequests } = await client
			.from('maintenance_requests')
			.select(`
				id,
				unit_id,
				status,
				estimated_cost,
				actual_cost,
				created_at,
				completed_at
			`)
			.in('unit_id', unitIds)
			.gte('created_at', startIso)
			.lte('created_at', endIso)

		// Step 3: Get expenses with server-side date filtering
		const { data: expenses } = await client
			.from('expenses')
			.select(`
				amount,
				expense_date,
				maintenance_request_id,
				maintenance_request:maintenance_requests!inner (
					unit_id
				)
			`)
			.in('maintenance_request.unit_id', unitIds)
			.gte('expense_date', startIso)
			.lte('expense_date', endIso)

		// Build lookup maps
		const unitToPropertyMap = new Map<string, string>()
		for (const prop of properties) {
			for (const unit of prop.units || []) {
				unitToPropertyMap.set(unit.id, prop.id)
			}
		}

		// Aggregate data by property
		const propertyData = new Map<string, {
			totalRequests: number
			completedRequests: number
			totalCost: number
		}>()
		for (const prop of properties) {
			propertyData.set(prop.id, { totalRequests: 0, completedRequests: 0, totalCost: 0 })
		}

		// Process maintenance requests (already filtered by date)
		for (const req of maintenanceRequests || []) {
			const propId = unitToPropertyMap.get(req.unit_id)
			if (propId) {
				const data = propertyData.get(propId)!
				data.totalRequests++
				if (req.status === 'completed') {
					data.completedRequests++
				}
				// Add costs for completed requests within timeframe
				if (req.completed_at &&
					new Date(req.completed_at) >= start &&
					new Date(req.completed_at) <= end) {
					data.totalCost += req.actual_cost || req.estimated_cost || 0
				}
			}
		}

		// Add expenses (already filtered by date)
		for (const exp of expenses || []) {
			const unitId = (exp.maintenance_request as { unit_id: string })?.unit_id
			const propId = unitToPropertyMap.get(unitId)
			if (propId) {
				const data = propertyData.get(propId)!
				data.totalCost += exp.amount || 0
			}
		}

		// Build result
		const result = properties.map((property) => {
			const data = propertyData.get(property.id)!
			const avgCost = data.totalRequests > 0 ? data.totalCost / data.totalRequests : 0

			return {
				property_id: property.id,
				property_name: property.name,
				timeframe: query.timeframe,
				total_requests: data.totalRequests,
				completed_requests: data.completedRequests,
				total_cost: data.totalCost / 100,
				average_cost_per_request: avgCost / 100
			}
		})

		this.logger.log(
			'[ANALYTICS:MAINTENANCE:COMPLETE] Maintenance analytics completed',
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
