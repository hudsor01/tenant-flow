/**
 * Tenant Stats Service
 * Handles tenant statistics and payment status queries
 * Extracted from TenantQueryService for SRP compliance
 */

import {
	BadRequestException,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
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

	private requireUserClient(token?: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}
		return this.supabase.getUserClient(token)
	}

	private async getAccessibleTenantIds(
		userId: string,
		token: string
	): Promise<string[]> {
		const client = this.requireUserClient(token)

		const [{ data: tenantIds, error: rpcError }, { data: tenant, error }] =
			await Promise.all([
				client.rpc('get_tenants_by_owner', { p_user_id: userId }),
				client.from('tenants').select('id').eq('user_id', userId).maybeSingle()
			])

		if (rpcError) {
			this.logger.error('Failed to fetch owner tenant IDs', {
				error: rpcError.message,
				userId
			})
			throw new BadRequestException('Failed to retrieve statistics')
		}

		if (error) {
			this.logger.error('Failed to fetch tenant record for user', {
				error: error.message,
				userId
			})
			throw new BadRequestException('Failed to retrieve statistics')
		}

		const uniqueIds = new Set<string>()

		if (Array.isArray(tenantIds)) {
			for (const id of tenantIds) {
				if (typeof id === 'string' && id.length > 0) {
					uniqueIds.add(id)
				}
			}
		}

		if (tenant?.id) {
			uniqueIds.add(tenant.id)
		}

		return Array.from(uniqueIds)
	}

	/**
	 * Get tenant count for a user
	 */
	async getStats(userId: string, token: string): Promise<TenantStats> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const tenantIds = await this.getAccessibleTenantIds(userId, token)
			const total = tenantIds.length
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
	async getSummary(userId: string, token: string): Promise<TenantSummary> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const tenantIds = await this.getAccessibleTenantIds(userId, token)
			const activeTenants = tenantIds.length

			return {
				total: activeTenants,
				invited: 0,
				active: activeTenants,
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
	async fetchPaymentStatuses(
		userId: string,
		token: string,
		tenantIds: string[]
	): Promise<RentPayment[]> {
		if (!tenantIds.length) return []
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const accessibleTenantIds = await this.getAccessibleTenantIds(
				userId,
				token
			)
			const allowedIds = tenantIds.filter(id =>
				accessibleTenantIds.includes(id)
			)
			if (!allowedIds.length) {
				return []
			}

			const { data, error } = await this.supabase
				.getAdminClient()
				.from('rent_payments')
				.select('id, tenant_id, status, amount, currency, created_at')
				.in('tenant_id', allowedIds)
				.order('created_at', { ascending: false })
				.limit(allowedIds.length) // One per tenant

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
