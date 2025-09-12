import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException
} from '@nestjs/common'
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs'

// Simple global timeout to catch unusually slow handlers
// Uses env BACKEND_TIMEOUT_MS or defaults to 15s
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS ?? 15000)

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException())
        }
        return throwError(() => err)
      })
    )
  }
}
