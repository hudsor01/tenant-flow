import { Injectable, Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requestContext } from '@fastify/request-context'
import { randomUUID } from 'crypto'
import type { TenantRequestContext } from './request-context.service'
import type { ValidatedUser } from '../../auth/auth.service'
import type { ControllerApiResponse } from '@repo/shared'

interface AuthenticatedRequest extends FastifyRequest {
  user?: ValidatedUser
  // Context populated by onRequest hook
  context: TenantRequestContext
}

/**
 * Unified Fastify Hooks Service
 * 
 * Consolidates all request lifecycle management into targeted, route-safe hooks:
 * - Replaces scattered auth guards
 * - Centralizes error handling
 * - Provides consistent response formatting
 * - Manages tenant isolation
 * - Handles performance monitoring
 */
@Injectable()
export class UnifiedFastifyHooksService {
  private readonly logger = new Logger(UnifiedFastifyHooksService.name)
  private authService?: any // Lazy loaded to prevent circular dependencies

  // Route-specific configurations
  private readonly publicRoutes = new Set([
    '/health', '/health/ping', '/health/ready', '/health/debug',
    '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh',
    '/stripe/webhook', '/webhooks'
  ])

  private readonly sensitiveRoutes = new Set([
    '/api/v1/auth', '/api/v1/stripe', '/api/v1/billing',
    '/api/v1/users', '/api/v1/subscriptions'
  ])

  constructor(
    private readonly moduleRef: ModuleRef) {}

  /**
   * Register all unified hooks in the correct order
   */
  registerHooks(fastify: FastifyInstance): void {
    // 1. onRequest: Early auth and context setup
    fastify.addHook('onRequest', this.handleOnRequest.bind(this))

    // 2. preValidation: Content validation and transformation
    fastify.addHook('preValidation', this.handlePreValidation.bind(this))

    // 3. preHandler: Final authorization and business rules
    fastify.addHook('preHandler', this.handlePreHandler.bind(this))

    // 4. onSend: Response standardization and headers
    fastify.addHook('onSend', this.handleOnSend.bind(this))

    // 5. onResponse: Performance logging
    fastify.addHook('onResponse', this.handleOnResponse.bind(this))

    // 6. onError: Centralized error handling
    fastify.addHook('onError', this.handleOnError.bind(this))

    this.logger.log('Unified Fastify hooks registered successfully')
  }

  /**
   * onRequest: Authentication, context setup, and early security
   */
  private async handleOnRequest(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const req = request as unknown as AuthenticatedRequest

    // Initialize enhanced request context
    await this.initializeRequestContext(req, reply)

    // Early authentication for protected routes
    if (!this.isPublicRoute(req.url)) {
      await this.authenticateRequest(req, reply)
    }

    // Security monitoring
    if (this.isSensitiveRoute(req.url)) {
      this.logSecurityEvent('SENSITIVE_ENDPOINT_ACCESS', 'MEDIUM', req)
    }
  }

  /**
   * preValidation: Content-type validation and request normalization
   */
  private async handlePreValidation(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const req = request as unknown as AuthenticatedRequest

    // Content-type validation for body-containing requests
    if (this.shouldValidateContentType(req)) {
      const validation = this.validateContentType(req)
      if (!validation.isValid) {
        reply.code(validation.statusCode).send({
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: validation.message,
            statusCode: validation.statusCode
          },
          timestamp: new Date().toISOString()
        })
        return
      }
    }

