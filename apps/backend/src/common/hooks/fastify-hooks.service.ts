import { Injectable, Logger } from '@nestjs/common'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { SecurityEventType, SecurityEventSeverity } from '@tenantflow/shared'

export interface RequestContext {
  requestId: string
  tenantId?: string
  userId?: string
  startTime: number
  path: string
  method: string
  ip: string
}

declare module 'fastify' {
  interface FastifyRequest {
    context: RequestContext
    tenantId?: string
  }
}

@Injectable()
export class FastifyHooksService {
  private readonly logger = new Logger(FastifyHooksService.name)
  
  constructor(
    private readonly securityMonitor: SecurityMonitorService
  ) {}

  /**
   * Register all Fastify hooks for request lifecycle management
   */
  registerHooks(fastify: FastifyInstance): void {
    // 1. onRequest - First hook, add request ID and start timing
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
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
      
      // Log request start
      this.logger.debug(`[${requestId}] ${request.method} ${request.url} - Request started`)
    })

    // 2. preValidation - Extract tenant context from JWT
    fastify.addHook('preValidation', async (request: FastifyRequest) => {
      // Extract tenant ID from authenticated user
      if ((request as { user?: { id: string; organizationId: string } }).user) {
        const user = (request as unknown as { user: { id: string; organizationId: string } }).user
        request.context.userId = user.id
        request.context.tenantId = user.organizationId
        request.tenantId = user.organizationId
        
        this.logger.debug(`[${request.context.requestId}] Tenant context set: ${request.tenantId}`)
      }
    })

    // 3. preHandler - Security checks and rate limiting context
    fastify.addHook('preHandler', async (request: FastifyRequest) => {
      // Log security event for sensitive endpoints
      if (this.isSensitiveEndpoint(request.url)) {
        await this.securityMonitor.logSecurityEvent({
          type: SecurityEventType.AUTH_ATTEMPT,
          severity: SecurityEventSeverity.LOW,
          userId: request.context.userId,
          ipAddress: request.context.ip,
          metadata: {
            path: request.url,
            method: request.method,
            tenantId: request.context.tenantId,
            requestId: request.context.requestId
          }
        })
      }
    })

    // 4. onSend - Add response headers and log completion
    fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
      const duration = Date.now() - request.context.startTime
      
      // Add performance headers
      reply.header('x-response-time', `${duration}ms`)
      reply.header('x-tenant-id', request.context.tenantId || 'none')
      
      // Log slow requests
      if (duration > 1000) {
        this.logger.warn(`[${request.context.requestId}] Slow request: ${request.method} ${request.url} took ${duration}ms`)
      }
      
      return payload
    })

    // 5. onResponse - Final logging
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const duration = Date.now() - request.context.startTime
      
      this.logger.debug(
        `[${request.context.requestId}] ${request.method} ${request.url} - ${reply.statusCode} in ${duration}ms`
      )
      
      // Track performance metrics
      if (request.context.tenantId) {
        await this.trackPerformanceMetrics(request.context.tenantId, duration, reply.statusCode)
      }
    })

    // 6. onError - Error tracking
    fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
      this.logger.error(
        `[${request.context.requestId}] Error processing request: ${error.message}`,
        error.stack
      )
      
      // Log security event for errors
      await this.securityMonitor.logSecurityEvent({
        type: SecurityEventType.SYSTEM_ERROR,
        severity: SecurityEventSeverity.HIGH,
        userId: request.context.userId,
        ipAddress: request.context.ip,
        metadata: {
          path: request.url,
          method: request.method,
          error: error.message,
          stack: error.stack,
          requestId: request.context.requestId,
          tenantId: request.context.tenantId
        }
      })
    })

    // 7. onTimeout - Timeout tracking
    fastify.addHook('onTimeout', async (request: FastifyRequest) => {
      this.logger.error(`[${request.context.requestId}] Request timeout: ${request.method} ${request.url}`)
      
      await this.securityMonitor.logSecurityEvent({
        type: SecurityEventType.SYSTEM_ERROR,
        severity: SecurityEventSeverity.HIGH,
        userId: request.context.userId,
        ipAddress: request.context.ip,
        metadata: {
          path: request.url,
          method: request.method,
          error: 'Request timeout',
          requestId: request.context.requestId,
          tenantId: request.context.tenantId
        }
      })
    })

    this.logger.log('Fastify hooks registered successfully')
  }

  /**
   * Check if endpoint is sensitive and requires additional logging
   */
  private isSensitiveEndpoint(url: string): boolean {
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
   * Track performance metrics per tenant
   */
  private async trackPerformanceMetrics(
    tenantId: string, 
    duration: number, 
    statusCode: number
  ): Promise<void> {
    // This could be expanded to store metrics in a time-series database
    // For now, we'll just log it
    if (statusCode >= 500) {
      this.logger.error(`Tenant ${tenantId} - 5xx error: ${statusCode} (${duration}ms)`)
    } else if (statusCode >= 400) {
      this.logger.warn(`Tenant ${tenantId} - 4xx error: ${statusCode} (${duration}ms)`)
    }
  }
}