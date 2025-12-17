/**
 * Rent Payment Context Service
 * Handles tenant and lease context loading
 * Extracted from RentPaymentsService for SRP compliance
 *
 * Optimized with nested joins per Supabase best practices
 * to avoid N+1 query problems
 */

import {
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { Tenant, User } from './types'

export interface TenantContext {
	tenant: Tenant
	tenantUser: User
}

// Only the fields needed by callers - avoids requiring full Lease type
export interface LeaseContextData {
	id: string
	primary_tenant_id: string
	unit_id: string
	rent_amount: number
	stripe_subscription_id: string | null
}

export interface LeaseContext {
	lease: LeaseContextData
	ownerUser: User
	stripeAccountId: string | null
}

// Type for the nested join query result - includes tenant for authorization
interface LeaseWithOwnerData {
	id: string
	primary_tenant_id: string
	unit_id: string
	rent_amount: number
	stripe_subscription_id: string | null
	tenant: {
		user_id: string
	}
	unit: {
		id: string
		property_id: string
		property: {
			owner_user_id: string
			stripe_connected_account: {
				stripe_account_id: string
			} | null
			owner: User
		}
	}
}

@Injectable()
export class RentPaymentContextService {
	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get tenant context with user details
	 * Uses nested join to fetch tenant + user in single query
	 */
	async getTenantContext(tenant_id: string): Promise<TenantContext> {
		const adminClient = this.supabase.getAdminClient()
		const { data: tenant, error: tenantError } = await adminClient
			.from('tenants')
			.select('*, users!inner(*)')
			.eq('id', tenant_id)
			.single()

		if (tenantError || !tenant) {
			throw new NotFoundException('Tenant not found')
		}

		const tenantUser = (tenant as Tenant & { users: User }).users
		return { tenant: tenant as Tenant, tenantUser }
	}

	/**
	 * Get lease context with owner details and authorization check
	 * Optimized: Single query with nested joins instead of multiple sequential queries
	 * per Supabase documentation best practices
	 */
	async getLeaseContext(
		lease_id: string,
		tenant_id: string,
		requestingUserId: string
	): Promise<LeaseContext> {
		const adminClient = this.supabase.getAdminClient()

		// Single query with nested joins - includes tenant for authorization
		const { data: leaseData, error: leaseError } = await adminClient
			.from('leases')
			.select(`
				id,
				primary_tenant_id,
				unit_id,
				rent_amount,
				stripe_subscription_id,
				tenant:primary_tenant_id (user_id),
				unit:unit_id (
					id,
					property_id,
					property:property_id (
					owner_user_id,
					stripe_connected_account:stripe_connected_account_id (
						stripe_account_id
					),
					owner:owner_user_id (*)
				)
				)
			`)
			.eq('id', lease_id)
			.single()

		if (leaseError || !leaseData) {
			throw new NotFoundException('Lease not found')
		}

		const typedData = leaseData as unknown as LeaseWithOwnerData

		// Validate lease belongs to tenant
		if (typedData.primary_tenant_id !== tenant_id) {
			throw new ForbiddenException('Lease does not belong to tenant')
		}

		// Validate nested data exists
		if (!typedData.unit?.property?.owner) {
			throw new NotFoundException('Property owner not found for lease')
		}

		if (!typedData.tenant?.user_id) {
			throw new NotFoundException('Tenant not found for lease')
		}

		const ownerUser = typedData.unit.property.owner
		const stripeAccountId = typedData.unit.property.stripe_connected_account?.stripe_account_id ?? null

		// Authorization check - no separate query needed, tenant included in join
		const isOwner = ownerUser.id === requestingUserId
		const isTenant = typedData.tenant.user_id === requestingUserId

		if (!isOwner && !isTenant) {
			throw new ForbiddenException('You are not authorized to access this lease')
		}

		// Construct lease object with required fields
		const lease: LeaseContextData = {
			id: typedData.id,
			primary_tenant_id: typedData.primary_tenant_id,
			unit_id: typedData.unit_id,
			rent_amount: typedData.rent_amount,
			stripe_subscription_id: typedData.stripe_subscription_id
		}

		return { lease, ownerUser, stripeAccountId }
	}

	/**
	 * Verify tenant access for requesting user
	 * Security: Verifies ownership through relationship chain per Supabase RLS best practices
	 * - Tenant can access their own data
	 * - Owner can only access tenants on their properties (not any tenant)
	 */
	async verifyTenantAccess(
		requestingUserId: string,
		tenant_id: string
	): Promise<void> {
		const adminClient = this.supabase.getAdminClient()
		const { tenant } = await this.getTenantContext(tenant_id)

		// Tenant accessing their own data
		if (tenant.user_id === requestingUserId) {
			return
		}

		// Owner must own a property that has a lease for this tenant
		// Uses nested join to verify the relationship chain
		const { data: leaseWithOwner, error } = await adminClient
			.from('leases')
			.select(`
				id,
				unit:unit_id (
				property:property_id (
					owner_user_id
				)
			)
			`)
			.eq('primary_tenant_id', tenant_id)
			.limit(1)
			.maybeSingle()

		const ownerUserId = leaseWithOwner?.unit?.property?.owner_user_id

		if (error || ownerUserId !== requestingUserId) {
			throw new ForbiddenException('You are not authorized to access this tenant')
		}
	}
}
