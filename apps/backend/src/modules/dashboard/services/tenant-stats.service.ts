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

		// Get tenants and their lease statuses to count active ones
		const { data: tenantData, error: dataError } = await client
			.from('tenants')
			.select(`
				id,
				created_at,
				leases!primary_tenant_id(lease_status)
			`)
			.eq('user_id', internaluser_id)

		if (dataError) {
			this.logger.error('Failed to fetch tenant data', { error: dataError.message })
			return { total: 0, active: 0, pending: 0, inactive: 0, newThisMonth: 0 }
		}

		const tenants = tenantData ?? []

		// Count in a single pass through data
		let activeCount = 0
		let inactiveCount = 0
		let newThisMonthCount = 0

		for (const tenant of tenants) {
			// Check if tenant has active lease
			const hasActiveLease = (tenant.leases as { lease_status?: string }[])?.some(l =>
				['ACTIVE', 'PENDING'].includes(l.lease_status?.toUpperCase() ?? '')
			)

			if (hasActiveLease) {
				activeCount += 1
			} else {
				inactiveCount += 1
			}

			// Check if tenant is new this month
			if (tenant.created_at && new Date(tenant.created_at) >= startOfCurrentMonth) {
				newThisMonthCount += 1
			}
		}

		return {
			total: tenants.length,
			active: activeCount,
			pending: 0,
			inactive: inactiveCount,
			newThisMonth: newThisMonthCount
		}
	}
}
