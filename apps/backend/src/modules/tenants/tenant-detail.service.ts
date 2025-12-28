/**
 * Tenant Detail Service
 * Handles individual tenant lookups
 * Extracted from TenantQueryService for SRP compliance
 */

import {
	Injectable,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import type {
	Tenant,
	TenantWithLeaseInfo,
	Lease
} from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class TenantDetailService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get user-scoped Supabase client with RLS enforcement
	 * Throws UnauthorizedException if no token provided
	 */
	private requireUserClient(token?: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Batch fetch tenants by IDs - O(1) query instead of O(N)
	 * RLS automatically filters to only tenants the user can access
	 */
	async findByIds(
		tenantIds: string[],
		token: string
	): Promise<Map<string, Tenant>> {
		if (tenantIds.length === 0) return new Map()

		const client = this.requireUserClient(token)
		const { data, error } = await client
			.from('tenants')
			.select(
				'id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at'
			)
			.in('id', tenantIds)

		if (error) {
			this.logger.error('Failed to batch fetch tenants', {
				error: error.message
			})
			throw new NotFoundException('Failed to fetch tenants')
		}

		// Return as Map for O(1) lookups
		return new Map((data ?? []).map(t => [t.id, t as Tenant]))
	}

	/**
	 * Get single tenant by ID
	 */
	async findOne(tenantId: string, token: string): Promise<Tenant> {
		if (!tenantId) throw new Error('Tenant ID required')

		try {
			const client = this.requireUserClient(token)
			const { data, error } = await client
				.from('tenants')
				.select(
					'id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at'
				)
				.eq('id', tenantId)
				.single()

			if (error || !data) {
				throw new NotFoundException(`Tenant ${tenantId} not found`)
			}

			return data as Tenant
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof UnauthorizedException
			)
				throw error
			this.logger.error('Error finding tenant', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Get tenant with all lease details
	 */
	async findOneWithLease(
		tenantId: string,
		token: string
	): Promise<TenantWithLeaseInfo> {
		if (!tenantId) throw new Error('Tenant ID required')

		try {
			const client = this.requireUserClient(token)

			// Get tenant base data
			const tenant = await this.findOne(tenantId, token)

			// Get leases via lease_tenants junction table
			const { data: leaseData, error: leaseError } = await client
				.from('lease_tenants')
				.select(
					`
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
				`
				)
				.eq('tenant_id', tenantId)
				.order('is_primary', { ascending: false })
				.limit(1)

			if (leaseError) {
				this.logger.warn('Failed to fetch tenant leases', {
					error: leaseError.message,
					tenantId
				})
				// Return tenant without lease info
				return {
					...tenant,
					lease: null
				} as unknown as TenantWithLeaseInfo
			}

			const leaseInfo =
				(leaseData as unknown as { lease?: Lease }[] | null)?.[0]?.lease || null

			return {
				...tenant,
				lease: leaseInfo
			} as unknown as TenantWithLeaseInfo
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof UnauthorizedException
			)
				throw error
			this.logger.error('Error finding tenant with leases', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Get tenant by auth user ID
	 */
	async getTenantByAuthUserId(
		authUserId: string,
		token: string
	): Promise<Tenant> {
		if (!authUserId) throw new Error('Auth user ID required')

		try {
			const client = this.requireUserClient(token)
			const { data, error } = await client
				.from('tenants')
				.select(
					'id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at'
				)
				.eq('user_id', authUserId)
				.single()

			if (error || !data) {
				throw new NotFoundException('Tenant not found for auth user')
			}

			return data as Tenant
		} catch (error) {
			if (
				error instanceof NotFoundException ||
				error instanceof UnauthorizedException
			)
				throw error
			this.logger.error('Error finding tenant by auth user', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})
			throw error
		}
	}
}
