import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  RequestTimeoutException
} from '@nestjs/common'
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs'

// Simple global timeout to catch unusually slow handlers
// Uses env BACKEND_TIMEOUT_MS or defaults to 15s
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name)
  private readonly timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || (() => {
    throw new Error('BACKEND_TIMEOUT_MS environment variable is required')
  })())

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const endpoint = request.url
    const method = request.method

    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          this.logger.warn('Request timeout occurred', {
            endpoint,
            method,
            timeoutMs: this.timeoutMs,
            userAgent: request.headers['user-agent'],
            ip: request.ip
          })
          return throwError(() => new RequestTimeoutException())
        }
        return throwError(() => err)
      })
    )
  }
}
