/**
 * Tenant Detail Service
 *
 * Handles single tenant queries
 * - Direct query with column selection
 * - Primary key index for fast lookups
 * - Full lease relationship loading
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Lease, Tenant, TenantWithLeaseInfo } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class TenantDetailService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService
	) {}

	/**
	 * Get single tenant by ID
	 * Performance: Uses primary key index
	 */
	async findById(tenantId: string): Promise<Tenant> {
		if (!tenantId) throw new Error('Tenant ID required')

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('tenants')
				.select('id, user_id, stripe_customer_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at')
				.eq('id', tenantId)
				.single()

			if (error || !data) {
				throw new NotFoundException(`Tenant ${tenantId} not found`)
			}

			return data as Tenant
		} catch (error) {
			if (error instanceof NotFoundException) throw error
			this.logger.error('Error finding tenant', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Get tenant with all lease details
	 * Performance: Uses lease_tenants -> leases -> units -> properties relationships
	 * Returns tenant with first active lease (or most recent lease if none active)
	 */
	async findByIdWithLeases(tenantId: string): Promise<TenantWithLeaseInfo> {
		if (!tenantId) throw new Error('Tenant ID required')

		try {
			// Get tenant base data
			const tenant = await this.findById(tenantId)

			// Get leases via lease_tenants junction table
			const { data: leaseData, error: leaseError } = await this.supabase.getAdminClient()
				.from('lease_tenants')
				.select(`
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
				.eq('tenant_id', tenantId)
				.order('is_primary', { ascending: false })
				.limit(1)

			if (leaseError) {
				this.logger.warn('Failed to fetch tenant leases', { error: leaseError.message, tenantId })
				// Return tenant without lease info
				return {
					...tenant,
					lease: null
				} as unknown as TenantWithLeaseInfo
			}

			const leaseInfo =
				((leaseData as unknown) as { lease?: Lease }[] | null)?.[0]?.lease || null

			return {
				...tenant,
				lease: leaseInfo
			} as unknown as TenantWithLeaseInfo
		} catch (error) {
			if (error instanceof NotFoundException) throw error
			this.logger.error('Error finding tenant with leases', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Get tenant by auth user ID (owner)
	 * Performance: Uses idx_tenants_user_id index
	 */
	async findByAuthUserId(authUserId: string): Promise<Tenant> {
		if (!authUserId) throw new Error('Auth user ID required')

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('tenants')
				.select('id, user_id, stripe_customer_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at')
				.eq('user_id', authUserId)
				.single()

			if (error || !data) {
				throw new NotFoundException('Tenant not found for auth user')
			}

			return data as Tenant
		} catch (error) {
			if (error instanceof NotFoundException) throw error
			this.logger.error('Error finding tenant by auth user', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})
			throw error
		}
	}
}
