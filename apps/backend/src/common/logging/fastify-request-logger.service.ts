import { Injectable, Logger } from '@nestjs/common'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'

/**
 * Fastify Request Logger Service
 * 
 * Provides structured HTTP request/response logging for Fastify applications.
 * Integrates with Fastify's hook system for optimal performance.
 * 
 * Features:
 * - Request correlation IDs
 * - Performance timing
 * - Error request identification
 * - Structured logging for monitoring
 * - IP extraction with proxy support
 * 
 * References:
 * - https://www.fastify.io/docs/latest/Reference/Hooks/
 * - https://docs.nestjs.com/techniques/logger
 */
@Injectable()
export class FastifyRequestLoggerService {
  private readonly logger = new Logger('RequestLogger')

  /**
   * Register request logging hooks with Fastify instance
   */
  registerHooks(fastify: FastifyInstance): void {
    // Add correlation ID to all requests
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = randomUUID()
      request.correlationId = correlationId
      reply.header('X-Correlation-ID', correlationId)
      request.startTime = Date.now()
      
      // Debug-level request start logging
      this.logger.debug('Request started', {
        correlationId,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: this.extractClientIP(request),
        contentLength: request.headers['content-length'],
        contentType: request.headers['content-type']
      })
    })

    // Log completed requests with performance data
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      const duration = request.startTime ? Date.now() - request.startTime : 0
      const statusCode = reply.statusCode
      const isError = statusCode >= 400
      const isSlowRequest = duration > 5000 // 5+ seconds

      const logData = {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        statusCode,
        duration,
        contentLength: reply.getHeader('content-length'),
        ip: this.extractClientIP(request),
        userAgent: request.headers['user-agent']
      }

      if (isError) {
        this.logger.error('Request completed with error', logData)
      } else if (isSlowRequest) {
        this.logger.warn('Slow request detected', { ...logData, slow: true })
      } else {
        this.logger.log('Request completed', logData)
      }
    })

    // Log errors with full context
    fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
      const duration = request.startTime ? Date.now() - request.startTime : 0
      
      this.logger.error('Request error occurred', {
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        duration,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ip: this.extractClientIP(request),
        userAgent: request.headers['user-agent']
      })
    })

    this.logger.log('Request logging hooks registered successfully')
  }

  /**
   * Extract client IP address accounting for proxy headers
   */
  private extractClientIP(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'] as string | undefined
    const realIP = request.headers['x-real-ip'] as string | undefined
    const socketIP = request.socket?.remoteAddress

    if (forwarded && typeof forwarded === 'string') {
      const firstIP = forwarded.split(',')[0]
      return firstIP ? firstIP.trim() : 'unknown'
    }
    
    return realIP || socketIP || 'unknown'
  }
}