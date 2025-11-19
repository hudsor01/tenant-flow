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
 * Validates that the authenticated user has the TENANT user_type from the database.
 * Works in conjunction with JwtAuthGuard to enforce tenant-only access.
 *
 * Security: Two-layer approach
 * - Layer 1: JwtAuthGuard validates JWT token
 * - Layer 2: TenantAuthGuard validates TENANT user_type from database
 * - Layer 3: RLS policies enforce data access at database level
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, TenantAuthGuard)
 * @Controller('tenants')
 * export class TenantPaymentsController {
 *   @Get()
 *   async getPayments() {
 *     // Only TENANT user_type can access
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
				.from('tenants')
				.select('id, user_id')
				.eq('user_id', user.id)
				.maybeSingle()

			if (error) {
				this.logger.error('Failed to query tenant record', {
					authuser_id: user.id,
					error: error.message
				})
				throw new ForbiddenException('Access denied')
			}

			if (!tenant) {
				this.logger.warn('No tenant record found for authenticated user', {
					authuser_id: user.id
				})
				throw new ForbiddenException('Tenant access required')
			}

			request.tenantContext = {
				tenant_id: tenant.id,
				authuser_id: user.id
			}

			return true
		} catch (error) {
			if (error instanceof ForbiddenException) {
				throw error
			}

			this.logger.error('TenantAuthGuard: Unexpected error', {
				authuser_id: user.id,
				error: error instanceof Error ? error.message : 'Unknown error'
			})

			throw new ForbiddenException('Access denied')
		}
	}
}