    // Extract and validate tenant context
    this.extractAndValidateTenantContext(req)
  }

  /**
   * preHandler: Final authorization and business rule validation
   */
  private async handlePreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const req = request as unknown as AuthenticatedRequest

    // Skip for public routes
    if (this.isPublicRoute(req.url)) {
      return
    }

    // Tenant isolation validation
    if (req.user && !this.isAdminUser(req.user)) {
      const tenantValidation = this.validateTenantIsolation(req)
      if (!tenantValidation.isValid) {
        this.logSecurityEvent('TENANT_ISOLATION_VIOLATION', 'HIGH', req, {
          requestedTenant: tenantValidation.requestedTenant,
          userTenant: req.user.organizationId
        })

        reply.code(403).send({
          success: false,
          error: {
            code: 'TENANT_ISOLATION_VIOLATION',
            message: 'Cannot access resources from other organizations',
            statusCode: 403
          },
          timestamp: new Date().toISOString()
        })
        return
      }
    }

    // Usage limits validation (integrate with existing guard logic)
    await this.validateUsageLimits(req, reply)
  }

  /**
   * onSend: Response standardization and security headers
   */
  private async handleOnSend(
    request: FastifyRequest,
    reply: FastifyReply,
    payload: unknown
  ): Promise<unknown> {
    const req = request as unknown as AuthenticatedRequest

    // Add standard response headers
    this.addResponseHeaders(req, reply)

    // Standardize response format if not already formatted
    const standardizedPayload = this.standardizeResponse(payload, req, reply)

    // Performance monitoring
    this.trackPerformanceMetrics(req, reply)

    return standardizedPayload
  }

  /**
   * onResponse: Final logging and cleanup
   */
  private async handleOnResponse(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const req = request as unknown as AuthenticatedRequest
    const duration = Date.now() - req.context.startTime

    // Log request completion
    this.logger.debug(
      `[${req.context.correlationId}] ${req.method} ${req.url} - ${reply.statusCode} (${duration}ms)`,
      {
        userId: req.user?.id,
        organizationId: req.user?.organizationId,
        userAgent: req.headers['user-agent']
      }
    )

    // Log slow requests
    if (duration > 1000) {
      this.logger.warn(`Slow request detected: ${req.method} ${req.url} took ${duration}ms`)
    }
  }

  /**
   * onError: Centralized error transformation and logging
   */
  private async handleOnError(
    request: FastifyRequest,
    _reply: FastifyReply,
    error: Error
  ): Promise<void> {
    const req = request as unknown as AuthenticatedRequest

    this.logger.error(
      `[${req.context?.correlationId || 'unknown'}] Request error: ${error.message}`,
      {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.id,
        organizationId: req.user?.organizationId
      }
    )

    // Security event logging for errors
    this.logSecurityEvent('REQUEST_ERROR', 'HIGH', req, {
      error: error.message,
      errorType: error.constructor.name
    })

    // Transform error to standard format (let NestJS handle the rest)
    // This hook primarily logs; NestJS exception filters handle response formatting
  }

  // ========== Private Helper Methods ==========

  private async initializeRequestContext(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const req = request as unknown as AuthenticatedRequest
    const requestId = (req.headers['x-request-id'] as string) || randomUUID()
    const context: TenantRequestContext = {
      correlationId: requestId,
      traceId: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      startTime: Date.now(),
      method: req.method,
      path: req.url,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      timing: { startTime: Date.now() }
    }

    req.context = context
    reply.header('x-request-id', requestId)
    reply.header('x-correlation-id', requestId)

    // Update @fastify/request-context store
    try {
      const store = (requestContext as any).get('store')
      if (store) {
        Object.assign(store as Record<string, unknown>, context)
      }
    } catch (error) {
      this.logger.warn('Failed to update request context store', { error })
    }
  }

  private async authenticateRequest(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {
    const token = this.extractToken(req)

    if (!token) {
      reply.code(401).send({
        success: false,
        error: {
          code: 'MISSING_AUTH_TOKEN',
          message: 'Authentication token is required',
          statusCode: 401
        },
        timestamp: new Date().toISOString()
      })
      return
    }

    try {
      // Lazy load auth service to prevent circular dependencies
      if (!this.authService) {
        const { AuthService } = await import('../../auth/auth.service')
        this.authService = this.moduleRef.get(AuthService, { strict: false })
      }

      const authUser = await this.authService.validateTokenAndGetUser(token)

      req.user = authUser

      // Update context with user info
      req.context.userId = authUser.id
      req.context.organizationId = authUser.organizationId
      req.context.tenantId = authUser.organizationId

    } catch (error) {
      this.logSecurityEvent('AUTH_FAILURE', 'MEDIUM', req, { error: String(error) })

      reply.code(401).send({
        success: false,
        error: {
          code: 'INVALID_AUTH_TOKEN',
          message: 'Invalid authentication token',
          statusCode: 401
        },
        timestamp: new Date().toISOString()
      })
    }
  }

  private shouldValidateContentType(req: AuthenticatedRequest): boolean {
    // Only validate POST/PUT/PATCH with bodies
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return false
    }

    // Skip validation for webhooks and health checks
    const skipPatterns = ['/webhooks', '/stripe/webhook', '/health']
    return !skipPatterns.some(pattern => req.url.includes(pattern))
  }

  private validateContentType(req: AuthenticatedRequest): { 
    isValid: boolean; statusCode: number; message: string 
  } {
    const contentType = req.headers['content-type']

    if (!contentType) {
      return {
        isValid: false,
        statusCode: 400,
        message: 'Content-Type header is required'
      }
    }

    const validTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ]

    const isValid = validTypes.some(type => contentType.includes(type))

    if (!isValid) {
      return {
        isValid: false,
        statusCode: 415,
        message: `Invalid Content-Type. Expected: ${validTypes.join(', ')}`
      }
    }

    return { isValid: true, statusCode: 200, message: 'Valid' }
  }

  private extractAndValidateTenantContext(req: AuthenticatedRequest): void {
    // Context extraction already happens in authentication
    // This is where we could add additional tenant-specific validation
    if (req.user?.organizationId) {
      req.context.organizationId = req.user.organizationId
      req.context.tenantId = req.user.organizationId
    }
  }

  private validateTenantIsolation(req: AuthenticatedRequest): {
    isValid: boolean; requestedTenant?: string
  } {
    // Extract tenant from request params/query/body
    const params = req.params as Record<string, string> | undefined
    const query = req.query as Record<string, string> | undefined
    const body = req.body as Record<string, unknown> | undefined

    const requestedTenant = 
      params?.organizationId ||
      query?.organizationId ||
      query?.owner_id ||
      (typeof body?.organizationId === 'string' ? body.organizationId : undefined) ||
      (typeof body?.owner_id === 'string' ? body.owner_id : undefined)

    // If no specific tenant requested, allow
    if (!requestedTenant) {
      return { isValid: true }
    }

    // Validate against user's organization
    const isValid = requestedTenant === req.user?.organizationId

    return {
      isValid,
      requestedTenant
    }
  }

  private async validateUsageLimits(
    _req: AuthenticatedRequest,
    _reply: FastifyReply
  ): Promise<void> {
    // This would integrate with existing UsageLimitsGuard logic
    // For now, we'll skip this to avoid complexity
    // TODO: Integrate with subscription service for usage limit validation
  }

  private addResponseHeaders(req: AuthenticatedRequest, reply: FastifyReply): void {
    const duration = Date.now() - req.context.startTime

    reply.header('x-response-time', `${duration}ms`)
    reply.header('x-trace-id', req.context.traceId)

    if (req.user?.organizationId) {
      reply.header('x-organization-id', req.user.organizationId)
    }

    // Security headers
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
  }

  private standardizeResponse(
    payload: unknown,
    _req: AuthenticatedRequest,
    reply: FastifyReply
  ): unknown {
    // If payload is already a standard ControllerApiResponse, return as-is
    if (this.isStandardResponse(payload)) {
      return payload
    }

    // If it's an error response from our hooks, return as-is
    if (this.isErrorResponse(payload)) {
      return payload
    }

    // For successful responses, wrap in standard format
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      return {
        success: true,
        data: payload,
        message: 'Request completed successfully',
        timestamp: new Date().toISOString()
      } as ControllerApiResponse
    }

    // For other responses, return as-is
    return payload
  }

  private trackPerformanceMetrics(req: AuthenticatedRequest, _reply: FastifyReply): void {
    const duration = Date.now() - req.context.startTime

    // Log performance metrics for monitoring
    if (req.user?.organizationId) {
      // This could integrate with a metrics service
      this.logger.debug(`Performance: ${req.user.organizationId} - ${req.method} ${req.url} - ${duration}ms`)
    }
  }

  // ========== Utility Methods ==========

  private isPublicRoute(url: string): boolean {
    return this.publicRoutes.has(url) || Array.from(this.publicRoutes).some(route => url.startsWith(route))
  }

  private isSensitiveRoute(url: string): boolean {
    return Array.from(this.sensitiveRoutes).some(route => url.includes(route))
  }

  private isAdminUser(user: ValidatedUser): boolean {
    return user.role === 'ADMIN'
  }

  private extractToken(req: AuthenticatedRequest): string | undefined {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return undefined
    }
    return authHeader.substring(7).trim() || undefined
  }

  private getClientIP(req: FastifyRequest): string {
    const forwardedFor = req.headers['x-forwarded-for']
    const realIP = req.headers['x-real-ip']
    const cfConnectingIP = req.headers['cf-connecting-ip']

    if (forwardedFor) {
      const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]
      return ip?.trim() || 'unknown'
    }

    if (cfConnectingIP) {
      return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] || 'unknown' : cfConnectingIP
    }

    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] || 'unknown' : realIP
    }

    return req.ip || 'unknown'
  }

  private isStandardResponse(payload: unknown): payload is ControllerApiResponse {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'success' in payload &&
      'timestamp' in payload
    )
  }

  private isErrorResponse(payload: unknown): boolean {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'success' in payload &&
      (payload as any).success === false &&
      'error' in payload
    )
  }

  private logSecurityEvent(
    eventType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    req: AuthenticatedRequest,
    additionalData: Record<string, unknown> = {}
  ): void {
    this.logger.warn(`Security Event: ${eventType}`, {
      severity,
      correlationId: req.context?.correlationId,
      userId: req.user?.id,
      organizationId: req.user?.organizationId,
      endpoint: req.url,
      method: req.method,
      ip: req.context?.ip,
      userAgent: req.headers['user-agent'],
      ...additionalData
    })
  }
}
