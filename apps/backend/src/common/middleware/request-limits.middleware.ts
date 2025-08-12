import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { RequestLimitsService } from '../security/request-limits.service'
import { SecurityMonitorService } from '../security/security-monitor.service'

@Injectable()
export class RequestLimitsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLimitsMiddleware.name)

  constructor(
    private readonly requestLimitsService: RequestLimitsService,
    private readonly securityMonitor: SecurityMonitorService
  ) {}

  use(req: FastifyRequest, res: FastifyReply, next: () => void): void {
    const startTime = Date.now()
    const ip = this.getClientIp(req)
    const userAgent = req.headers['user-agent']
    
    // Track connection
    const connectionResult = this.requestLimitsService.trackConnection(ip)
    if (!connectionResult.allowed) {
      this.logger.warn(`Connection rejected: ${connectionResult.reason}`, {
        ip,
        userAgent,
        connectionCount: connectionResult.connectionCount
      })
      
      void this.securityMonitor.logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip,
        details: {
          operation: 'connection_limit_exceeded',
          reason: connectionResult.reason,
          connectionCount: connectionResult.connectionCount
        }
      })
      
      res.status(429).send({
        error: 'Too Many Connections',
        message: 'Connection limit exceeded',
        statusCode: 429,
        retryAfter: 60
      })
      return
    }

    // Check rate limits
    const rateLimitResult = this.requestLimitsService.checkRateLimit(ip, req.url)
    if (!rateLimitResult.allowed) {
      this.logger.warn(`Rate limit exceeded for IP: ${ip}`, {
        ip,
        endpoint: req.url,
        userAgent,
        reason: rateLimitResult.reason
      })
      
      void this.securityMonitor.logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip,
        endpoint: req.url,
        details: {
          operation: 'rate_limit_exceeded',
          reason: rateLimitResult.reason,
          endpoint: req.url,
          method: req.method
        }
      })
      
      // Add rate limit headers
      res.header('X-RateLimit-Limit', rateLimitResult.remaining.toString())
      res.header('X-RateLimit-Remaining', '0')
      res.header('X-RateLimit-Reset', rateLimitResult.resetTime.getTime().toString())
      res.header('Retry-After', '60')
      
      res.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        statusCode: 429,
        retryAfter: 60
      })
      return
    }

    // Add rate limit headers to successful requests
    res.header('X-RateLimit-Limit', this.requestLimitsService.getRequestLimits().maxBodySize.toString())
    res.header('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    res.header('X-RateLimit-Reset', rateLimitResult.resetTime.getTime().toString())

    // Validate request size
    const bodySize = this.getRequestBodySize(req)
    const headerSize = this.getRequestHeaderSize(req)
    const url = req.url || ''
    
    const sizeValidation = this.requestLimitsService.validateRequestSize(bodySize, headerSize, url)
    if (!sizeValidation.allowed) {
      this.logger.warn(`Request size validation failed: ${sizeValidation.reason}`, {
        ip,
        endpoint: req.url,
        bodySize,
        headerSize,
        urlLength: url.length
      })
      
      void this.securityMonitor.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        ip,
        endpoint: req.url,
        details: {
          operation: 'request_size_exceeded',
          reason: sizeValidation.reason,
          bodySize,
          headerSize,
          urlLength: url.length
        }
      })
      
      this.requestLimitsService.releaseConnection(ip)
      
      res.status(413).send({
        error: 'Payload Too Large',
        message: sizeValidation.reason,
        statusCode: 413
      })
      return
    }

    // Log alerts for large requests
    if (sizeValidation.alerts && sizeValidation.alerts.length > 0) {
      this.logger.warn('Request size alerts', {
        ip,
        endpoint: req.url,
        alerts: sizeValidation.alerts
      })
    }

    // Set up response tracking
    const originalSend = res.send.bind(res)
    let responseSent = false
    const requestLimitsService = this.requestLimitsService
    const logger = this.logger
    
    res.send = function(payload: unknown) {
      if (!responseSent) {
        responseSent = true
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        // Record metrics
        const metrics = {
          timestamp: new Date(startTime),
          endpoint: req.url || '',
          method: req.method,
          bodySize,
          responseTime,
          statusCode: res.statusCode,
          ip,
          userAgent
        }
        
        requestLimitsService.recordRequestMetrics(metrics)
        
        // Release connection
        requestLimitsService.releaseConnection(ip)
        
        // Log request completion
        logger.debug('Request completed', {
          ip,
          method: req.method,
          endpoint: req.url,
          statusCode: res.statusCode,
          responseTime,
          bodySize
        })
      }
      
      return originalSend(payload)
    }

    // Handle connection close/error
    req.socket.on('close', () => {
      if (!responseSent) {
        this.requestLimitsService.releaseConnection(ip)
        this.logger.debug('Connection closed before response', { ip, endpoint: req.url })
      }
    })

    req.socket.on('error', (error) => {
      if (!responseSent) {
        this.requestLimitsService.releaseConnection(ip)
        this.logger.warn('Connection error', { ip, endpoint: req.url, error: error.message })
      }
    })

    next()
  }

  private getClientIp(req: FastifyRequest): string {
    // Check common proxy headers
    const forwardedFor = req.headers['x-forwarded-for']
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0]
      return ips?.trim() || 'unknown'
    }

    const realIp = req.headers['x-real-ip']
    if (realIp && typeof realIp === 'string') {
      return realIp
    }

    const cfConnectingIp = req.headers['cf-connecting-ip']
    if (cfConnectingIp && typeof cfConnectingIp === 'string') {
      return cfConnectingIp
    }

    // Fallback to connection remote address
    return req.ip || req.socket.remoteAddress || 'unknown'
  }

  private getRequestBodySize(req: FastifyRequest): number {
    // For Fastify, we can check the content-length header
    const contentLength = req.headers['content-length']
    if (contentLength) {
      return parseInt(contentLength, 10) || 0
    }
    
    // If body is already parsed and available
    if (req.body) {
      if (typeof req.body === 'string') {
        return Buffer.byteLength(req.body, 'utf8')
      } else if (Buffer.isBuffer(req.body)) {
        return req.body.length
      } else if (typeof req.body === 'object') {
        return Buffer.byteLength(JSON.stringify(req.body), 'utf8')
      }
    }
    
    return 0
  }

  private getRequestHeaderSize(req: FastifyRequest): number {
    // Calculate approximate header size
    let headerSize = 0
    
    // Request line (method + URL + HTTP version)
    headerSize += (req.method || 'GET').length + (req.url || '/').length + 12 // "HTTP/1.1\r\n"
    
    // Headers
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        const headerString = Array.isArray(value) ? value.join(', ') : value.toString()
        headerSize += key.length + headerString.length + 4 // ": \r\n"
      }
    }
    
    headerSize += 2 // Final "\r\n"
    
    return headerSize
  }
}