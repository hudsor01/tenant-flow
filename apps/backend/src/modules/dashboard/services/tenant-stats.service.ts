/**
 * Tenant Statistics Service
 *
 * Calculates tenant-related dashboard metrics
 * Extracted from dashboard.service.ts for CLAUDE.md compliance (<30 lines/method)
 *
 * NOTE: Tenant status is derived from lease_status, not a direct column on tenants table
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
	 * Tenant status is derived from their active leases (lease_status column)
	 */
	async calculate(
		internaluser_id: string,
		startOfCurrentMonth: Date
	): Promise<TenantStats> {
		const client = this.supabase.getAdminClient()

		// Get all tenants and their lease status via join
		const { data, error } = await client
			.from('tenants')
			.select(`
				id,
				created_at,
				leases!primary_tenant_id(lease_status)
			`)
			.eq('user_id', internaluser_id)

		if (error) {
			this.logger.error('Failed to fetch tenants', { error: error.message })
			return { total: 0, active: 0, pending: 0, inactive: 0, newThisMonth: 0 }
		}

		const tenants = data ?? []

		// Helper to determine tenant status from their leases
		const getTenantStatus = (leases: { lease_status?: string }[]): string => {
			if (!leases || leases.length === 0) return 'INACTIVE'
			const activeStatuses = ['ACTIVE', 'PENDING']
			const hasActiveLease = leases.some(l =>
				activeStatuses.includes(l.lease_status?.toUpperCase() ?? '')
			)
			return hasActiveLease ? 'ACTIVE' : 'INACTIVE'
		}

		return {
			total: tenants.length,
			active: tenants.filter(t => getTenantStatus(t.leases as { lease_status?: string }[]) === 'ACTIVE').length,
			pending: 0, // Cannot determine pending status without lease data
			inactive: tenants.filter(t => getTenantStatus(t.leases as { lease_status?: string }[]) === 'INACTIVE').length,
			newThisMonth: tenants.filter(
				t => t.created_at && new Date(t.created_at) >= startOfCurrentMonth
			).length
		}
	}
}
