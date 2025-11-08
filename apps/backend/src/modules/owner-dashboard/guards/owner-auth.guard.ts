import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
	Logger
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'

/**
 * OwnerAuthGuard
 *
 * Ensures the authenticated user has the 'OWNER' role.
 * This guard is applied to all owner dashboard routes.
 *
 * Prerequisites:
 * - User must be authenticated (JWT token in request)
 * - User must have role 'OWNER' in the database
 *
 * Usage:
 * @UseGuards(OwnerAuthGuard)
 */
@Injectable()
export class OwnerAuthGuard implements CanActivate {
	private readonly logger = new Logger(OwnerAuthGuard.name)

	constructor(private readonly supabase: SupabaseService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

		// Check if user is authenticated
		if (!request.user?.id) {
			this.logger.warn('Owner dashboard access attempted without authentication')
			throw new UnauthorizedException('Authentication required')
		}

		const userId = request.user.id

		// Get admin client for role verification
		const client = this.supabase.getAdminClient()

		// Fetch user role from database
		const { data: user, error } = await client
			.from('users')
			.select('role')
			.eq('id', userId)
			.single()

		if (error || !user) {
			this.logger.error('Failed to fetch user role', {
				userId,
				error: error?.message
			})
			throw new UnauthorizedException('Unable to verify user permissions')
		}

		// Verify OWNER role
		if (user.role !== 'OWNER') {
			this.logger.warn('Non-owner attempted to access owner dashboard', {
				userId,
				role: user.role
			})
			throw new UnauthorizedException(
				'Owner access required. Please contact support if you need owner privileges.'
			)
		}

		this.logger.log('Owner access granted', { userId })
		return true
	}
}
