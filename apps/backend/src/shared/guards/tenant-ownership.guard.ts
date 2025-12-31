/**
 * TenantOwnershipGuard - Focused Tenant Ownership Verification
 *
 * Verifies that the authenticated user owns the tenant specified in the request.
 * Tenant ownership is verified through the lease ownership chain:
 * Tenant belongs to Lease, Lease has owner_user_id → users.id
 *
 * Extracts tenant_id from params, body, or query.
 *
 * Usage: @UseGuards(TenantOwnershipGuard)
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AuthRequestCache } from '../services/auth-request-cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { OwnershipGuardBase } from './ownership-guard.base'

@Injectable()
export class TenantOwnershipGuard
	extends OwnershipGuardBase
	implements CanActivate
{
	constructor(
		supabase: SupabaseService,
		authCache: AuthRequestCache,
		logger: AppLogger
	) {
		super(supabase, authCache, logger, 'TenantOwnershipGuard')
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user_id = this.getUserId(request)

		// Extract tenant_id from request
		const tenant_id =
			request.params?.tenant_id ??
			request.params?.id ??
			request.body?.tenant_id ??
			request.body?.id ??
			request.query?.tenant_id

		if (!tenant_id) {
			this.logger.warn('TenantOwnershipGuard: No tenant_id found in request', {
				user_id,
				params: JSON.stringify(request.params || {}),
				query: JSON.stringify(request.query || {}),
				body: JSON.stringify(request.body || {})
			})
			return true // Allow through if no tenant_id - let the controller handle
		}

		await this.assertOwnership(
			`tenant:${tenant_id}:owner:${user_id}`,
			() => this.verifyTenantOwnership(user_id, tenant_id),
			'You do not have access to this tenant resource',
			{ tenant_id, user_id }
		)

		return true
	}

	/**
	 * Verify user owns the tenant (through lease ownership chain)
	 * Tenant belongs to Lease, Lease has owner_user_id → users.id
	 * Note: leases.primary_tenant_id (not tenant_id) references tenants.id
	 */
	private async verifyTenantOwnership(
		user_id: string,
		tenant_id: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		try {
			const { data, error } = await client
				.from('leases')
				.select('owner_user_id')
				.eq('primary_tenant_id', tenant_id)
				.single()

			if (error) {
				this.logger.error(
					'TenantOwnershipGuard: Database error in verifyTenantOwnership',
					{
						user_id,
						tenant_id,
						error: error.message
					}
				)
				return false
			}

			const result = data as unknown as { owner_user_id: string | null }
			const isOwner = result?.owner_user_id === user_id

			this.logger.debug(
				'TenantOwnershipGuard: verifyTenantOwnership result',
				{
					user_id,
					tenant_id,
					isOwner
				}
			)

			return isOwner
		} catch (error) {
			this.logger.error(
				'TenantOwnershipGuard: Unexpected error in verifyTenantOwnership',
				{
					user_id,
					tenant_id,
					error: error instanceof Error ? error.message : String(error)
				}
			)
			return false
		}
	}
}
