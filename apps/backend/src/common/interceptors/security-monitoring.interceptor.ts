import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { FastifyRequest } from 'fastify'
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
    const { method, url, headers, body, query } = request
    const userAgent = headers?.['user-agent'] as string | undefined
    const clientIP = this.getClientIP(request)
    const user = request.user

    // Check for SQL injection patterns in query parameters and headers
    // Avoid false positives by not checking JSON request bodies for legitimate SQL keywords
    const sqlInjectionPatterns = [
      // More specific patterns that are less likely to trigger on legitimate content
      /(\bUNION\b\s+\bSELECT\b|\bUNION\b\s+\bALL\b\s+\bSELECT\b)/i,
      /(\bOR\b\s+\d+\s*=\s*\d+|\bAND\b\s+\d+\s*=\s*\d+)/i,
      /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
      /(--|\/\*.*\*\/|;\s*\bDROP\b|\bDROP\b\s+\bTABLE\b)/i,
      /(\bxp_cmdshell\b|\bsp_executesql\b)/i,
      // Look for SQL in URL parameters specifically
      /[?&][^=]*=.*(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b)/i
    ]

    // Check URL and query parameters more strictly than body content
    const urlAndQuery = JSON.stringify({ url, query })
    
    // Check URL/query parameters for SQL injection
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(urlAndQuery)) {
        void this.auditService.logSuspiciousActivity(
          'SQL injection attempt detected in URL/query',
          user?.id,
          clientIP as string,
          userAgent as string,
          { pattern: pattern.source, requestData: urlAndQuery.substring(0, 500) }
        )
        break
      }
    }

    // Check specific headers for injection attempts (but not all request data)
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'referer', 'user-agent']
    for (const headerName of suspiciousHeaders) {
      const headerValue = headers[headerName] as string
      if (headerValue) {
        for (const pattern of sqlInjectionPatterns) {
          if (pattern.test(headerValue)) {
            void this.auditService.logSuspiciousActivity(
              `SQL injection attempt detected in ${headerName} header`,
              user?.id,
              clientIP as string,
              userAgent as string,
              { pattern: pattern.source, header: headerName, value: headerValue.substring(0, 200) }
            )
            break
          }
        }
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
        void this.auditService.logSecurityEvent({
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
    const suspiciousHeaderNames = ['x-original-url', 'x-rewrite-url', 'x-forwarded-host']
    for (const header of suspiciousHeaderNames) {
      if (headers?.[header]) {
        void this.auditService.logSuspiciousActivity(
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
      if (pattern.test(urlAndQuery)) {
        void this.auditService.logSecurityEvent({
          eventType: SecurityEventType.XSS_ATTEMPT,
          userId: user?.id,
          ipAddress: clientIP,
          userAgent,
          resource: url as string,
          action: method.toLowerCase(),
          details: JSON.stringify({ pattern: pattern.source, requestData: urlAndQuery.substring(0, 500) })
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
  private isSecurityError(error: { status?: number; message?: string }): boolean {
    const securityErrorCodes = [401, 403, 409, 422, 429]
    return securityErrorCodes.includes(error.status ?? 0) ||
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