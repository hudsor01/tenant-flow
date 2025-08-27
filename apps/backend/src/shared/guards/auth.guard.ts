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
import type { UserRole } from '@repo/shared/types/auth'
import { AuthService } from '../../auth/auth.service'
import type { ValidatedUser } from '@repo/shared/types/auth'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

interface AuthenticatedRequest extends FastifyRequest {
	user?: ValidatedUser
}

/**
 * Auth Guard - handles JWT auth, roles, and organization isolation
 */
@Injectable()
export class AuthGuard implements CanActivate {
	private readonly logger = new Logger(AuthGuard.name)

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
			const user = await this.authService.validateTokenAndGetUser(token)
			request.user = user
			return user
		} catch {
			throw new UnauthorizedException('Invalid authentication token')
		}
	}

	private checkRoleAccess(context: ExecutionContext, user: ValidatedUser): void {
		const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
			context.getHandler(),
			context.getClass()
		])

		if (requiredRoles && user.role && !requiredRoles.includes(user.role as UserRole)) {
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