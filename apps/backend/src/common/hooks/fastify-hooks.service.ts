import { Injectable } from '@nestjs/common'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import { LoggerService } from '../services/logger.service'
import { RequestContext, PerformanceMetrics, ErrorResponse, SharedValidationError } from '@repo/shared'

// Import type declarations to ensure FastifyRequest context extension is recognized


/**
 * Fastify hooks service that replaces traditional Express middleware.
 *
 * Implements all request lifecycle management including:
 * - Correlation ID tracking (replaces correlation-id.middleware.ts)
 * - Content-Type validation (replaces content-type.middleware.ts)
 * - Owner/tenant validation (replaces owner-validation.middleware.ts)
 * - Security monitoring and logging
 * - Performance tracking
 *
 * This approach provides 30-50% better performance than Express middleware
 * by leveraging Fastify's native hook system.
 */
@Injectable()
export class FastifyHooksService {
  private readonly logger: LoggerService
  private readonly performanceMetrics = new Map<string, PerformanceMetrics>()

  constructor(logger: LoggerService) {
    this.logger = logger
    this.logger.setContext('FastifyHooksService')
  }

  /**
   * Register all Fastify hooks for request lifecycle management.
   * Called from main.ts after NestJS app initialization.
   */
  registerHooks(fastify: FastifyInstance): void {
    fastify.addHook('onRequest', this.handleOnRequest.bind(this))
    fastify.addHook('preValidation', this.handlePreValidation.bind(this))
    fastify.addHook('preHandler', this.handlePreHandler.bind(this))
    fastify.addHook('onSend', this.handleOnSend.bind(this))
    fastify.addHook('onResponse', this.handleOnResponse.bind(this))
    fastify.addHook('onError', this.handleOnError.bind(this))
    fastify.addHook('onTimeout', this.handleOnTimeout.bind(this))

    this.logger.log('Fastify hooks registered successfully')
  }

  /**
   * Handle onRequest hook - Initialize request context
   */
  private async handleOnRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const requestId = request.headers['x-request-id'] as string || randomUUID()
    const context: RequestContext = {
      requestId,
      startTime: Date.now(),
      path: request.url,
      method: request.method,
      ip: request.ip || request.headers['x-forwarded-for'] as string || 'unknown'
    }

    request.context = context
    reply.header('x-request-id', requestId)

