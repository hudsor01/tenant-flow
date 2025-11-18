import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { RequestWithUser, authUser } from '@repo/shared/types/auth'

/**
 * Guard that handles both user_type-based and admin access control
 * Includes tenant isolation for admin operations
 */
@Injectable()
export class user_typesGuard implements CanActivate {
	private readonly logger = new Logger(user_typesGuard.name)

	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requireduser_types = this.reflector.getAllAndOverride<string[]>(
			'user_types',
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

		// Handle user_type-based access
		const requiredRoles = Array.isArray(requireduser_types) ? requireduser_types : []
		if (requiredRoles.length > 0) {
			const userType = this.getUserType(user)
			if (!userType) {
				this.logger.warn('Access denied: Missing user_type metadata', {
					user_id: user.id,
					route: request.route?.path ?? 'unknown route'
				})
				return false
			}

			return requiredRoles.some(requiredRole => {
				if (userType !== requiredRole) {
					return false
				}

				if (
					this.requiresDatabaseVerifieduser_type(requiredRole) &&
					!this.hasVerifiedOwnerPrivileges(user)
				) {
					this.logger.warn('Access denied: elevated user_type not verified via database lookup', {
						user_id: user.id,
						requesteduser_type: requiredRole,
						user_typeVerificationStatus: this.getuser_typeVerificationStatus(user),
						route: request.route?.path ?? 'unknown route'
					})
					return false
				}

				return true
			})
		}

		// No specific user_type requirements
		return true
	}

	private validateAdminAccess(
		request: RequestWithUser,
		user: authUser
	): boolean {
		const userType = (user.app_metadata?.user_type) as string | undefined
		if (userType !== 'ADMIN') {
			this.logger.warn('Admin access denied: User is not admin', {
				user_id: user.id,
				userType: (user.app_metadata?.user_type),
				route: request.route?.path ?? 'unknown route'
			})
			return false
		}

		if (!this.hasVerifiedOwnerPrivileges(user)) {
			this.logger.warn('Admin access denied: user_type not verified via database lookup', {
				user_id: user.id,
				user_typeVerificationStatus: this.getuser_typeVerificationStatus(user),
				route: request.route?.path ?? 'unknown route'
			})
			return false
		}

		// Enforce tenant isolation for admin operations (if organizations are implemented)
		if (!this.validateTenantIsolation(request, user)) {
			this.logger.error(
				'Admin access denied: Tenant isolation violation',
				{
					user_id: user.id,
					userOrganizationId: (user as authUser & { organizationId?: string }).organizationId ?? null,
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
		user: authUser
	): boolean {
		const requestedOrgId = this.extractOrganizationId(request)

		// If no organization context in request, allow (for global operations)
		if (!requestedOrgId) {
			return true
		}

		// If user has no organization ID (current system doesn't have orgs), allow access
		// This maintains backward compatibility while allowing future org implementation
		const userWithOrg = user as authUser & { organizationId?: string }
		if (!userWithOrg.organizationId) {
			return true
		}

		// Ensure admin can only access resources from their own organization
		return requestedOrgId === userWithOrg.organizationId
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

	private isValidUserObject(user: unknown): user is authUser {
		if (!user || typeof user !== 'object') {
			return false
		}

		const userObj = user as Record<string, unknown>
		const userType = (userObj.app_metadata as Record<string, unknown>)?.user_type

		return (
			typeof userObj.id === 'string' &&
			typeof userObj.email === 'string' &&
			typeof userType === 'string' &&
			['OWNER', 'MANAGER', 'TENANT', 'ADMIN'].includes(userType as string)
		)
	}

	private requiresDatabaseVerifieduser_type(requiredRole: string): boolean {
		return requiredRole === 'OWNER' || requiredRole === 'ADMIN'
	}

	private hasVerifiedOwnerPrivileges(user: authUser): boolean {
		const metadata = this.getuser_typeVerificationMetadata(user)
		return metadata.user_typeVerificationStatus === 'database' || metadata.user_typeVerified === true
	}

	private getuser_typeVerificationStatus(user: authUser): string | undefined {
		return this.getuser_typeVerificationMetadata(user).user_typeVerificationStatus
	}

	private getuser_typeVerificationMetadata(
		user: authUser
	): { user_typeVerificationStatus?: string; user_typeVerified?: boolean } {
		const appMetadata = (user.app_metadata as Record<string, unknown>) ?? {}
		return {
			user_typeVerificationStatus: (appMetadata.user_typeVerificationStatus as string) ?? undefined,
			user_typeVerified: (appMetadata.user_typeVerified as boolean) ?? undefined
		}
	}

	private getUserType(user: authUser): string | undefined {
		const appMetadata = user.app_metadata as { user_type?: string } | undefined
		const maybeType = appMetadata?.user_type
		return typeof maybeType === 'string' ? maybeType : undefined
	}
}
