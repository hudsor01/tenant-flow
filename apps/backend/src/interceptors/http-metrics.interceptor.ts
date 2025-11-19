import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { Observable, tap } from 'rxjs'
import { performance } from 'node:perf_hooks'
import { MetricsService } from '../modules/metrics/metrics.service'

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
	constructor(private readonly metricsService: MetricsService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>()
		const response = context.switchToHttp().getResponse<Response>()
		const method = request?.method ?? 'UNKNOWN'
		const route =
			request?.route?.path ?? request?.originalUrl ?? request?.url ?? 'unknown'
		const startTime = performance.now()

		const record = (statusCode: number) => {
			const durationMs = performance.now() - startTime
			this.metricsService.recordHttpRequest(method, route, statusCode, durationMs)
		}

		return next.handle().pipe(
			tap({
				next: () => {
					record(response?.statusCode ?? 200)
				},
				error: (error: unknown) => {
					const statusCode =
						typeof (error as { getStatus?: () => number })?.getStatus ===
						'function'
							? (error as { getStatus: () => number }).getStatus()
							: typeof (error as { status?: number }).status === 'number'
								? (error as { status: number }).status
								: response?.statusCode ?? 500
					record(statusCode)
					throw error
				}
			})
		)
	}
}
