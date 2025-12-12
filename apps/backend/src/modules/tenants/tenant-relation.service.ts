/**
 * Tenant Relation Service
 * Handles tenant-to-owner and tenant-to-payment relationships
 * Extracted from TenantQueryService for SRP compliance
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import type { RentPayment } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

/** Default limit for payment history queries */
const DEFAULT_PAYMENT_HISTORY_LIMIT = 50

@Injectable()
export class TenantRelationService {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Get all owner property IDs
	 */
	async getOwnerPropertyIds(authUserId: string): Promise<string[]> {
		if (!authUserId) throw new BadRequestException('Owner ID required')

		try {
			const client = this.supabase.getAdminClient()

			// First get property_owners.id from auth_user_id
			const { data: ownerRecord } = await client
				.from('property_owners')
				.select('id')
				.eq('user_id', authUserId)
				.maybeSingle()

			if (!ownerRecord) {
				return []
			}

			const { data, error } = await client
				.from('properties')
				.select('id')
				.eq('property_owner_id', ownerRecord.id)

			if (error) {
				this.logger.error('Failed to fetch owner properties', {
					error: error.message,
					authUserId
				})
				return []
			}

			return ((data as Array<{ id: string }>) || []).map((p) => p.id)
		} catch (error) {
			this.logger.error('Error getting owner property IDs', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})
			return []
		}
	}

	/**
	 * Get all tenant IDs for owner (via lease relationships)
	 */
	async getTenantIdsForOwner(authUserId: string): Promise<string[]> {
		if (!authUserId) throw new BadRequestException('Owner ID required')

		try {
			const client = this.supabase.getAdminClient()

			// First get property_owners.id from auth_user_id
			const { data: ownerRecord } = await client
				.from('property_owners')
				.select('id')
				.eq('user_id', authUserId)
				.maybeSingle()

			if (!ownerRecord) {
				return []
			}

			// Optimized: Single query directly to leases table
			// Leases have property_owner_id, so no need for nested joins
			const { data: leaseData, error: leaseError } = await client
				.from('leases')
				.select('primary_tenant_id')
				.eq('property_owner_id', ownerRecord.id)
				.not('primary_tenant_id', 'is', null)

			if (leaseError || !leaseData) {
				return []
			}

			// Extract unique tenant IDs (Set handles deduplication)
			const tenantIds = new Set<string>()
			for (const lease of leaseData) {
				if (lease.primary_tenant_id) {
					tenantIds.add(lease.primary_tenant_id)
				}
			}

			return [...tenantIds]
		} catch (error) {
			this.logger.error('Error getting tenant IDs for owner', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})
			return []
		}
	}

	/**
	 * Get payment history for tenant
	 */
	async getTenantPaymentHistory(
		tenantId: string,
		limit = DEFAULT_PAYMENT_HISTORY_LIMIT
	): Promise<RentPayment[]> {
		if (!tenantId) throw new BadRequestException('Tenant ID required')

		try {
			const { data, error } = await this.supabase
				.getAdminClient()
				.from('rent_payments')
				.select(
					'id, lease_id, tenant_id, stripe_payment_intent_id, amount, currency, status, payment_method_type, period_start, period_end, due_date, paid_date, application_fee_amount, late_fee_amount, created_at, updated_at'
				)
				.eq('tenant_id', tenantId)
				.order('created_at', { ascending: false })
				.limit(limit)

			if (error) {
				this.logger.error('Failed to fetch payment history', {
					error: error.message,
					tenantId
				})
				throw new BadRequestException('Failed to retrieve payment history')
			}

			return (data as RentPayment[]) || []
		} catch (error) {
			if (error instanceof BadRequestException) throw error
			this.logger.error('Error getting payment history', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Fetch payment statuses for multiple tenants in batch
	 */
	async batchFetchPaymentStatuses(
		tenantIds: string[]
	): Promise<Map<string, RentPayment>> {
		if (!tenantIds.length) return new Map()

		try {
			const { data, error } = await this.supabase
				.getAdminClient()
				.from('rent_payments')
				.select('*')
				.in('tenant_id', tenantIds)
				.order('created_at', { ascending: false })
				.limit(tenantIds.length) // One most recent per tenant max

			if (error) {
				this.logger.warn('Failed to fetch payment statuses', {
					error: error.message
				})
				return new Map()
			}

			// Group by tenant_id, keep most recent (first result due to DESC ordering)
			const statusMap = new Map<string, RentPayment>()
			for (const payment of (data as RentPayment[]) || []) {
				if (payment.tenant_id && !statusMap.has(payment.tenant_id)) {
					statusMap.set(payment.tenant_id, payment)
				}
			}

			return statusMap
		} catch (error) {
			this.logger.error('Error fetching payment statuses', {
				error: error instanceof Error ? error.message : String(error)
			})
			return new Map()
		}
	}
}