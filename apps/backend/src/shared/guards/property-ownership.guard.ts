/**
 * Property Ownership Guard
 *
 * Ensures authenticated users can only access resources (tenants, leases, payments)
 * associated with properties they own.
 *
 * Usage:
 * @UseGuards(AuthGuard, PropertyOwnershipGuard)
 * @Post('tenants/invite')
 * async inviteTenant(@User() owner: AuthenticatedUser) {
 *   // Guaranteed to be the property owner
 * }
 */

import {
	type CanActivate,
	type ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { SupabaseService } from '../../database/supabase.service'

@Injectable()
export class PropertyOwnershipGuard implements CanActivate {
	private readonly logger = new Logger(PropertyOwnershipGuard.name)

	constructor(private readonly supabase: SupabaseService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user_id = request.user?.id

		if (!user_id) {
			this.logger.warn('PropertyOwnershipGuard: No user ID in request')
			throw new ForbiddenException('Authentication required')
		}

		// Extract resource IDs from request (controllers commonly expose them as `id` or nested objects)
		const normalized = {
			tenant_id:
				request.params?.tenant_id ??
				request.params?.id ??
				request.body?.tenant_id ??
				request.body?.id ??
				request.query?.tenant_id,
			lease_id:
				request.params?.lease_id ??
				request.params?.id ??
				request.body?.lease_id ??
				request.body?.id ??
				request.query?.lease_id ??
				request.body?.leaseData?.lease_id,
			property_id:
				request.params?.property_id ??
				request.body?.property_id ??
				request.query?.property_id ??
				request.body?.leaseData?.property_id
		}
		const { tenant_id, lease_id, property_id } = normalized

		// If accessing a specific tenant
		if (tenant_id) {
			const ownsResource = await this.verifyTenantOwnership(user_id, tenant_id)
			if (!ownsResource) {
				this.logger.warn('PropertyOwnershipGuard: Tenant access denied', {
					user_id,
					tenant_id
				})
				throw new ForbiddenException(
					'You do not have access to this tenant resource'
				)
			}
		}

		// If accessing a specific lease
		if (lease_id) {
			const ownsResource = await this.verifyLeaseOwnership(user_id, lease_id)
			if (!ownsResource) {
				this.logger.warn('PropertyOwnershipGuard: Lease access denied', {
					user_id,
					lease_id
				})
				throw new ForbiddenException(
					'You do not have access to this lease resource'
				)
			}
		}

		// If accessing a specific property (direct)
		if (property_id) {
			const ownsResource = await this.verifyPropertyOwnership(
				user_id,
				property_id
			)
			if (!ownsResource) {
				this.logger.warn('PropertyOwnershipGuard: Property access denied', {
					user_id,
					property_id
				})
				throw new ForbiddenException(
					'You do not have access to this property resource'
				)
			}
		}

		return true
	}

	/**
	 * Verify user owns the tenant (through lease → property ownership chain)
	 * Tenant belongs to Lease, Lease belongs to Property, Property has owner_id
	 */
	private async verifyTenantOwnership(
		user_id: string,
		tenant_id: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		// Follow the ownership chain: tenant → lease → property → owner_id
		const { data, error } = await client
			.from('leases')
			.select('property:property_id(property_owner_id)')
			.eq('tenant_id', tenant_id)
			.single()

		if (error) {
			return false
		}

		// Supabase join returns nested object structure
		const result = data as unknown as { property: { property_owner_id: string } | null }
		return result?.property?.property_owner_id === user_id
	}

	/**
	 * Verify user owns the lease (through property ownership)
	 */
	private async verifyLeaseOwnership(
		user_id: string,
		lease_id: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		const { data, error } = await client
			.from('leases')
			.select('property:property_id(owner_id)')
			.eq('id', lease_id)
			.single()

		if (error) {
			return false
		}

		// Supabase join returns nested object structure
		const result = data as unknown as { property: { owner_id: string } | null }
		return result?.property?.owner_id === user_id
	}

	/**
	 * Verify user owns the property
	 */
	private async verifyPropertyOwnership(
		user_id: string,
		property_id: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		const { data } = await client
			.from('properties')
			.select('property_owner_id')
			.eq('id', property_id)
			.single()

		return data?.property_owner_id === user_id
	}
}
