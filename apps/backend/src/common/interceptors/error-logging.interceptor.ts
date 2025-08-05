import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger
} from '@nestjs/common'
import { Observable, throwError } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'
import * as crypto from 'crypto'

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const { method, url, ip, headers } = request
    const userAgent = headers['user-agent'] || 'unknown'
    const userId = request.user?.id || 'anonymous'
    const startTime = Date.now()

    const requestContext = {
      method,
      url,
      ip,
      userAgent,
      userId,
      requestId: request.id || this.generateRequestId(),
      timestamp: new Date().toISOString()
    }

    // Log incoming request (debug level)
    this.logger.debug(`Incoming ${method} ${url}`, requestContext)

    return next.handle().pipe(
      tap(() => {
        // Log successful request completion
        const duration = Date.now() - startTime
        this.logger.log(
          `${method} ${url} completed successfully in ${duration}ms`,
          { ...requestContext, duration, status: 'success' }
        )
      }),
      catchError((error) => {
        // Log error details before re-throwing
        const duration = Date.now() - startTime
        
        this.logger.error(
          `${method} ${url} failed after ${duration}ms: ${error.message}`,
          {
            ...requestContext,
            duration,
            error: {
              name: error.constructor.name,
              message: error.message,
              stack: error.stack,
              code: error.code || 'UNKNOWN',
              statusCode: error.status || error.statusCode || 500
            }
          }
        )

        // Re-throw the error to be handled by the global exception filter
        return throwError(() => error)
      })
    )
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
  }
}