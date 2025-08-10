import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { FastifyRequest } from 'fastify'

// Enhanced request types for type safety
interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string }
}

interface RequestWithParams extends FastifyRequest {
  params: { id?: string; [key: string]: unknown }
}

interface RequestWithBody extends FastifyRequest {
  body: { id?: string; [key: string]: unknown }
}
import { LoggerService } from '../services/logger.service'
import { Reflector } from '@nestjs/core'

/**
 * App Interceptor
 * 
 * Handles cross-cutting concerns for the application.
 * Provides: Request logging, performance tracking, audit trails
 */
@Injectable()
export class AppInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: LoggerService,
    private readonly reflector: Reflector
  ) {
    this.logger.setContext('AppInterceptor')
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const response = context.switchToHttp().getResponse()
    const handler = context.getHandler()

    // Extract metadata
    const auditAction = this.reflector.get<string>('audit:action', handler)
    const skipLogging = this.reflector.get<boolean>('skipLogging', handler)
    const sensitiveData = this.reflector.get<boolean>('sensitiveData', handler)

    const startTime = Date.now()
    const userId = (request as AuthenticatedRequest).user?.id
    const method = request.method
    const url = request.url

    // Log request start (unless skipped)
    if (!skipLogging) {
      this.logger.debug(`→ ${method} ${url}`, 'HTTP')
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime
        const statusCode = response.statusCode

        // Performance tracking
        if (duration > 1000) {
          this.logger.logPerformance(
            `${method} ${url}`,
            duration,
            { statusCode, userId }
          )
        }

        // Request logging
        if (!skipLogging) {
          this.logger.logRequest(method, url, statusCode, duration, userId)
        }

        // Audit logging
        if (auditAction && userId) {
          this.logAuditEvent(auditAction, request, data, duration)
        }

        // Mask sensitive data in response
        if (sensitiveData && data) {
          this.maskSensitiveFields(data)
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime

        // Log the error with context
        this.logger.logError(
          error,
          `${method} ${url}`,
          userId,
          { duration, requestId: request.id }
        )

        // Don't re-throw here - let the error handler deal with it
        return throwError(() => error)
      })
    )
  }

  private logAuditEvent(
    action: string,
    request: FastifyRequest,
    responseData: Record<string, unknown>,
    duration: number
  ): void {
    const userId = (request as AuthenticatedRequest).user?.id
    const entityType = this.extractEntityType(request.url || '')
    const entityId = this.extractEntityId(request, responseData)

    if (userId && entityType) {
      const changes = this.extractChanges(request.method, (request as RequestWithBody).body || {}, responseData)
      
      this.logger.logAudit(
        action,
        entityType,
        entityId || 'unknown',
        userId,
        {
          ...changes,
          duration,
          ip: request.ip,
          userAgent: request.headers?.['user-agent'] || 'unknown'
        }
      )
    }
  }

  private extractEntityType(url: string): string | null {
    // Extract entity type from URL pattern
    const patterns = [
      { regex: /\/properties/i, type: 'Property' },
      { regex: /\/tenants/i, type: 'Tenant' },
      { regex: /\/units/i, type: 'Unit' },
      { regex: /\/leases/i, type: 'Lease' },
      { regex: /\/maintenance/i, type: 'MaintenanceRequest' },
      { regex: /\/payments/i, type: 'Payment' },
      { regex: /\/users/i, type: 'User' },
      { regex: /\/invoices/i, type: 'Invoice' }
    ]

    for (const pattern of patterns) {
      if (pattern.regex.test(url)) {
        return pattern.type
      }
    }

    return null
  }

  private extractEntityId(request: FastifyRequest, response: Record<string, unknown>): string | null {
    // Try to get ID from params, body, or response
    const params = (request as RequestWithParams).params
    const body = (request as RequestWithBody).body
    return (
      params?.id ||
      body?.id ||
      (response as Record<string, unknown>)?.id as string ||
      ((response as Record<string, unknown>)?.data as Record<string, unknown>)?.id as string ||
      null
    )
  }

  private extractChanges(method: string, body: Record<string, unknown>, response: Record<string, unknown>): Record<string, unknown> {
    switch (method) {
      case 'POST':
        return { created: this.sanitizeData(response) }
      case 'PUT':
      case 'PATCH':
        return { updated: this.sanitizeData(body) }
      case 'DELETE':
        return { deleted: true }
      default:
        return {}
    }
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> | null {
    if (!data) return null

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'bankAccount'
    ]

    const sanitized = { ...data }
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }

  private maskSensitiveFields(data: Record<string, unknown> | Record<string, unknown>[]): void {
    if (!data || typeof data !== 'object') return

    const sensitivePatterns = [
      { field: 'email', mask: (val: string) => val.replace(/(.{2})(.*)(@.*)/, '$1***$3') },
      { field: 'phone', mask: (val: string) => val.replace(/(\d{3})(\d+)(\d{4})/, '$1***$3') },
      { field: 'ssn', mask: () => '***-**-****' },
      { field: 'creditCard', mask: () => '****-****-****-****' }
    ]

    const maskObject = (obj: Record<string, unknown>) => {
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          maskObject(obj[key] as Record<string, unknown>)
        } else {
          for (const pattern of sensitivePatterns) {
            if (key.toLowerCase().includes(pattern.field) && obj[key]) {
              obj[key] = pattern.mask(String(obj[key]))
            }
          }
        }
      }
    }

    if (Array.isArray(data)) {
      data.forEach(maskObject)
    } else {
      maskObject(data)
    }
  }
}