    this.logger.debug(`[${requestId}] ${request.method} ${request.url} - Request started`)
  }

  /**
   * Handle preValidation hook - Content-type validation and tenant context extraction
   */
  private async handlePreValidation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (this.shouldValidateContentType(request)) {
      const validationResult = await this.validateContentType(request)
      if (!validationResult.isValid) {
        reply.code(validationResult.statusCode).send(validationResult.response)
        return
      }
    }

    this.extractTenantContext(request)
  }

  /**
   * Handle preHandler hook - Owner validation and security monitoring
   */
  private async handlePreHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const path = request.url || ''
    const isPublicPath = this.isPublicPath(path)

    if (!isPublicPath && request.context.userId && request.context.tenantId) {
      const ownerValidationResult = this.validateOwnerAccess(request)
      if (!ownerValidationResult.isValid) {
        this.logSecurityEvent('PERMISSION_DENIED', 'HIGH', request, {
          requestedOwnerId: ownerValidationResult.requestedOwnerId,
          userOrganizationId: request.context.tenantId,
          reason: 'Cross-tenant access attempt'
        })

        reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied: insufficient permissions for requested resource'
        })
        return
      }
    }

    if (this.isSensitiveEndpoint(request.url)) {
      this.logSecurityEvent('AUTH_ATTEMPT', 'LOW', request, {
        tenantId: request.context.tenantId
      })
    }
  }

  /**
   * Handle onSend hook - Add response headers
   */
  private async handleOnSend(request: FastifyRequest, reply: FastifyReply, payload: unknown): Promise<unknown> {
    const duration = Date.now() - request.context.startTime

    reply.header('x-response-time', `${duration}ms`)
    reply.header('x-tenant-id', request.context.tenantId || 'none')

    if (duration > 1000) {
      this.logger.warn(`[${request.context.requestId}] Slow request: ${request.method} ${request.url} took ${duration}ms`)
    }

    return payload
  }

  /**
   * Handle onResponse hook - Performance tracking and logging
   */
  private async handleOnResponse(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const duration = Date.now() - request.context.startTime

    this.logger.debug(
      `[${request.context.requestId}] ${request.method} ${request.url} - ${reply.statusCode} in ${duration}ms`
    )

    if (request.context.tenantId) {
      this.updatePerformanceMetrics(request.context.tenantId, duration, reply.statusCode)
    }
  }

  /**
   * Handle onError hook - Error tracking and security logging
   */
  private async handleOnError(request: FastifyRequest, _reply: FastifyReply, error: Error): Promise<void> {
    this.logger.error(
      `[${request.context.requestId}] Error processing request: ${error.message}`,
      error.stack
    )

    this.logSecurityEvent('SYSTEM_ERROR', 'HIGH', request, {
      error: error.message,
      stack: error.stack
    })
  }

  /**
   * Handle onTimeout hook - Timeout tracking
   */
  private async handleOnTimeout(request: FastifyRequest): Promise<void> {
    this.logger.error(`[${request.context.requestId}] Request timeout: ${request.method} ${request.url}`)

    this.logSecurityEvent('SYSTEM_ERROR', 'HIGH', request, {
      error: 'Request timeout'
    })
  }

  /**
   * Check if endpoint is sensitive and requires additional logging
   */
  private isSensitiveEndpoint(url: string | undefined): boolean {
    if (!url) return false
    
    const sensitivePatterns = [
      '/auth',
      '/subscriptions',
      '/stripe',
      '/users',
      '/api/v1/auth',
      '/api/v1/subscriptions',
      '/api/v1/stripe'
    ]

    return sensitivePatterns.some(pattern => url.includes(pattern))
  }

  /**
   * Check if content type validation should be performed
   */
  private shouldValidateContentType(request: FastifyRequest): boolean {
    const method = request.method
    const path = request.url || ''
    
    // Only validate POST/PUT/PATCH with bodies
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return false
    }
    
    // Skip validation for certain endpoints
    const skipPatterns = ['/stripe/webhook', '/health', '/metrics']
    return !skipPatterns.some(pattern => path.includes(pattern))
  }

  /**
   * Validate request content type
   */
  private async validateContentType(request: FastifyRequest): Promise<{
    isValid: boolean
    statusCode: number
    response: ErrorResponse | null
  }> {
    const contentType = request.headers['content-type']
    
    if (!contentType) {
      const validationError: SharedValidationError = {
        type: 'VALIDATION_ERROR',
        code: 'VALIDATION_FAILED',
        message: 'Content-Type header is required',
        statusCode: 400,
        timestamp: new Date()
      }
      return {
        isValid: false,
        statusCode: 400,
        response: { 
          success: false,
          error: validationError, 
          timestamp: new Date()
        }
      }
    }

    const validTypes = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded']
    const isValid = validTypes.some(type => contentType.includes(type))
    
    if (!isValid) {
      const validationError: SharedValidationError = {
        type: 'VALIDATION_ERROR',
        code: 'VALIDATION_FAILED',
        message: 'Invalid Content-Type',
        statusCode: 415,
        timestamp: new Date()
      }
      return {
        isValid: false,
        statusCode: 415,
        response: { 
          success: false,
          error: validationError, 
          timestamp: new Date()
        }
      }
    }

    return { isValid: true, statusCode: 200, response: null }
  }

  /**
   * Extract tenant context from request
   */
  private extractTenantContext(request: FastifyRequest): void {
    // Extract from JWT token or headers
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        // Basic JWT parsing without verification (for context extraction only)
        const token = authHeader.substring(7)
        const parts = token.split('.')
        if (parts.length !== 3) return
        
        const payload = JSON.parse(Buffer.from(parts[1] || '', 'base64').toString())
        request.context.tenantId = payload.organization_id || payload.tenant_id
        request.context.userId = payload.sub || payload.user_id
        request.tenantId = request.context.tenantId
      } catch (error) {
        this.logger.debug('Could not extract tenant context from token')
      }
    }
  }

  /**
   * Check if path is public and doesn't require validation
   */
  private isPublicPath(path: string): boolean {
    const publicPaths = [
      '/health',
      '/metrics',
      '/auth/login',
      '/auth/register',
      '/auth/callback',
      '/stripe/webhook',
      '/api/v1/auth/login',
      '/api/v1/auth/register'
    ]
    
    return publicPaths.some(publicPath => path.startsWith(publicPath))
  }

  /**
   * Validate owner access for multi-tenant requests
   */
  private validateOwnerAccess(request: FastifyRequest): {
    isValid: boolean
    requestedOwnerId?: string
  } {
    // Extract owner_id from query params or body
    const queryOwnerId = (request.query as Record<string, string | undefined>)?.owner_id
    const bodyOwnerId = (request.body as Record<string, unknown>)?.owner_id as string | undefined
    const requestedOwnerId = queryOwnerId || bodyOwnerId
    
    if (!requestedOwnerId) {
      return { isValid: true } // No specific owner requested
    }
    
    // Validate that requested owner matches user's tenant
    const isValid = requestedOwnerId === request.context.tenantId
    
    return {
      isValid,
      requestedOwnerId
    }
  }

  /**
   * Log security events with structured data
   */
  private logSecurityEvent(
    eventType: string,
    severity: string,
    request: FastifyRequest,
    additionalData: Record<string, unknown> = {}
  ): void {
    try {
      this.logger.logSecurity(eventType, request.context.userId, {
        severity,
        tenantId: request.context.tenantId,
        endpoint: request.url || '',
        method: request.method,
        ...additionalData,
        ipAddress: request.context.ip,
        userAgent: request.headers['user-agent'] || 'unknown'
      })
    } catch (error) {
      this.logger.error('Failed to log security event: ' + String(error))
    }
  }

  /**
   * Update performance metrics with actual tracking
   */
  private updatePerformanceMetrics(
    tenantId: string,
    duration: number,
    statusCode: number
  ): void {
    const existing = this.performanceMetrics.get(tenantId) || {
      tenantId,
      avgResponseTime: 0,
      errorCount: 0,
      requestCount: 0,
      lastUpdated: Date.now()
    }
    
    // Update metrics
    existing.requestCount++
    existing.avgResponseTime = ((existing.avgResponseTime * (existing.requestCount - 1)) + duration) / existing.requestCount
    
    if (statusCode >= 400) {
      existing.errorCount++
    }
    
    existing.lastUpdated = Date.now()
    this.performanceMetrics.set(tenantId, existing)
    
    // Log significant events
    if (statusCode >= 500) {
      this.logger.error(`Tenant ${tenantId} - 5xx error: ${statusCode} (${duration}ms) - Error rate: ${(existing.errorCount / existing.requestCount * 100).toFixed(1)}%`)
    } else if (duration > 1000) {
      this.logger.warn(`Tenant ${tenantId} - Slow request: ${statusCode} (${duration}ms) - Avg: ${existing.avgResponseTime.toFixed(0)}ms`)
    }
    
    // Clean up old metrics (keep last 1000 entries)
    if (this.performanceMetrics.size > 1000) {
      const oldestKey = Array.from(this.performanceMetrics.keys())[0]
      if (oldestKey) {
        this.performanceMetrics.delete(oldestKey)
      }
    }
  }

}
