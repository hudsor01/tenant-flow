/**
 * Rent Payment Context Service
 * Handles tenant and lease context loading
 * Extracted from RentPaymentsService for SRP compliance
 */

import {
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import type { Lease, Tenant, User } from './types'

export interface TenantContext {
	tenant: Tenant
	tenantUser: User
}

export interface LeaseContext {
	lease: Lease
	ownerUser: User
	stripeAccountId: string | null
}

@Injectable()
export class RentPaymentContextService {
	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get tenant context with user details
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
	 */
	async getLeaseContext(
		lease_id: string,
		tenant_id: string,
		requestingUserId: string
	): Promise<LeaseContext> {
		const adminClient = this.supabase.getAdminClient()
		const { data: lease, error: leaseError } = await adminClient
			.from('leases')
			.select('*')
			.eq('id', lease_id)
			.single<Lease>()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		if (lease.primary_tenant_id !== tenant_id) {
			throw new ForbiddenException('Lease does not belong to tenant')
		}

		const { data: unit, error: unitError } = await adminClient
			.from('units')
			.select('id, property_id')
			.eq('id', lease.unit_id)
			.single()

		if (unitError || !unit) {
			throw new NotFoundException('Unit not found for lease')
		}

		const { data: property, error: propertyError } = await adminClient
			.from('properties')
			.select('property_owner_id')
			.eq('id', unit.property_id)
			.single()

		if (propertyError || !property) {
			throw new NotFoundException('Property not found for lease')
		}

		const { data: owner, error: ownerError } = await adminClient
			.from('property_owners')
			.select('user_id, stripe_account_id')
			.eq('id', property.property_owner_id)
			.single()

		if (ownerError || !owner) {
			throw new NotFoundException('Property owner not found')
		}

		const { data: ownerUser, error: ownerUserError } = await adminClient
			.from('users')
			.select('*')
			.eq('id', owner.user_id)
			.single<User>()

		if (ownerUserError || !ownerUser) {
			throw new NotFoundException('Owner user not found')
		}

		const { tenant } = await this.getTenantContext(tenant_id)
		const isOwner = ownerUser.id === requestingUserId
		const isTenant = tenant.user_id === requestingUserId

		if (!isOwner && !isTenant) {
			throw new ForbiddenException('You are not authorized to access this lease')
		}

		return { lease, ownerUser, stripeAccountId: owner.stripe_account_id }
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
