import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { SecurityAuditService } from '../security/audit.service'
import { SecurityEventType } from '@repo/shared'

/**
 * Owner validation middleware for multi-tenant data access control
 * Validates that authenticated users can only access their own data
 */
@Injectable()
export class OwnerValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OwnerValidationMiddleware.name)

  constructor(private readonly auditService: SecurityAuditService) {}

  use(req: FastifyRequest & { user?: { id: string; organizationId: string } }, _res: FastifyReply, next: () => void) {
    // Skip validation for public routes and health checks
    const publicPaths = ['/health', '/api/docs', '/api/auth/login', '/api/auth/register']
    if (publicPaths.some(path => req.url.startsWith(path))) {
      return next()
    }

    // Skip for non-authenticated routes
    const user = req.user
    if (!user) {
      return next() // Let JWT guard handle authentication
    }

    // Extract owner ID from various sources
    const params = req.params as Record<string, string> | undefined
    const query = req.query as Record<string, string> | undefined
    const body = req.body as Record<string, unknown> | undefined
    
    const ownerIdFromParams = params?.ownerId || params?.organizationId
    const ownerIdFromQuery = query?.ownerId || query?.organizationId
    const ownerIdFromBody = body?.ownerId || body?.organizationId

    const requestedOwnerId = ownerIdFromParams || ownerIdFromQuery || ownerIdFromBody

    // If no owner ID in request, let the controller handle it
    if (!requestedOwnerId) {
      return next()
    }

    // Validate owner access
    if (!this.validateOwnerAccess(user, requestedOwnerId as string, req)) {
      void this.auditService.logSecurityEvent({
        eventType: SecurityEventType.PERMISSION_DENIED,
        userId: user.id,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        resource: req.url,
        action: req.method,
        details: JSON.stringify({
          requestedOwnerId,
          userOrganizationId: user.organizationId,
          reason: 'Cross-tenant access attempt'
        })
      })

      throw new ForbiddenException('Access denied: insufficient permissions for requested resource')
    }

    next()
  }

  /**
   * Validate if user has access to the requested owner's data
   */
  private validateOwnerAccess(user: { id: string; organizationId: string }, requestedOwnerId: string, req: FastifyRequest): boolean {
    // Admin users have access to all data (implement admin role check if needed)
    // For now, strict tenant isolation
    
    // User can only access their own organization's data
    if (user.organizationId !== requestedOwnerId) {
      this.logger.warn(`Cross-tenant access attempt`, {
        userId: user.id,
        userOrganizationId: user.organizationId,
        requestedOwnerId,
        path: req.url,
        method: req.method
      })
      return false
    }

    return true
  }

  /**
   * Extract client IP address from request
   */
  private getClientIP(req: FastifyRequest): string {
    const ip = (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.ip ||
      'unknown'
    )
    return ip?.split(',')[0]?.trim() || 'unknown'
  }
}