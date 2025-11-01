/**
 * Property Statistics Service
 * 
 * Calculates property-related dashboard metrics
 * Extracted from dashboard.service.ts for CLAUDE.md compliance (<30 lines/method)
 */

import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../../database/supabase.service'

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

		const { data, error } = await client
			.from('property')
			.select('id, status')
			.eq('ownerId', internalUserId)

		if (error) {
			this.logger.error('Failed to fetch properties', { error: error.message })
			return { total: 0, occupied: 0, occupancyRate: 0 }
		}

		const properties = data ?? []
		const total = properties.length
		const occupied = properties.filter(
			p => p.status?.toUpperCase() === 'OCCUPIED'
		).length

		return {
			total,
			occupied,
			occupancyRate: total > 0 ? (occupied / total) * 100 : 0
		}
	}

	/**
	 * Get property IDs for a user
	 */
	async getPropertyIds(internalUserId: string): Promise<string[]> {
		const client = this.supabase.getAdminClient()

		const { data, error } = await client
			.from('property')
			.select('id')
			.eq('ownerId', internalUserId)

		if (error) {
			this.logger.error('Failed to fetch property IDs', { error: error.message })
			return []
		}

		return (data ?? []).map(p => p.id).filter(Boolean)
	}
}
