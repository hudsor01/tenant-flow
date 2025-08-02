import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { SecurityAuditService } from '../security/audit.service'
import { SecurityEventType } from '@tenantflow/shared/types/security'

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
          this.auditService.logSecurityEvent({
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
          this.auditService.logSecurityEvent({
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
        
        throw error
      })
    )
  }

  /**
   * Detect suspicious request patterns
   */
  private detectSuspiciousPatterns(request: any): void {
    const { method, url, headers, body, query } = request
    const userAgent = headers?.['user-agent'] as string | undefined
    const clientIP = this.getClientIP(request)
    const user = request.user

    // Check for SQL injection patterns
    const sqlInjectionPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
      /(\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/|;)/,
      /(\bxp_cmdshell\b|\bsp_executesql\b)/i
    ]

    const requestString = JSON.stringify({ url, body, query })
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(requestString)) {
        this.auditService.logSuspiciousActivity(
          'SQL injection attempt detected',
          user?.id,
          clientIP as string,
          userAgent as string,
          { pattern: pattern.source, requestData: requestString.substring(0, 500) }
        )
        break
      }
    }

    // Check for path traversal attempts
    const pathTraversalPatterns = [
      /\.\./,
      /%2e%2e/i,
      /\.\.\//,
      /\.\.\\/
    ]

    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(url as string) || pattern.test(JSON.stringify(body)) || pattern.test(JSON.stringify(query))) {
        this.auditService.logSecurityEvent({
          eventType: SecurityEventType.PATH_TRAVERSAL,
          userId: user?.id,
          ipAddress: clientIP,
          userAgent,
          resource: url as string,
          action: method.toLowerCase(),
          details: JSON.stringify({ pattern: pattern.source, url, body, query })
        })
        break
      }
    }

    // Check for unusual request headers
    const suspiciousHeaders = ['x-original-url', 'x-rewrite-url', 'x-forwarded-host']
    for (const header of suspiciousHeaders) {
      if (headers?.[header]) {
        this.auditService.logSuspiciousActivity(
          `Suspicious header detected: ${header}`,
          user?.id,
          clientIP as string,
          userAgent as string,
          { header, value: headers[header] }
        )
      }
    }

    // Check for potential XSS patterns in request data
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
    ]

    for (const pattern of xssPatterns) {
      if (pattern.test(requestString)) {
        this.auditService.logSecurityEvent({
          eventType: SecurityEventType.XSS_ATTEMPT,
          userId: user?.id,
          ipAddress: clientIP,
          userAgent,
          resource: url as string,
          action: method.toLowerCase(),
          details: JSON.stringify({ pattern: pattern.source, requestData: requestString.substring(0, 500) })
        })
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
  private isSecurityError(error: any): boolean {
    const securityErrorCodes = [401, 403, 409, 422, 429]
    return securityErrorCodes.includes(error.status) ||
           error.message?.includes('permission') ||
           error.message?.includes('access') ||
           error.message?.includes('forbidden') ||
           error.message?.includes('unauthorized')
  }

  /**
   * Extract resource name from URL
   */
  private extractResource(url: string): string {
    const match = url.match(/\/api\/(?:v\d+\/)?([^/?]+)/)
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
  private getClientIP(request: any): string {
    const ip = (
      request.headers?.['x-forwarded-for'] ||
      request.headers?.['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    ) as string
    return ip?.split(',')[0]?.trim() || 'unknown'
  }
}