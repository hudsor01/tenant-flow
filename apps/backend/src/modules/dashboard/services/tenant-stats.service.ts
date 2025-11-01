/**
 * Tenant Statistics Service
 * 
 * Calculates tenant-related dashboard metrics
 * Extracted from dashboard.service.ts for CLAUDE.md compliance (<30 lines/method)
 */

import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../../database/supabase.service'

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

		const { data, error } = await client
			.from('tenant')
			.select('status, createdAt')
			.eq('userId', internalUserId)

		if (error) {
			this.logger.error('Failed to fetch tenants', { error: error.message })
			return { total: 0, active: 0, pending: 0, inactive: 0, newThisMonth: 0 }
		}

		const tenants = data ?? []
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
	}
}
