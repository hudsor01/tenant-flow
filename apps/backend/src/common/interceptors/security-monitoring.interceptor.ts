import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { FastifyRequest } from 'fastify'
import { SecurityAuditService } from '../security/audit.service'
import { SecurityEventType } from '@repo/shared'

/**
 * Security monitoring interceptor for tracking sensitive operations and potential threats
 */
@Injectable()
export class SecurityMonitoringInterceptor implements NestInterceptor {
  constructor(private readonly auditService: SecurityAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()
    const startTime = Date.now()

    // Extract request information
    const { method, url, headers, params, query } = request
    const userAgent = headers['user-agent']
    const clientIP = this.getClientIP(request)
    const correlationId = headers['x-correlation-id']
    const user = request.user

    // Monitor suspicious patterns
    this.detectSuspiciousPatterns(request)

    return next.handle().pipe(
      tap((_data) => {
        const duration = Date.now() - startTime

        // Log successful sensitive operations
        if (this.isSensitiveOperation(method, url)) {
          void this.auditService.logSecurityEvent({
            eventType: SecurityEventType.ADMIN_ACTION,
            userId: user?.id,
            ipAddress: clientIP,
            userAgent,
            resource: this.extractResource(url),
            action: method.toLowerCase(),
            details: JSON.stringify({
              correlationId,
              duration,
              statusCode: response.statusCode,
              params: this.sanitizeParams(params),
              query: this.sanitizeQuery(query)
            })
          })
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime

        // Log security-related errors
        if (this.isSecurityError(error)) {
          void this.auditService.logSecurityEvent({
            eventType: SecurityEventType.PERMISSION_DENIED,
            userId: user?.id,
            ipAddress: clientIP,
            userAgent,
            resource: this.extractResource(url),
            action: method.toLowerCase(),
            details: JSON.stringify({
              correlationId,
              duration,
              error: error.message,
              statusCode: error.status || 500,
              params: this.sanitizeParams(params),
              query: this.sanitizeQuery(query)
            })
          })
        }

        return throwError(() => error)
      })
    )
  }

  /**
   * Detect suspicious request patterns
   */
  private detectSuspiciousPatterns(request: FastifyRequest & { user?: { id: string } }): void {
    const requestInfo = this.extractRequestInfo(request)

    this.checkSqlInjection(requestInfo)
    this.checkPathTraversal(requestInfo)
    this.checkSuspiciousHeaders(requestInfo)
    this.checkXssAttempts(requestInfo)
  }
  private checkPathTraversal(requestInfo: ReturnType<typeof this.extractRequestInfo>): void {
    const { urlAndQuery, user, clientIP, userAgent } = requestInfo
    
    const pathTraversalPatterns = [
      /\.\.\/|\.\.\\/g,
      /%2e%2e%2f|%2e%2e%5c/gi,
      /\/etc\/passwd|\/etc\/shadow/i
    ]
    
    this.checkPatterns(pathTraversalPatterns, urlAndQuery, 'Path traversal attempt detected', {
      user,
      clientIP,
      userAgent,
      getDetails: (pattern) => ({ pattern: pattern.source, requestData: urlAndQuery.substring(0, 500) })
    })
  }
  private checkSuspiciousHeaders(requestInfo: ReturnType<typeof this.extractRequestInfo>): void {
    const { headers, user, clientIP, userAgent } = requestInfo
    
    // Check for suspicious header combinations
    if (headers['x-forwarded-for'] && headers['x-real-ip']) {
      const forwardedFor = headers['x-forwarded-for'] as string
      const realIp = headers['x-real-ip'] as string
      
      if (forwardedFor !== realIp) {
        void this.auditService.logSuspiciousActivity(
          'Mismatched IP headers detected',
          user?.id,
          clientIP,
          userAgent as string,
          { forwardedFor, realIp }
        )
      }
    }
  }
  private checkXssAttempts(requestInfo: ReturnType<typeof this.extractRequestInfo>): void {
    const { urlAndQuery, user, clientIP, userAgent } = requestInfo
    
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /<iframe|<frame|<embed|<object/gi
    ]
    
    this.checkPatterns(xssPatterns, urlAndQuery, 'XSS attempt detected', {
      user,
      clientIP,
      userAgent,
      getDetails: (pattern) => ({ pattern: pattern.source, requestData: urlAndQuery.substring(0, 500) })
    })
  }

