import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { SecurityAuditService } from '../security/audit.service'
import { SecurityEventType } from '@repo/shared'

/**
 * Audit Logging Interceptor
 * 
 * Automatically logs all data access and modifications for compliance
 * Captures both successful operations and failures
 */
@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private readonly auditService: SecurityAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()
    
    const method = request.method
    const url = request.path
    const userId = request['user']?.id || 'anonymous'
    const ipAddress = request.ip
    const userAgent = request.headers['user-agent']
    const resource = this.extractResourceFromPath(url)
    const action = this.mapMethodToAction(method)

    // Log the data access attempt
    void this.auditService.logSecurityEvent({
      eventType: SecurityEventType.DATA_EXPORT,
      userId,
      ipAddress,
      userAgent,
      resource,
      action: `${action}_attempt`,
      details: JSON.stringify({
        method,
        url,
        userRole: request['user']?.role,
        hasBody: !!request.body,
        queryParams: Object.keys(request.query || {}).length
      })
    })

    const startTime = Date.now()

    return next.handle().pipe(
      tap((data: unknown) => {
        // Log successful operation
        const duration = Date.now() - startTime
        void this.auditService.logSecurityEvent({
          eventType: this.getSuccessEventType(method),
          userId,
          ipAddress,
          userAgent,
          resource,
          action: `${action}_success`,
          details: JSON.stringify({
            method,
            url,
            statusCode: response.statusCode,
            duration,
            resultCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
          })
        })
      }),
      catchError((error) => {
        // Log failed operation
        const duration = Date.now() - startTime
        void this.auditService.logSecurityEvent({
          eventType: SecurityEventType.SYSTEM_ERROR,
          userId,
          ipAddress,
          userAgent,
          resource,
          action: `${action}_failure`,
          details: JSON.stringify({
            method,
            url,
            statusCode: error.status || 500,
            duration,
            error: error.message,
            errorType: error.constructor.name
          })
        })
        throw error
      })
    )
  }

  private extractResourceFromPath(path: string): string {
    // Extract resource name from API path
    const segments = path.split('/').filter(Boolean)
    
    // Skip 'api' and version segments
    const resourceSegments = segments.filter(segment => 
      !segment.startsWith('v') && segment !== 'api'
    )
    
    return resourceSegments[0] || 'unknown'
  }

  private mapMethodToAction(method: string): string {
    const actionMap: Record<string, string> = {
      'GET': 'read',
      'POST': 'create', 
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    }
    
    return actionMap[method] || 'unknown'
  }

  private getSuccessEventType(method: string): SecurityEventType {
    switch (method) {
      case 'GET':
        return SecurityEventType.DATA_EXPORT
      case 'POST':
      case 'PUT':
      case 'PATCH':
        return SecurityEventType.CONFIG_ACCESS
      case 'DELETE':
        return SecurityEventType.ADMIN_ACTION
      default:
        return SecurityEventType.DATA_EXPORT
    }
  }
}