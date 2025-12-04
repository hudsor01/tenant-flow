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
	PropertyMaintenanceData,
	MaintenanceQueryProperty
} from '@repo/shared/src/types/financial-statements.js'

const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const

/**
 * Property Maintenance Analytics Service
 *
 * Calculates maintenance metrics per property including request counts, completion rates, and costs.
 * Analyzes maintenance requests and associated expenses within specified timeframes.
 */
@Injectable()
export class PropertyMaintenanceAnalyticsService {
	private readonly logger: Logger

	constructor(
		private readonly supabase: SupabaseService,
		@Optional() logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertyMaintenanceAnalyticsService.name)
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

		// Build query - fetch properties with units and maintenance requests
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id,
				maintenance_requests (
					id,
					status,
					created_at,
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
			this.logger.error('[ANALYTICS:MAINTENANCE] Query failed', {
				user_id,
				error: error.message
			})
			return []
		}

		// Process each property's maintenance data
		const result = (properties ?? []).map((property) =>
			this.processMaintenanceData(
				property as MaintenanceQueryProperty,
				start,
				end,
				query.timeframe
			)
		)

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

	/**
	 * Process property data to calculate maintenance metrics
	 */
	processMaintenanceData(
		property: MaintenanceQueryProperty,
		start: Date,
		end: Date,
		timeframe: string
	): PropertyMaintenanceData {
		let totalRequests = 0
		let completedRequests = 0
		let totalCost = 0

		const units = property.units || []
		units.forEach((unit) => {
			unit.maintenance_requests?.forEach((req) => {
				// Count requests in timeframe
				if (
					req.created_at &&
					new Date(req.created_at) >= start &&
					new Date(req.created_at) <= end
				) {
					totalRequests++
					if (req.status === 'completed') {
						completedRequests++
					}
					// Add costs
					if (
						req.completed_at &&
						new Date(req.completed_at) >= start &&
						new Date(req.completed_at) <= end
					) {
						totalCost += req.actual_cost || req.estimated_cost || 0
					}
				}
				// Add expenses
				req.expenses?.forEach((exp) => {
					if (
						exp.expense_date &&
						new Date(exp.expense_date) >= start &&
						new Date(exp.expense_date) <= end
					) {
						totalCost += exp.amount || 0
					}
				})
			})
		})

		const averageCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0

		return {
			property_id: property.id,
			property_name: property.name,
			timeframe,
			total_requests: totalRequests,
			completed_requests: completedRequests,
			total_cost: totalCost / 100,
			average_cost_per_request: averageCostPerRequest / 100
		}
	}
}
