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

// Type for the nested join query result
interface LeaseWithOwnerData {
	id: string
	primary_tenant_id: string
	unit_id: string
	rent_amount: number
	stripe_subscription_id: string | null
	unit: {
		id: string
		property_id: string
		property: {
			property_owner_id: string
			owner: {
				user_id: string
				stripe_account_id: string | null
				user: User
			}
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
	 * Optimized: Single query with nested joins instead of 6 sequential queries
	 * per Supabase documentation best practices
	 */
	async getLeaseContext(
		lease_id: string,
		tenant_id: string,
		requestingUserId: string
	): Promise<LeaseContext> {
		const adminClient = this.supabase.getAdminClient()

		// Single query with nested joins - replaces 5 sequential queries
		const { data: leaseData, error: leaseError } = await adminClient
			.from('leases')
			.select(`
				id,
				primary_tenant_id,
				unit_id,
				rent_amount,
				stripe_subscription_id,
				unit:unit_id (
					id,
					property_id,
					property:property_id (
						property_owner_id,
						owner:property_owner_id (
							user_id,
							stripe_account_id,
							user:user_id (*)
						)
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
		if (!typedData.unit?.property?.owner?.user) {
			throw new NotFoundException('Property owner not found for lease')
		}

		const ownerUser = typedData.unit.property.owner.user
		const stripeAccountId = typedData.unit.property.owner.stripe_account_id

		// Authorization check - separate query for tenant since we need tenant.user_id
		const { tenant } = await this.getTenantContext(tenant_id)
		const isOwner = ownerUser.id === requestingUserId
		const isTenant = tenant.user_id === requestingUserId

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
	 */
	async verifyTenantAccess(
		requestingUserId: string,
		tenant_id: string
	): Promise<void> {
		const adminClient = this.supabase.getAdminClient()
		const { tenant } = await this.getTenantContext(tenant_id)

		if (tenant.user_id === requestingUserId) {
			return
		}

		const { data: owner, error } = await adminClient
			.from('property_owners')
			.select('user_id')
			.eq('user_id', requestingUserId)
			.single()

		if (error || !owner) {
			throw new ForbiddenException('You are not authorized to access this tenant')
		}
	}
}
