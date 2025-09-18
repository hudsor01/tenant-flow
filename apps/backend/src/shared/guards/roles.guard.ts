import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { UserRole, AuthUser } from '@repo/shared'

interface RequestWithUser {
	user?: AuthUser
	params?: Record<string, string>
	query?: Record<string, string>
	body?: Record<string, unknown>
	ip?: string
	route?: { path?: string }
	method?: string
	get?: (header: string) => string | undefined
}

/**
 * Guard that handles both role-based and admin access control
 * Includes tenant isolation for admin operations
 */
@Injectable()
export class RolesGuard implements CanActivate {
	private readonly logger = new Logger(RolesGuard.name)

	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
			'roles',
			[context.getHandler(), context.getClass()]
		)

		// Check if admin-only access is required
		const adminOnly = this.reflector.getAllAndOverride<boolean>(
			'admin-only',
			[context.getHandler(), context.getClass()]
		)

		const request: RequestWithUser = context.switchToHttp().getRequest()
		const user = request.user

		// Validate user object
		if (!this.isValidUserObject(user)) {
			this.logger.warn('Access denied: Invalid user object', {
				route: request.route?.path ?? 'unknown route',
				method: request.method
			})
			return false
		}

		// Handle admin-only routes
		if (adminOnly) {
			return this.validateAdminAccess(request, user)
		}

		// Handle role-based access
		if (requiredRoles && requiredRoles.length > 0) {
			return requiredRoles.some(role => user.role === role)
		}

		// No specific role requirements
		return true
	}

	private validateAdminAccess(
		request: RequestWithUser,
		user: AuthUser
	): boolean {
		if (user.role !== 'ADMIN') {
			this.logger.warn('Admin access denied: User is not admin', {
				userId: user.id,
				userRole: user.role,
				route: request.route?.path ?? 'unknown route'
			})
			return false
		}

		// Enforce tenant isolation for admin operations (if organizations are implemented)
		if (!this.validateTenantIsolation(request, user)) {
			this.logger.error(
				'Admin access denied: Tenant isolation violation',
				{
					userId: user.id,
					userOrganizationId: user.organizationId ?? null,
					route: request.route?.path ?? 'unknown route',
					ip: request.ip
				}
			)
			return false
		}

		return true
	}

	private validateTenantIsolation(
		request: RequestWithUser,
		user: AuthUser
	): boolean {
		const requestedOrgId = this.extractOrganizationId(request)

		// If no organization context in request, allow (for global operations)
		if (!requestedOrgId) {
			return true
		}

		// If user has no organization ID (current system doesn't have orgs), allow access
		// This maintains backward compatibility while allowing future org implementation
		if (!user.organizationId) {
			return true
		}

		// Ensure admin can only access resources from their own organization
		return requestedOrgId === user.organizationId
	}

	private extractOrganizationId(request: RequestWithUser): string | null {
		// Check URL parameters, query parameters, and request body
		return (
			request.params?.organizationId ??
			request.query?.organizationId ??
			(typeof request.body?.organizationId === 'string'
				? request.body.organizationId
				: null)
		)
	}

	private isValidUserObject(user: unknown): user is AuthUser {
		if (!user || typeof user !== 'object') {
			return false
		}

		const userObj = user as Record<string, unknown>

		return (
			typeof userObj.id === 'string' &&
			typeof userObj.email === 'string' &&
			typeof userObj.role === 'string' &&
			['OWNER', 'MANAGER', 'TENANT', 'ADMIN'].includes(userObj.role)
		)
	}
}