  private extractRequestInfo(request: FastifyRequest & { user?: { id: string } }) {
    const { method, url, headers, body, query, user } = request
    const userAgent = headers?.['user-agent']
    const clientIP = this.getClientIP(request)

    return {
      method,
      url,
      headers,
      body,
      query,
      user,
      userAgent,
      clientIP,
      urlAndQuery: JSON.stringify({ url, query })
    }
  }

  private checkSqlInjection(requestInfo: ReturnType<typeof this.extractRequestInfo>): void {
    const { urlAndQuery, headers, user, clientIP, userAgent } = requestInfo

    const sqlInjectionPatterns = [
      /(\bUNION\b\s+\bSELECT\b|\bUNION\b\s+\bALL\b\s+\bSELECT\b)/i,
      /(\bOR|AND\b\s+\d+=\d+)/i,
      /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
      /(--|\/\*.*\*\/|;\s*\bDROP\b|\bDROP\b\s+\bTABLE\b)/i,
      /(\bxp_cmdshell\b|\bsp_executesql\b)/i,
      /[?&][^=]*=.*(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b)/i
    ]

    this.checkPatterns(sqlInjectionPatterns, urlAndQuery, 'SQL injection attempt detected in URL/query', {
      user,
      clientIP,
      userAgent,
      getDetails: (pattern) => ({ pattern: pattern.source, requestData: urlAndQuery.substring(0, 500) })
    })

    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'referer', 'user-agent']
    for (const headerName of suspiciousHeaders) {
      const headerValue = headers[headerName] as string
      if (headerValue) {
        this.checkPatterns(sqlInjectionPatterns, headerValue, `SQL injection attempt detected in ${headerName} header`, {
          user,
          clientIP,
          userAgent,
          getDetails: (pattern) => ({ pattern: pattern.source, header: headerName, value: headerValue.substring(0, 200) })
        })
      }
    }
  }

  private checkPatterns(
    patterns: RegExp[],
    content: string,
    message: string,
    options: {
      user?: { id: string },
      clientIP: string,
      userAgent: string | undefined,
      getDetails: (pattern: RegExp) => Record<string, unknown>
    }
  ): void {
    const { user, clientIP, userAgent, getDetails } = options

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        void this.auditService.logSuspiciousActivity(
          message,
          user?.id,
          clientIP,
          userAgent || 'unknown',
          getDetails(pattern)
        )
        break
      }
    }
  }

  /**
   * Check if operation is sensitive and requires logging
   */
  private isSensitiveOperation(method: string, url: string): boolean {
    const sensitiveOperations = [
      { method: 'POST', path: /\/api\/.+/ },
      { method: 'PUT', path: /\/api\/.+/ },
      { method: 'PATCH', path: /\/api\/.+/ },
      { method: 'DELETE', path: /\/api\/.+/ }
    ]

    return sensitiveOperations.some(op =>
      op.method === method.toUpperCase() && op.path.test(url)
    )
  }

  /**
   * Check if error is security-related
   */
  private isSecurityError(error: { status?: number; message?: string }): boolean {
    const securityErrorCodes = [401, 403, 409, 422, 429]
    return (error.status !== undefined && securityErrorCodes.includes(error.status)) ||
           Boolean(error.message?.includes('permission')) ||
           Boolean(error.message?.includes('access')) ||
           Boolean(error.message?.includes('forbidden')) ||
           Boolean(error.message?.includes('unauthorized'))
  }

  /**
   * Extract resource name from URL
   */
  private extractResource(url: string): string {
    const match = RegExp(/\/api\/(?:v\d+\/)?([^/?]+)/).exec(url)
    return match?.[1] ?? 'unknown'
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    if (!params) return {}

    const sanitized = { ...params }
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth']

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]'
      }
    }

    return sanitized
  }

  /**
   * Sanitize query parameters for logging
   */
  private sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
    return this.sanitizeParams(query)
  }

  /**
   * Extract client IP address
   */
  private getClientIP(request: FastifyRequest): string {
    const ip = (
      request.headers?.['x-forwarded-for'] ||
      request.headers?.['x-real-ip'] ||
      request.ip ||
      'unknown'
    ) as string
    return ip?.split(',')[0]?.trim() || 'unknown'
  }
}
