/**
 * Unit Stats Service
 * Handles unit statistics, analytics, and aggregate calculations
 * Extracted from UnitsService to maintain <300 line limit per CLAUDE.md
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import type { Unit, UnitStats } from '@repo/shared/types/core'
import { SupabaseService } from '../../../database/supabase.service'
import { AppLogger } from '../../../logger/app-logger.service'

@Injectable()
export class UnitStatsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get unit statistics via RLS-protected query
	 */
	async getStats(token: string): Promise<UnitStats> {
		try {
			if (!token) {
				this.logger.warn('Unit stats requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting unit stats via RLS-protected query')

			const client = this.supabase.getUserClient(token)

			const { data: allUnitsData, error: unitsError } = await client
				.from('units')
				.select('status, rent_amount')

			if (unitsError) {
				this.logger.error('Failed to get unit data', {
					error: unitsError.message
				})
				throw new BadRequestException('Failed to get unit statistics')
			}

			const units = allUnitsData || []
			const totalCount = units.length

			const occupiedCount = units.filter(u => u.status === 'occupied').length
			const vacantCount = units.filter(u => u.status === 'available').length
			const maintenanceCount = units.filter(
				u => u.status === 'maintenance'
			).length

			const totalRent = units.reduce(
				(sum, unit) => sum + (unit.rent_amount || 0),
				0
			)
			const averageRent = totalCount > 0 ? totalRent / totalCount : 0
			const occupancyRate =
				totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0

			return {
				total: totalCount,
				occupied: occupiedCount,
				vacant: vacantCount,
				maintenance: maintenanceCount,
				available: vacantCount,
				occupancyRate,
				averageRent,
				totalPotentialRent: totalRent,
				totalActualRent: occupiedCount * averageRent
			} as UnitStats
		} catch (error) {
			this.logger.error('Units service failed to get stats', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get unit statistics'
			)
		}
	}

	/**
	 * Get units analytics via RLS-protected query
	 */
	async getAnalytics(
		token: string,
		options: { property_id?: string; timeframe: string }
	): Promise<Unit[]> {
		try {
			if (!token) {
				this.logger.warn('Unit analytics requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Getting unit analytics via RLS-protected query', {
				options
			})

			const client = this.supabase.getUserClient(token)

			let queryBuilder = client.from('units').select('*')

			if (options.property_id) {
				queryBuilder = queryBuilder.eq('property_id', options.property_id)
			}

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to get unit analytics', {
					error: error.message,
					options
				})
				return []
			}

			return (data as Unit[]) || []
		} catch (error) {
			this.logger.error('Units service failed to get analytics', {
				error: error instanceof Error ? error.message : String(error),
				options
			})
			return []
		}
	}

	/**
	 * Get comprehensive unit statistics
	 */
	async getUnitStatistics(
		token: string,
		property_id?: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Getting unit statistics via RLS-protected queries', {
				property_id
			})

			const [stats, analytics] = await Promise.all([
				this.getStats(token),
				this.getAnalytics(token, {
					...(property_id ? { property_id } : {}),
					timeframe: '12m'
				})
			])

			const totalUnits = analytics.length
			const occupiedUnits = analytics.filter(
				(unit: Unit) => unit.status === 'occupied'
			).length
			const vacantUnits = analytics.filter(
				(unit: Unit) => unit.status === 'available'
			).length
			const maintenanceUnits = analytics.filter(
				(unit: Unit) => unit.status === 'maintenance'
			).length

			const totalRent = analytics.reduce((sum: number, unit: Unit) => {
				return sum + (unit.rent_amount || 0)
			}, 0)
			const averageRent = totalUnits > 0 ? totalRent / totalUnits : 0

			const occupancyRate =
				totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

			return {
				summary: {
					total: stats.total,
					occupied: stats.occupied,
					vacant: stats.vacant,
					maintenance: stats.maintenance || maintenanceUnits,
					occupancyRate: stats.occupancyRate,
					averageRent: stats.averageRent || averageRent
				},
				breakdown: {
					byStatus: {
						occupied: occupiedUnits,
						vacant: vacantUnits,
						maintenance: maintenanceUnits,
						available: stats.available || vacantUnits
					},
					byProperty: property_id
						? {
								property_id,
								totalUnits,
								occupiedUnits,
								vacantUnits,
								occupancyRate
							}
						: null
				},
				financial: {
					totalPotentialRent: stats.totalPotentialRent || totalRent,
					totalActualRent: stats.totalActualRent || occupiedUnits * averageRent,
					averageRent,
					totalRent
				},
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.logger.error('Failed to get unit statistics', {
				error: error instanceof Error ? error.message : String(error),
				property_id
			})
			return {}
		}
	}
}
