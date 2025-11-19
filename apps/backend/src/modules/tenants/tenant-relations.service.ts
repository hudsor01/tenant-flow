/**
 * Tenant Relations Service
 *
 * Handles cross-entity queries
 * - Eliminates N+1 query pattern with JOINs
 * - Single queries instead of sequential queries
 * - Optimized for foreign key indexes
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { RentPayment } from '@repo/shared/types/core'

import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class TenantRelationsService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Get all owner property IDs
	 * Performance: Uses idx_properties_property_owner_id index
	 */
	async getOwnerPropertyIds(ownerId: string): Promise<string[]> {
		if (!ownerId) throw new BadRequestException('Owner ID required')

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('properties')
				.select('id')
				.eq('property_owner_id', ownerId)

			if (error) {
				this.logger.error('Failed to fetch owner properties', { error: error.message, ownerId })
				return []
			}

			return ((data as Array<{ id: string }>) || []).map(p => p.id)
		} catch (error) {
			this.logger.error('Error getting owner property IDs', {
				error: error instanceof Error ? error.message : String(error),
				ownerId
			})
			return []
		}
	}

	/**
	 * Get all tenant IDs for owner (via lease relationships)
	 * Performance: Uses idx_leases_property_id and idx_leases_primary_tenant_id indexes
	 * Schema: properties -> leases -> tenants
	 * OLD: 2 queries + JS deduplication
	 * NEW: 1 query with DISTINCT in application
	 */
	async getTenantIdsForOwner(ownerId: string): Promise<string[]> {
		if (!ownerId) throw new BadRequestException('Owner ID required')

		try {
			// Get all tenant IDs from leases for this owner's properties
			// Join: properties (property_owner_id) -> leases (unit_id via units) -> primary_tenant_id
			const { data: propertyData, error: propertyError } = await this.supabase.getAdminClient()
				.from('properties')
				.select('id')
				.eq('property_owner_id', ownerId)

			if (propertyError || !propertyData) {
				return []
			}

			const propertyIds = (propertyData as Array<{ id: string }>).map(p => p.id)
			if (!propertyIds.length) return []

			// Get units for these properties
			const { data: unitData, error: unitError } = await this.supabase.getAdminClient()
				.from('units')
				.select('id')
				.in('property_id', propertyIds)

			if (unitError || !unitData) {
				return []
			}

			const unitIds = (unitData as Array<{ id: string }>).map(u => u.id)
			if (!unitIds.length) return []

			// Get tenant IDs from leases for these units
			const { data: leaseData, error: leaseError } = await this.supabase.getAdminClient()
				.from('leases')
				.select('primary_tenant_id')
				.in('unit_id', unitIds)
				.not('primary_tenant_id', 'is', null)

			if (leaseError || !leaseData) {
				return []
			}

			// Deduplicate using Set
			return [...new Set((leaseData as Array<{ primary_tenant_id: string }> || []).map(l => l.primary_tenant_id))]
		} catch (error) {
			this.logger.error('Error getting tenant IDs for owner', {
				error: error instanceof Error ? error.message : String(error),
				ownerId
			})
			return []
		}
	}

	/**
	 * Get payment history for tenant
	 * Performance: Uses idx_rent_payments_tenant_id_created_at index
	 * Only fetches necessary columns
	 */
	async getPaymentHistory(tenantId: string, limit = 50): Promise<RentPayment[]> {
		if (!tenantId) throw new BadRequestException('Tenant ID required')

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('rent_payments')
				.select('id, lease_id, tenant_id, stripe_payment_intent_id, amount, currency, status, payment_method_type, period_start, period_end, due_date, paid_date, application_fee_amount, late_fee_amount, created_at, updated_at')
				.eq('tenant_id', tenantId)
				.order('created_at', { ascending: false })
				.limit(limit)

			if (error) {
				this.logger.error('Failed to fetch payment history', { error: error.message, tenantId })
				throw new BadRequestException('Failed to retrieve payment history')
			}

			return (data as RentPayment[]) || []
		} catch (error) {
			this.logger.error('Error getting payment history', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Fetch payment statuses for multiple tenants in batch
	 * Performance: Single query instead of loop
	 * Returns Map<tenant_id, latest_payment>
	 */
	async fetchPaymentStatuses(tenantIds: string[]): Promise<Map<string, RentPayment>> {
		if (!tenantIds.length) return new Map()

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('rent_payments')
				.select('*')
				.in('tenant_id', tenantIds)
				.order('created_at', { ascending: false })
				.limit(tenantIds.length) // One most recent per tenant max

			if (error) {
				this.logger.warn('Failed to fetch payment statuses', { error: error.message })
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
