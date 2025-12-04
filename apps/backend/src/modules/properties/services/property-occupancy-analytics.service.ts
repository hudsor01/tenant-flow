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
	PropertyOccupancyData,
	QueryProperty
} from '@repo/shared/src/types/financial-statements.js'
import { LEASE_STATUS } from '@repo/shared/constants/status-types'

const VALID_PERIODS = ['current', 'monthly', 'quarterly', 'yearly'] as const

/**
 * Property Occupancy Analytics Service
 *
 * Calculates occupancy rates and trends over time per property.
 * Analyzes unit status and lease coverage to determine occupancy metrics.
 */
@Injectable()
export class PropertyOccupancyAnalyticsService {
	private readonly logger: Logger

	constructor(
		private readonly supabase: SupabaseService,
		@Optional() logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertyOccupancyAnalyticsService.name)
	}

	/**
	 * Get property occupancy analytics
	 * Occupancy rates and trends over time per property
	 */
	async getPropertyOccupancyAnalytics(
		req: AuthenticatedRequest,
		query: { property_id?: string; period?: string },
		getPropertyForUser: (
			req: AuthenticatedRequest,
			property_id: string
		) => Promise<{ data: unknown | null }>
	): Promise<PropertyOccupancyData[]> {
		const user_id = req.user.id
		const startTime = Date.now()
		const period = query.period ?? 'current'

		this.logger.log(
			'[ANALYTICS:OCCUPANCY:START] Occupancy analytics request received',
			{
				user_id,
				property_id: query.property_id,
				period
			}
		)

		// Validate period using constant
		if (!VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number])) {
			this.logger.warn('[ANALYTICS:OCCUPANCY:VALIDATION] Invalid period', {
				user_id,
				period
			})
			throw new BadRequestException(
				`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`
			)
		}

		// SECURITY: Verify property ownership before proceeding
		if (query.property_id) {
			const { data: property } = await getPropertyForUser(req, query.property_id)
			if (!property) {
				this.logger.warn('[ANALYTICS:OCCUPANCY:SECURITY] Property not found', {
					user_id,
					property_id: query.property_id
				})
				throw new BadRequestException('Property not found or access denied')
			}
		}

		// Get token and client
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:OCCUPANCY] No auth token', { user_id })
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		// Build query - fetch properties with units and leases
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id,
				status,
				leases (
					id,
					lease_status,
					start_date,
					end_date
				)
			)
		`)

		// Filter by property_id if provided
		if (query.property_id) {
			propertiesQuery = propertiesQuery.eq('id', query.property_id)
		}

		const { data: properties, error } = await propertiesQuery

		if (error) {
			this.logger.error('[ANALYTICS:OCCUPANCY] Query failed', {
				user_id,
				error: error.message
			})
			return []
		}

		// Process each property's occupancy data
		const result = (properties ?? []).map((property) =>
			this.processOccupancyData(property as QueryProperty, period)
		)

		this.logger.log(
			'[ANALYTICS:OCCUPANCY:COMPLETE] Occupancy analytics completed',
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
	 * Process property data to calculate occupancy metrics
	 */
	processOccupancyData(property: QueryProperty, period: string): PropertyOccupancyData {
		const units = property.units || []
		const totalUnits = units.length
		const occupiedUnits = units.filter((unit) => {
			const activeLease = unit.leases?.find(
				(lease) =>
					lease.lease_status === LEASE_STATUS.ACTIVE &&
					new Date(lease.start_date) <= new Date() &&
					new Date(lease.end_date) >= new Date()
			)
			return activeLease
		}).length
		const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
		const vacantUnits = totalUnits - occupiedUnits

		return {
			property_id: property.id,
			property_name: property.name,
			period,
			occupancy_rate: occupancyRate,
			total_units: totalUnits,
			occupied_units: occupiedUnits,
			vacant_units: vacantUnits
		}
	}
}
