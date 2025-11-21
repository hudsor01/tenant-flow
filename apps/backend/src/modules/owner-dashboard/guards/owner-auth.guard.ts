import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
	Logger
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'

/**
 * OwnerAuthGuard
 *
 * Ensures the authenticated user has the 'OWNER' user_type.
 * This guard is applied to all owner dashboard routes.
 *
 * Prerequisites:
 * - User must be authenticated (JWT token in request)
 * - User must have user_type 'property_owner' in JWT app_metadata
 *
 * Security:
 * - Reads user_type from JWT token (set via Supabase Custom Access Token Hook)
 * - No database queries - reduces latency and eliminates RLS permission issues
 * - JWT is cryptographically signed by Supabase - cannot be tampered with
 *
 * Usage:
 * @UseGuards(OwnerAuthGuard)
 */
@Injectable()
export class OwnerAuthGuard implements CanActivate {
	private readonly logger = new Logger(OwnerAuthGuard.name)

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

		// Check if user is authenticated
		if (!request.user?.id) {
			this.logger.warn('Owner dashboard access attempted without authentication')
			throw new UnauthorizedException('Authentication required')
		}

		const user_id = request.user.id

		// Get user_type from JWT token (set via Supabase Custom Access Token Hook)
		// No database query needed - already verified and signed by Supabase
		const userType = request.user.app_metadata?.user_type

		if (!userType) {
			this.logger.error('Missing user_type in JWT token', { user_id })
			throw new UnauthorizedException('Unable to verify user permissions')
		}

		// Verify property_owner user_type (matches database constraint)
		if (userType !== 'property_owner') {
			this.logger.warn('Non-owner attempted to access owner dashboard', {
				user_id,
				user_type: userType
			})
			throw new UnauthorizedException(
				'Owner access required. Please contact support if you need owner privileges.'
			)
		}

		this.logger.log('Owner access granted', { user_id })
		return true
	}
}
