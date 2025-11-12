/**
 * Property Statistics Service
 *
 * Calculates property-related dashboard metrics
 * Extracted from dashboard.service.ts for CLAUDE.md compliance (<30 lines/method)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../../../database/supabase.service'
import { queryList } from '../../../shared/utils/query-helpers'

export interface PropertyStats {
	total: number
	occupied: number
	occupancyRate: number
}

@Injectable()
export class PropertyStatsService {
	private readonly logger = new Logger(PropertyStatsService.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Calculate property statistics for a user
	 */
	async calculate(internalUserId: string): Promise<PropertyStats> {
		const client = this.supabase.getAdminClient()

		try {
			const properties = await queryList<{ id: string; status: string | null }>(
				client.from('property').select('id, status').eq('ownerId', internalUserId),
				{
					resource: 'properties',
					operation: 'fetch for stats',
					logger: this.logger
				}
			)

			const total = properties.length
			const occupied = properties.filter(
				p => p.status?.toUpperCase() === 'OCCUPIED'
			).length

			return {
				total,
				occupied,
				occupancyRate: total > 0 ? (occupied / total) * 100 : 0
			}
		} catch (error) {
			// Return defaults on error (soft failure for dashboard stats)
			if (error instanceof BadRequestException) {
				this.logger.error('Failed to fetch properties for stats', {
					error: error.message,
					internalUserId
				})
				return { total: 0, occupied: 0, occupancyRate: 0 }
			}
			throw error
		}
	}

	/**
	 * Get property IDs for a user
	 */
	async getPropertyIds(internalUserId: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()

		try {
			const properties = await queryList<{ id: string }>(
				client.from('property').select('id').eq('ownerId', internalUserId),
				{
					resource: 'property IDs',
					operation: 'fetch',
					logger: this.logger
				}
			)

			return properties.map(p => p.id).filter(Boolean)
		} catch (error) {
			// Return empty array on error (soft failure for dashboard)
			if (error instanceof BadRequestException) {
				this.logger.error('Failed to fetch property IDs', {
					error: error.message,
					internalUserId
				})
				return []
			}
			throw error
		}
	}
}
