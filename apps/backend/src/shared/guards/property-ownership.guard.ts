/**
 * PropertyOwnershipGuard - Focused Property Ownership Verification
 *
 * Verifies that the authenticated user owns the property specified in the request.
 * Extracts property_id from params, body, or query.
 *
 * Usage: @UseGuards(PropertyOwnershipGuard)
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AuthRequestCache } from '../services/auth-request-cache.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { AuthenticatedRequest } from '../types/express-request.types'
import { OwnershipGuardBase } from './ownership-guard.base'

@Injectable()
export class PropertyOwnershipGuard
	extends OwnershipGuardBase
	implements CanActivate
{
	constructor(
		supabase: SupabaseService,
		authCache: AuthRequestCache,
		logger: AppLogger
	) {
		super(supabase, authCache, logger, 'PropertyOwnershipGuard')
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user_id = this.getUserId(request)

		// Extract property_id from request
		const property_id =
			request.params?.property_id ??
			request.params?.id ??
			request.body?.property_id ??
			request.query?.property_id ??
			request.body?.leaseData?.property_id

		if (!property_id) {
			this.logger.warn(
				'PropertyOwnershipGuard: No property_id found in request',
				{
					user_id,
					params: JSON.stringify(request.params || {}),
					query: JSON.stringify(request.query || {}),
					body: JSON.stringify(request.body || {})
				}
			)
			return true // Allow through if no property_id - let the controller handle
		}

		await this.assertOwnership(
			`property:${property_id}:owner:${user_id}`,
			() => this.verifyPropertyOwnership(user_id, property_id),
			'You do not have access to this property resource',
			{ property_id, user_id }
		)

		return true
	}

	/**
	 * Verify user owns the property
	 * Property has owner_user_id → users.id
	 */
	private async verifyPropertyOwnership(
		user_id: string,
		property_id: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		try {
			const { data, error } = await client
				.from('properties')
				.select('owner_user_id')
				.eq('id', property_id)
				.single()

			if (error) {
				this.logger.error(
					'PropertyOwnershipGuard: Database error in verifyPropertyOwnership',
					{
						user_id,
						property_id,
						error: error.message
					}
				)
				return false
			}

			const result = data as unknown as { owner_user_id: string | null }
			const isOwner = result?.owner_user_id === user_id

			this.logger.debug(
				'PropertyOwnershipGuard: verifyPropertyOwnership result',
				{
					user_id,
					property_id,
					isOwner
				}
			)

			return isOwner
		} catch (error) {
			this.logger.error(
				'PropertyOwnershipGuard: Unexpected error in verifyPropertyOwnership',
				{
					user_id,
					property_id,
					error: error instanceof Error ? error.message : String(error)
				}
			)
			return false
		}
	}
}
