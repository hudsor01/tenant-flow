import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Logger,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import type { UserRole, ValidatedUser } from '@repo/shared'
import { AuthService } from '../../auth/auth.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

interface AuthenticatedRequest extends FastifyRequest {
	user?: ValidatedUser
}

/**
 * Unified Auth Guard - handles JWT auth, roles, and organization isolation
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
	private readonly logger = new Logger(UnifiedAuthGuard.name)

	constructor(
		private readonly authService: AuthService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

		// Check if route is public
		const isPublic = this.reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()]
		)

		if (isPublic) {
			return true
		}

		// Authenticate user
		const user = await this.authenticateUser(request)

		// Check role-based access
		this.checkRoleAccess(context, user)

		// Check admin-only access
		this.checkAdminAccess(context, user)

		// Validate tenant isolation
		this.validateTenantIsolation(request, user)

		return true
	}

	private async authenticateUser(request: AuthenticatedRequest): Promise<ValidatedUser> {
		const token = this.extractToken(request)

		if (!token) {
			throw new UnauthorizedException('Authentication token is required')
		}

		try {
			const authUser = await this.authService.validateTokenAndGetUser(token)
			// Convert AuthValidatedUser to shared ValidatedUser
			const user: ValidatedUser = {
				id: authUser.id,
				email: authUser.email,
				name: authUser.name,
				role: authUser.role,
				organizationId: authUser.organizationId || undefined,
				stripeCustomerId: authUser.stripeCustomerId || undefined
			}
			request.user = user

			// Populate request context with user information
			this.setUserInRequestContext(user)

			return user
		} catch (_error) {
			throw new UnauthorizedException('Invalid authentication token')
		}
	}

	/**
	 * Set user information in request context store
	 */
	private setUserInRequestContext(user: ValidatedUser): void {
		try {
			// Import here to avoid circular dependencies
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { requestContext } = require('@fastify/request-context')
			const store = requestContext.get('store')
			
			if (store) {
				store.userId = user.id
				store.organizationId = user.organizationId
				store.tenantId = user.organizationId // Backward compatibility
			}
		} catch (error) {
			this.logger.warn('Failed to set user in request context', { error })
		}
	}

	private checkRoleAccess(context: ExecutionContext, user: ValidatedUser): void {
		const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
			context.getHandler(),
			context.getClass()
		])

		if (requiredRoles && user.role && !requiredRoles.includes(user.role)) {
			throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`)
		}
	}

	private checkAdminAccess(context: ExecutionContext, user: ValidatedUser): void {
		const adminOnly = this.reflector.getAllAndOverride<boolean>('admin-only', [
			context.getHandler(),
			context.getClass()
		])

		if (adminOnly && user.role !== 'ADMIN') {
			throw new ForbiddenException('Administrator privileges required')
		}
	}

	private validateTenantIsolation(request: AuthenticatedRequest, user: ValidatedUser): void {
		// Admins can access all tenants
		if (user.role === 'ADMIN') {
			return
		}

		const requestedOrgId = this.extractOrganizationId(request)

		// If no org context in request, allow
		if (!requestedOrgId) {
			return
		}

		// Ensure user can only access their own organization's resources
		if (requestedOrgId !== user.organizationId) {
			this.logger.error('Tenant isolation violation', {
				userId: user.id,
				userOrg: user.organizationId,
				requestedOrg: requestedOrgId
			})
			throw new ForbiddenException('Cannot access resources from other organizations')
		}
	}

	private extractToken(request: AuthenticatedRequest): string | undefined {
		const authHeader = request.headers.authorization
		if (!authHeader?.startsWith('Bearer ')) {
			return undefined
		}
		return authHeader.substring(7).trim() || undefined
	}

	private extractOrganizationId(request: AuthenticatedRequest): string | null {
		const params = request.params as Record<string, string> | undefined
		const query = request.query as Record<string, string> | undefined
		const body = request.body as Record<string, unknown> | undefined

		return (
			params?.organizationId ||
			query?.organizationId ||
			(typeof body?.organizationId === 'string' ? body.organizationId : null)
		)
	}
}