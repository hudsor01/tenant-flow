import {
	BadRequestException,
	Injectable
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'
import { getTokenFromRequest } from '../../../database/auth-token.utils'
import type { PropertyOccupancyData } from '@repo/shared/src/types/financial-statements.js'

import { AppLogger } from '../../../logger/app-logger.service'

const VALID_PERIODS = ['current', 'monthly', 'quarterly', 'yearly'] as const

/**
 * Property Occupancy Analytics Service
 *
 * Calculates occupancy rates and trends over time per property.
 * Analyzes unit status and lease coverage to determine occupancy metrics.
 */
@Injectable()
export class PropertyOccupancyAnalyticsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

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
		const now = new Date()
		const nowIso = now.toISOString()

		// Step 1: Get properties with units (lightweight)
		let propertiesQuery = client.from('properties').select(`
			id,
			name,
			units (
				id,
				status
			)
		`)

		if (query.property_id) {
			propertiesQuery = propertiesQuery.eq('id', query.property_id)
		}

		const { data: properties, error: propError } = await propertiesQuery

		if (propError) {
			this.logger.error('[ANALYTICS:OCCUPANCY] Properties query failed', {
				user_id,
				error: propError.message
			})
			return []
		}

		if (!properties || properties.length === 0) {
			return []
		}

		// Extract unit IDs for filtered lease query
		const unitIds = properties.flatMap(p => (p.units || []).map(u => u.id))

		// Step 2: Get active leases with server-side filtering
		// Only fetch leases that could be currently active (end_date >= now, status = active)
		const { data: leases } = unitIds.length > 0
			? await client
				.from('leases')
				.select('id, unit_id, lease_status, start_date, end_date')
				.in('unit_id', unitIds)
				.eq('lease_status', 'active')
				.gte('end_date', nowIso)
				.lte('start_date', nowIso)
			: { data: [] }

		// Build unit to property map
		const unitToPropertyMap = new Map<string, string>()
		for (const prop of properties) {
			for (const unit of prop.units || []) {
				unitToPropertyMap.set(unit.id, prop.id)
			}
		}

		// Count active leases by property
		const occupiedUnitsByProperty = new Map<string, Set<string>>()
		for (const prop of properties) {
			occupiedUnitsByProperty.set(prop.id, new Set())
		}

		for (const lease of leases || []) {
			const propId = unitToPropertyMap.get(lease.unit_id)
			if (propId) {
				occupiedUnitsByProperty.get(propId)!.add(lease.unit_id)
			}
		}

		// Build result
		const result = properties.map((property) => {
			const units = property.units || []
			const totalUnits = units.length
			const occupiedUnits = occupiedUnitsByProperty.get(property.id)?.size || 0
			const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0

			return {
				property_id: property.id,
				property_name: property.name,
				period,
				occupancy_rate: occupancyRate,
				total_units: totalUnits,
				occupied_units: occupiedUnits,
				vacant_units: totalUnits - occupiedUnits
			}
		})

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

}
