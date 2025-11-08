import {
	CanActivate,
	ExecutionContext,
	Injectable,
	ForbiddenException,
	Logger
} from '@nestjs/common'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { SupabaseService } from '../../../database/supabase.service'

/**
 * Tenant Authentication Guard
 *
 * Validates that the authenticated user has the TENANT role from the database.
 * Works in conjunction with JwtAuthGuard to enforce tenant-only access.
 *
 * Security: Two-layer approach
 * - Layer 1: JwtAuthGuard validates JWT token
 * - Layer 2: TenantAuthGuard validates TENANT role from database
 * - Layer 3: RLS policies enforce data access at database level
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, TenantAuthGuard)
 * @Controller('tenant')
 * export class TenantPaymentsController {
 *   @Get()
 *   async getPayments() {
 *     // Only TENANT role can access
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantAuthGuard implements CanActivate {
	private readonly logger = new Logger(TenantAuthGuard.name)

	constructor(private readonly supabase: SupabaseService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const user = request.user

		if (!user?.id) {
			this.logger.warn('TenantAuthGuard: No authenticated user found')
			throw new ForbiddenException('Authentication required')
		}

		try {
			// Query database for tenant record matching auth user
			const { data: tenant, error } = await this.supabase
				.getAdminClient()
				.from('tenant')
				.select('id, auth_user_id, status')
				.eq('auth_user_id', user.id)
				.maybeSingle()

			if (error) {
				this.logger.error('Failed to query tenant record', {
					authUserId: user.id,
					error: error.message
				})
				throw new ForbiddenException('Access denied')
			}

			if (!tenant) {
				this.logger.warn('No tenant record found for authenticated user', {
					authUserId: user.id
				})
				throw new ForbiddenException('Tenant access required')
			}

			if (tenant.status === 'INACTIVE') {
				this.logger.warn('Inactive tenant attempted access', {
					tenantId: tenant.id,
					authUserId: user.id
				})
				throw new ForbiddenException('Tenant account is inactive')
			}

			// Attach tenant context to request for downstream use
			request.tenantContext = {
				tenantId: tenant.id,
				authUserId: tenant.auth_user_id ?? user.id,
				status: tenant.status ?? 'ACTIVE'
		}

			return true
		} catch (error) {
			if (error instanceof ForbiddenException) {
				throw error
			}

			this.logger.error('TenantAuthGuard: Unexpected error', {
				authUserId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			throw new ForbiddenException('Access denied')
		}
	}
}
