import type {
	CallHandler,
	ExecutionContext,
	NestInterceptor
} from '@nestjs/common';
import { Injectable } from '@nestjs/common'
import type { Request } from 'express'
import type { Observable} from 'rxjs';
import { tap } from 'rxjs'
import { performance } from 'node:perf_hooks'
import { AppLogger } from '../logger/app-logger.service'

/**
 * Interceptor to track query/request performance and log slow queries
 *
 * Logs warnings when requests exceed configurable threshold (default 1s)
 * Helps identify N+1 queries and performance bottlenecks
 */
@Injectable()
export class QueryPerformanceInterceptor implements NestInterceptor {
	private readonly slowQueryThresholdMs: number

	constructor(private readonly logger: AppLogger) {
		// Allow configurable threshold via environment variable
		this.slowQueryThresholdMs = process.env.SLOW_QUERY_THRESHOLD_MS
			? parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10)
			: 1000 // Default: 1 second
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>()
		const controller = context.getClass().name
		const handler = context.getHandler().name
		const method = request?.method ?? 'UNKNOWN'
		const route =
			request?.route?.path ?? request?.url ?? 'unknown'

		const startTime = performance.now()

		return next.handle().pipe(
			tap({
				next: () => {
					this.logPerformance(
						startTime,
						controller,
						handler,
						method,
						route
					)
				},
				error: () => {
					// Still log performance even on errors
					this.logPerformance(
						startTime,
						controller,
						handler,
						method,
						route
					)
				}
			})
		)
	}

	private logPerformance(
		startTime: number,
		controller: string,
		handler: string,
		method: string,
		route: string
	): void {
		const durationMs = performance.now() - startTime

		// Always log debug info
		this.logger.debug('Query performance tracked', {
			operation: 'query_performance',
			controller,
			handler,
			method,
			route,
			durationMs
		})

		// Warn if slow
		if (durationMs >= this.slowQueryThresholdMs) {
			this.logger.warn('Slow query detected', {
				operation: 'slow_query_detected',
				controller,
				handler,
				method,
				route,
				durationMs,
				thresholdMs: this.slowQueryThresholdMs
			})
		}
	}
}