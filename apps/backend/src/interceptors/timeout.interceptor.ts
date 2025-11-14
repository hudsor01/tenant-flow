import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
	RequestTimeoutException
} from '@nestjs/common'
import type { Request } from 'express'
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs'
import { AppConfigService } from '../config/app-config.service'

// Simple global timeout to catch unusually slow handlers
// Uses env BACKEND_TIMEOUT_MS or defaults to 15s
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
	private readonly logger = new Logger(TimeoutInterceptor.name)

	constructor(private readonly appConfigService: AppConfigService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<Request>()
		const endpoint = request.url
		const method = request.method
		const timeoutMs = this.appConfigService.getBackendTimeoutMs()

		return next.handle().pipe(
			timeout(timeoutMs),
			catchError((err: unknown) => {
				if (err instanceof TimeoutError) {
					this.logger.warn('Request timeout occurred', {
						endpoint,
						method,
						timeoutMs,
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
