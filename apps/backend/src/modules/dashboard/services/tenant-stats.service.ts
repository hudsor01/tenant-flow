/**
 * Tenant Statistics Service
 *
 * Calculates tenant-related dashboard metrics
 * Extracted from dashboard.service.ts for CLAUDE.md compliance (<30 lines/method)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../../../database/supabase.service'
import { queryList } from '../../../shared/utils/query-helpers'

export interface TenantStats {
	total: number
	active: number
	pending: number
	inactive: number
	newThisMonth: number
}

@Injectable()
export class TenantStatsService {
	private readonly logger = new Logger(TenantStatsService.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Calculate tenant statistics for a user
	 */
	async calculate(
		internalUserId: string,
		startOfCurrentMonth: Date
	): Promise<TenantStats> {
		const client = this.supabase.getAdminClient()

		try {
			const tenants = await queryList<{ status: string | null; createdAt: string | null }>(
				client.from('tenant').select('status, createdAt').eq('userId', internalUserId),
				{
					resource: 'tenants',
					operation: 'fetch for stats',
					logger: this.logger
				}
			)

			const statusToUpper = (s: string | null) => (s ?? '').toUpperCase()

			return {
				total: tenants.length,
				active: tenants.filter(t => statusToUpper(t.status) === 'ACTIVE').length,
				pending: tenants.filter(t => statusToUpper(t.status) === 'PENDING').length,
				inactive: tenants.filter(t =>
					['INACTIVE', 'EVICTED', 'MOVED_OUT', 'ARCHIVED'].includes(
						statusToUpper(t.status)
					)
				).length,
				newThisMonth: tenants.filter(
					t => t.createdAt && new Date(t.createdAt) >= startOfCurrentMonth
				).length
			}
		} catch (error) {
			// Return defaults on error (soft failure for dashboard stats)
			if (error instanceof BadRequestException) {
				this.logger.error('Failed to fetch tenants for stats', {
					error: error.message,
					internalUserId
				})
				return { total: 0, active: 0, pending: 0, inactive: 0, newThisMonth: 0 }
			}
			throw error
		}
	}
}
