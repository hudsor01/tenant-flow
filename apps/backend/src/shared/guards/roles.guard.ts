import {
	CanActivate,
	ExecutionContext,
	Injectable,
	Logger
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { User, UserRole } from '@repo/shared'

interface RequestWithUser {
	user?: User & { organizationId?: string }
	params?: Record<string, string>
	query?: Record<string, string>
	body?: Record<string, unknown>
	ip?: string
	route?: { path?: string }
	method?: string
	get?: (header: string) => string | undefined
}

/**
 * Unified guard that handles both role-based and admin access control
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

		const request = context.switchToHttp().getRequest() as RequestWithUser
		const user = request.user

		// Validate user object
		if (!this.isValidUserObject(user)) {
			this.logger.warn('Access denied: Invalid user object', {
				route: request.route?.path,
				method: request.method
			})
			return false
		}

		// Handle admin-only routes
		if (adminOnly) {
			return this.validateAdminAccess(request, user)
		}

		// Handle role-based access
		if (requiredRoles) {
			return requiredRoles.some(role => user.role === role)
		}

		// No specific role requirements
		return true
	}

	private validateAdminAccess(
		request: RequestWithUser, 
		user: User & { organizationId?: string }
	): boolean {
		if (user.role !== 'ADMIN') {
			this.logger.warn('Admin access denied: User is not admin', {
				userId: user.id,
				userRole: user.role,
				route: request.route?.path
			})
			return false
		}

		// Enforce tenant isolation for admin operations
		if (!this.validateTenantIsolation(request, user)) {
			this.logger.error('Admin access denied: Tenant isolation violation', {
				userId: user.id,
				userOrganizationId: user.organizationId,
				route: request.route?.path,
				ip: request.ip
			})
			return false
		}

		return true
	}

	private validateTenantIsolation(
		request: RequestWithUser,
		user: User & { organizationId?: string }
	): boolean {
		const requestedOrgId = this.extractOrganizationId(request)

		// If no organization context in request, allow (for global operations)
		if (!requestedOrgId) {
			return true
		}

		// Ensure admin can only access resources from their own organization
		return requestedOrgId === user.organizationId
	}

	private extractOrganizationId(request: RequestWithUser): string | null {
		// Check URL parameters, query parameters, and request body
		return request.params?.organizationId ||
			   request.query?.organizationId ||
			   (typeof request.body?.organizationId === 'string' ? request.body.organizationId : null)
	}

	private isValidUserObject(user: unknown): user is User {
		if (!user || typeof user !== 'object') {
			return false
		}

		const userObj = user as Record<string, unknown>
		
		return typeof userObj.id === 'string' && 
			   typeof userObj.email === 'string' && 
			   typeof userObj.role === 'string' &&
			   ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(userObj.role)
	}
}

// Decorator for admin-only routes
export const AdminOnly = () => {
	return (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
		Reflect.defineMetadata('admin-only', true, descriptor.value)
		return descriptor
	}
}
