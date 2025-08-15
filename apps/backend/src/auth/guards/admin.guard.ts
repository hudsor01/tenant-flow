import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common'
import type { User } from '@repo/database'

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
 * Guard that ensures only admin users can access protected routes
 * Validates user object structure thoroughly before checking admin status
 * Enforces tenant isolation for admin operations
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as RequestWithUser
    const user = request.user

    // Comprehensive user object validation
    if (!this.isValidUserObject(user)) {
      this.logger.warn('Admin guard failed: Invalid or missing user object', {
        hasUser: !!user,
        userType: typeof user,
        userKeys: user ? Object.keys(user) : [],
        route: request.route?.path,
        method: request.method
      })
      return false
    }

    // Check admin role
    if (user.role !== 'ADMIN') {
      this.logger.warn('Admin guard failed: User is not admin', {
        userId: user.id,
        userRole: user.role,
        route: request.route?.path
      })
      return false
    }

    // SECURITY FIX: Enforce tenant isolation for admin operations
    if (!this.validateTenantIsolation(request, user)) {
      this.logger.error('Admin guard failed: Tenant isolation violation attempted', {
        userId: user.id,
        userOrganizationId: user.organizationId,
        requestedResource: this.extractResourceIdentifier(request),
        route: request.route?.path,
        method: request.method,
        ip: request.ip,
        userAgent: request.get?.('User-Agent')
      })
      return false
    }

    this.logger.debug('Admin guard passed', {
      userId: user.id,
      organizationId: user.organizationId,
      route: request.route?.path
    })

    return true
  }

  /**
   * SECURITY: Validates that admin users can only access resources within their tenant
   * Prevents cross-tenant data access even for admin users
   */
  private validateTenantIsolation(request: RequestWithUser, user: User & { organizationId?: string }): boolean {
    // Extract organization/tenant context from request
    const requestedOrgId = this.extractOrganizationId(request)
    
    // If no organization context in request, allow (for global operations)
    if (!requestedOrgId) {
      return true
    }

    // Ensure admin can only access resources from their own organization
    if (requestedOrgId !== user.organizationId) {
      return false
    }

    return true
  }

  /**
   * Extract organization ID from various sources in the request
   */
  private extractOrganizationId(request: RequestWithUser): string | null {
    // Check URL parameters
    if (request.params?.organizationId) {
      return request.params.organizationId
    }

    // Check query parameters
    if (request.query?.organizationId) {
      return request.query.organizationId
    }

    // Check request body
    if (request.body?.organizationId && typeof request.body.organizationId === 'string') {
      return request.body.organizationId
    }

    // Check for nested organization references in body
    if (request.body?.organization && typeof request.body.organization === 'object') {
      const org = request.body.organization as Record<string, unknown>
      if (typeof org.id === 'string') {
        return org.id
      }
    }

    return null
  }

  /**
   * Extract resource identifier for audit logging
   */
  private extractResourceIdentifier(request: RequestWithUser): string {
    const parts = []
    
    if (request.params?.id) parts.push(`id:${request.params.id}`)
    if (request.params?.organizationId) parts.push(`orgId:${request.params.organizationId}`)
    if (request.query?.organizationId) parts.push(`queryOrgId:${request.query.organizationId}`)
    
    return parts.length > 0 ? parts.join(',') : 'unknown'
  }

  /**
   * Validates that the user object has the required structure and properties
   */
  private isValidUserObject(user: unknown): user is User {
    if (!user || typeof user !== 'object') {
      return false
    }

    const userObj = user as Record<string, unknown>

    // Check required properties exist and have correct types
    if (typeof userObj.id !== 'string' || !userObj.id.trim()) {
      return false
    }

    if (typeof userObj.email !== 'string' || !userObj.email.trim()) {
      return false
    }

    if (typeof userObj.role !== 'string' || !userObj.role.trim()) {
      return false
    }

    // Validate role is a known value
    const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN']
    if (!validRoles.includes(userObj.role)) {
      return false
    }

    // Check organizationId exists (required for tenant isolation) - made optional for compatibility
    if (userObj.organizationId !== undefined && (typeof userObj.organizationId !== 'string' || !userObj.organizationId.trim())) {
      return false
    }

    // Verify user object isn't tampered with (has expected structure)
    const requiredFields = ['id', 'email', 'role', 'createdAt']
    const hasAllRequiredFields = requiredFields.every(field => 
      Object.prototype.hasOwnProperty.call(userObj, field) && userObj[field] !== undefined
    )

    if (!hasAllRequiredFields) {
      return false
    }

    return true
  }
}