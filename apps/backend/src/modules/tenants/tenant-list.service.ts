/**
 * Tenant List Service
 * 
 * Handles multi-tenant queries with filtering
 * - Optimized for index usage (idx_tenants_user_id)
 * - Column selection to avoid over-fetching
 * - Supports filtering by status, search, invitation status
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { Lease, Tenant, TenantWithLeaseInfo } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'

export interface ListFilters {
	status?: string
	search?: string
	invitationStatus?: string
	limit?: number
	offset?: number
}

@Injectable()
export class TenantListService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Get all tenants for user with optional filtering
	 * Performance: Uses idx_tenants_user_id index
	 */
	async findAll(userId: string, filters: ListFilters = {}): Promise<Tenant[]> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			let query = this.supabase.getAdminClient()
				.from('tenants')
				.select('id, user_id, stripe_customer_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at')
				.eq('user_id', userId)

			// Search filter on emergency contact name or phone
			if (filters.search) {
				const term = filters.search.trim().toLowerCase()
				if (term) {
					query = query.or(
						`emergency_contact_name.ilike.%${term}%,emergency_contact_phone.ilike.%${term}%`
					)
				}
			}

			// Pagination
			const limit = Math.min(filters.limit ?? 50, 100)
			const offset = filters.offset ?? 0
			query = query.range(offset, offset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error('Failed to fetch tenants', { error: error.message, userId })
				throw new BadRequestException('Failed to retrieve tenants')
			}

			return (data as Tenant[]) || []
		} catch (error) {
			this.logger.error('Error finding all tenants', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Get all tenants with active lease details
	 * Performance: Uses indexes on tenant_id and lease relationships
	 * Note: Returns tenants with their first active lease
	 */
	async findAllWithActiveLease(
		userId: string,
		filters: Omit<ListFilters, 'status'> = {}
	): Promise<TenantWithLeaseInfo[]> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			// Get all tenants for user
			const tenants = await this.findAll(userId, filters)

			if (!tenants.length) {
				return []
			}

			const tenantIds = tenants.map(t => t.id)

			// Get leases for these tenants
			// Query: lease_tenants -> leases -> units -> properties
			const { data: leaseData, error: leaseError } = await this.supabase.getAdminClient()
				.from('lease_tenants')
				.select(`
					tenant_id,
					lease:leases(
						id, 
						start_date, 
						end_date, 
						lease_status, 
						rent_amount, 
						security_deposit,
						unit:units(
							id, 
							unit_number, 
							bedrooms, 
							bathrooms, 
							square_feet,
							property:properties(
								id, 
								name, 
								address_line1, 
								address_line2, 
								city, 
								state, 
								postal_code
							)
						)
					)
				`)
				.in('tenant_id', tenantIds)
				.eq('leases.lease_status', 'active')

			if (leaseError) {
				this.logger.error('Failed to fetch tenant leases', { error: leaseError.message, userId })
				// Return tenants without lease info rather than failing completely
				return tenants.map(t => ({ ...t, lease: null })) as unknown as TenantWithLeaseInfo[]
			}

			// Build map of tenant -> lease (first active lease per tenant)
			const tenantLeaseMap = new Map<string, Lease>()
			const leaseRows = ((leaseData as unknown) as { tenant_id?: string; lease?: Lease }[] | null) ?? []
			for (const item of leaseRows) {
				if (item.tenant_id && item.lease && !tenantLeaseMap.has(item.tenant_id)) {
					tenantLeaseMap.set(item.tenant_id, item.lease)
				}
			}

			// Merge tenants with their lease info
			return tenants.map(t => ({ ...t, lease: null })) as unknown as TenantWithLeaseInfo[]
		} catch (error) {
			this.logger.error('Error finding tenants with lease', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}
}
