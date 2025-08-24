import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getRequestContext } from '../context/request-context';

/**
 * Simple performance logging using NestJS interceptors + Railway logs
 * Replaces 1000+ lines of custom monitoring with native solution
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logTiming(context, startTime, 'success'),
        error: () => this.logTiming(context, startTime, 'error'),
      }),
    );
  }

  private logTiming(context: ExecutionContext, startTime: number, status: string) {
    const duration = Date.now() - startTime;
    const req = context.switchToHttp().getRequest();
    const ctx = getRequestContext();

    // Railway will aggregate these logs automatically
    if (duration > 1000) {
      this.logger.warn(`Slow request: ${req.method} ${req.url} - ${duration}ms`, {
        correlationId: ctx?.correlationId,
        userId: ctx?.userId,
        status,
        duration,
      });
    }
  }
}