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
		const userId = request.user?.id

		if (!userId) {
			this.logger.warn('PropertyOwnershipGuard: No user ID in request')
			throw new ForbiddenException('Authentication required')
		}

		// Extract resource IDs from request
		const { tenantId, leaseId, propertyId } = {
			...request.params,
			...request.body,
			...request.query
		}

		// If accessing a specific tenant
		if (tenantId) {
			const ownsResource = await this.verifyTenantOwnership(userId, tenantId)
			if (!ownsResource) {
				this.logger.warn('PropertyOwnershipGuard: Tenant access denied', {
					userId,
					tenantId
				})
				throw new ForbiddenException(
					'You do not have access to this tenant resource'
				)
			}
		}

		// If accessing a specific lease
		if (leaseId) {
			const ownsResource = await this.verifyLeaseOwnership(userId, leaseId)
			if (!ownsResource) {
				this.logger.warn('PropertyOwnershipGuard: Lease access denied', {
					userId,
					leaseId
				})
				throw new ForbiddenException(
					'You do not have access to this lease resource'
				)
			}
		}

		// If accessing a specific property (direct)
		if (propertyId) {
			const ownsResource = await this.verifyPropertyOwnership(
				userId,
				propertyId
			)
			if (!ownsResource) {
				this.logger.warn('PropertyOwnershipGuard: Property access denied', {
					userId,
					propertyId
				})
				throw new ForbiddenException(
					'You do not have access to this property resource'
				)
			}
		}

		return true
	}

	/**
	 * Verify user owns the tenant (through property ownership)
	 */
	private async verifyTenantOwnership(
		userId: string,
		tenantId: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		const { data } = await client
			.from('tenant')
			.select('userId')
			.eq('id', tenantId)
			.single()

		return data?.userId === userId
	}

	/**
	 * Verify user owns the lease (through property ownership)
	 */
	private async verifyLeaseOwnership(
		userId: string,
		leaseId: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		const { data } = await client
			.from('lease')
			.select('property:propertyId(ownerId)')
			.eq('id', leaseId)
			.single()

		return (data as { property: { ownerId: string } | null })?.property?.ownerId === userId
	}

	/**
	 * Verify user owns the property
	 */
	private async verifyPropertyOwnership(
		userId: string,
		propertyId: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		const { data } = await client
			.from('property')
			.select('ownerId')
			.eq('id', propertyId)
			.single()

		return data?.ownerId === userId
	}
}
