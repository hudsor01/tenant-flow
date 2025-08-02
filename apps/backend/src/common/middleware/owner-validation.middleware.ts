import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { SecurityAuditService } from '../security/audit.service'

/**
 * Owner validation middleware for multi-tenant data access control
 * Validates that authenticated users can only access their own data
 */
@Injectable()
export class OwnerValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OwnerValidationMiddleware.name)

  constructor(private readonly auditService: SecurityAuditService) {}

  use(req: Request & { user?: { id: string; organizationId: string } }, _res: Response, next: NextFunction) {
    // Skip validation for public routes and health checks
    const publicPaths = ['/health', '/api/docs', '/api/auth/login', '/api/auth/register']
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next()
    }

    // Skip for non-authenticated routes
    const user = req.user
    if (!user) {
      return next() // Let JWT guard handle authentication
    }

    // Extract owner ID from various sources
    const ownerIdFromParams = req.params.ownerId || req.params.organizationId
    const ownerIdFromQuery = req.query.ownerId || req.query.organizationId
    const ownerIdFromBody = req.body?.ownerId || req.body?.organizationId

    const requestedOwnerId = ownerIdFromParams || ownerIdFromQuery || ownerIdFromBody

    // If no owner ID in request, let the controller handle it
    if (!requestedOwnerId) {
      return next()
    }

    // Validate owner access
    if (!this.validateOwnerAccess(user, requestedOwnerId as string, req)) {
      void this.auditService.logSecurityEvent({
        eventType: 'PERMISSION_DENIED' as const,
        userId: user.id,
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        resource: req.path,
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
  private validateOwnerAccess(user: { id: string; organizationId: string }, requestedOwnerId: string, req: Request): boolean {
    // Admin users have access to all data (implement admin role check if needed)
    // For now, strict tenant isolation
    
    // User can only access their own organization's data
    if (user.organizationId !== requestedOwnerId) {
      this.logger.warn(`Cross-tenant access attempt`, {
        userId: user.id,
        userOrganizationId: user.organizationId,
        requestedOwnerId,
        path: req.path,
        method: req.method
      })
      return false
    }

    return true
  }

  /**
   * Extract client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    )?.split(',')[0]?.trim()
  }
}