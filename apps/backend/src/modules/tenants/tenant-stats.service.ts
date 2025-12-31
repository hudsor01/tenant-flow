/**
 * Tenant Stats Service
 * Handles tenant statistics and payment status queries
 * Extracted from TenantQueryService for SRP compliance
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import type {
	TenantStats,
	TenantSummary,
	RentPayment
} from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class TenantStatsService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get tenant count for a user
	 */
	async getStats(userId: string): Promise<TenantStats> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const { count, error } = await this.supabase
				.getAdminClient()
				.from('tenants')
				.select('id', { count: 'exact', head: false })
				.eq('user_id', userId)

			if (error) {
				this.logger.error('Failed to fetch tenant stats', {
					error: error.message,
					userId
				})
				throw new BadRequestException('Failed to retrieve statistics')
			}

			const total = count || 0
			return {
				total,
				active: total,
				inactive: 0,
				newThisMonth: 0,
				totalTenants: total,
				activeTenants: total
			} as TenantStats
		} catch (error) {
			if (error instanceof BadRequestException) throw error
			this.logger.error('Error getting tenant statistics', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Get summary stats (active tenants, pending payments, etc.)
	 */
	async getSummary(userId: string): Promise<TenantSummary> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const client = this.supabase.getAdminClient()

			const { count: activeTenants } = await client
				.from('tenants')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', userId)

			return {
				total: activeTenants || 0,
				invited: 0,
				active: activeTenants || 0,
				overdueBalanceCents: 0,
				upcomingDueCents: 0,
				timestamp: new Date().toISOString()
			} as TenantSummary
		} catch (error) {
			this.logger.error('Error getting tenant summary', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Get latest payment status for multiple tenants
	 */
	async fetchPaymentStatuses(tenantIds: string[]): Promise<RentPayment[]> {
		if (!tenantIds.length) return []

		try {
			const { data, error } = await this.supabase
				.getAdminClient()
				.from('rent_payments')
				.select('id, tenant_id, status, amount, currency, created_at')
				.in('tenant_id', tenantIds)
				.order('created_at', { ascending: false })
				.limit(tenantIds.length) // One per tenant

			if (error) {
				this.logger.warn('Failed to fetch payment status', {
					error: error.message
				})
				return []
			}

			// Group by tenant_id, keep most recent
			const statusMap = new Map<string, RentPayment>()
			for (const payment of (data as RentPayment[]) || []) {
				if (payment.tenant_id && !statusMap.has(payment.tenant_id)) {
					statusMap.set(payment.tenant_id, payment)
				}
			}

			return Array.from(statusMap.values())
		} catch (error) {
			this.logger.error('Error fetching payment statuses', {
				error: error instanceof Error ? error.message : String(error)
			})
			return []
		}
	}
}
