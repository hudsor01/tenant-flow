/**
 * OccupancyAnalyticsService
 *
 * Handles property occupancy analytics calculations.
 * Extracted from PropertyAnalyticsService for single responsibility.
 */
import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseService } from '../../../../database/supabase.service'
import { AppLogger } from '../../../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../../../../shared/types/express-request.types'
import { getTokenFromRequest } from '../../../../database/auth-token.utils'

// Valid periods for occupancy queries
const VALID_PERIODS = ['current', 'month', 'quarter', 'year'] as const

export interface PropertyOccupancyData {
	property_id: string
	property_name: string
	period: string
	occupancy_rate: number
	total_units: number
	occupied_units: number
	vacant_units: number
}

interface QueryProperty {
	id: string
	name: string
	units?: QueryUnit[]
}

interface QueryUnit {
	id: string
	status: string
	leases?: QueryLease[]
}

interface QueryLease {
	id: string
	lease_status: string
	start_date: string
	end_date: string
}

@Injectable()
export class OccupancyAnalyticsService {
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
		query: { property_id?: string; period?: string }
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

		this.validatePeriod(period, user_id)

		// SECURITY: Verify property ownership before proceeding
		if (query.property_id) {
			await this.verifyPropertyAccess(req, query.property_id)
		}

		const client = this.getAuthenticatedClient(req)

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

		const result = (properties ?? []).map(property =>
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
	 * Validate period parameter
	 */
	private validatePeriod(period: string, user_id: string): void {
		if (!VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number])) {
			this.logger.warn('[ANALYTICS:OCCUPANCY:VALIDATION] Invalid period', {
				user_id,
				period
			})
			throw new BadRequestException(
				`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`
			)
		}
	}

	/**
	 * Get authenticated Supabase client
	 */
	private getAuthenticatedClient(req: AuthenticatedRequest): SupabaseClient {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.warn('[ANALYTICS:OCCUPANCY] No auth token', {
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
		this.logger.debug('[ANALYTICS:OCCUPANCY:SECURITY] Verifying property access', {
			user_id: req.user.id,
			property_id
		})

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
			this.logger.warn('[ANALYTICS:OCCUPANCY:SECURITY] Property not found', {
				user_id: req.user.id,
				property_id
			})
			throw new BadRequestException('Property not found or access denied')
		}

		this.logger.debug('[ANALYTICS:OCCUPANCY:SECURITY] Property access verified', {
			user_id: req.user.id,
			property_id
		})
	}

	/**
	 * Process property data to calculate occupancy metrics
	 */
	private processOccupancyData(
		property: QueryProperty,
		period: string
	): PropertyOccupancyData {
		const units = property.units || []
		const totalUnits = units.length
		const occupiedUnits = units.filter(unit => {
			const activeLease = unit.leases?.find(
				lease =>
					lease.lease_status === 'active' &&
					new Date(lease.start_date) <= new Date() &&
					new Date(lease.end_date) >= new Date()
			)
			return activeLease
		}).length
		const occupancyRate =
			totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
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
