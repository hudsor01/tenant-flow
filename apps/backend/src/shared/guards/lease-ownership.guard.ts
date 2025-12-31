/**
 * LeaseOwnershipGuard - Focused Lease Ownership Verification
 *
 * Verifies that the authenticated user owns the lease specified in the request.
 * Extracts lease_id from params, body, or query.
 *
 * Usage: @UseGuards(LeaseOwnershipGuard)
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AuthRequestCache } from '../services/auth-request-cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { OwnershipGuardBase } from './ownership-guard.base'

@Injectable()
export class LeaseOwnershipGuard
	extends OwnershipGuardBase
	implements CanActivate
{
	constructor(
		supabase: SupabaseService,
		authCache: AuthRequestCache,
		logger: AppLogger
	) {
		super(supabase, authCache, logger, 'LeaseOwnershipGuard')
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user_id = this.getUserId(request)

		// Extract lease_id from request
		const lease_id =
			request.params?.lease_id ??
			request.params?.id ??
			request.body?.lease_id ??
			request.body?.id ??
			request.query?.lease_id ??
			request.body?.leaseData?.lease_id

		if (!lease_id) {
			this.logger.warn('LeaseOwnershipGuard: No lease_id found in request', {
				user_id,
				params: JSON.stringify(request.params || {}),
				query: JSON.stringify(request.query || {}),
				body: JSON.stringify(request.body || {})
			})
			return true // Allow through if no lease_id - let the controller handle
		}

		await this.assertOwnership(
			`lease:${lease_id}:owner:${user_id}`,
			() => this.verifyLeaseOwnership(user_id, lease_id),
			'You do not have access to this lease resource',
			{ lease_id, user_id }
		)

		return true
	}

	/**
	 * Verify user owns the lease
	 * Lease has owner_user_id → users.id
	 */
	private async verifyLeaseOwnership(
		user_id: string,
		lease_id: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		try {
			const { data, error } = await client
				.from('leases')
				.select('owner_user_id')
				.eq('id', lease_id)
				.single()

			if (error) {
				this.logger.error(
					'LeaseOwnershipGuard: Database error in verifyLeaseOwnership',
					{
						user_id,
						lease_id,
						error: error.message
					}
				)
				return false
			}

			const result = data as unknown as { owner_user_id: string | null }
			const isOwner = result?.owner_user_id === user_id

			this.logger.debug('LeaseOwnershipGuard: verifyLeaseOwnership result', {
				user_id,
				lease_id,
				isOwner
			})

			return isOwner
		} catch (error) {
			this.logger.error(
				'LeaseOwnershipGuard: Unexpected error in verifyLeaseOwnership',
				{
					user_id,
					lease_id,
					error: error instanceof Error ? error.message : String(error)
				}
			)
			return false
		}
	}
}
