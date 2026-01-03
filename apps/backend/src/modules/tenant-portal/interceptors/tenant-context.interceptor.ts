import type {
	NestInterceptor,
	ExecutionContext,
	CallHandler
} from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { tap, type Observable } from 'rxjs'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * Tenant Context attached to Request by TenantAuthGuard
 */
export interface TenantContext {
	tenant_id: string
	authuser_id: string
	status: string
}

/**
 * Tenant Context Interceptor
 *
 * Adds tenant-specific context logging and request duration tracking.
 * Works in conjunction with TenantAuthGuard which attaches the tenantContext.
 *
 * Features:
 * - Logs tenant ID for all requests
 * - Tracks request duration
 * - Provides tenant context for monitoring/debugging
 *
 * @example
 * ```typescript
 * @UseInterceptors(TenantContextInterceptor)
 * @Controller('tenant/payments')
 * export class TenantPaymentsController {
    constructor(private readonly logger: AppLogger) {}

 *   @Get()
 *   async getPayments(@Req() req: AuthenticatedRequest) {
 *     // req.tenantContext available
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
	constructor(private readonly logger: AppLogger) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

		const tenantContext = request.tenantContext
		const method = request.method
		const url = request.url
		const startTime = Date.now()

		// Log request with tenant context
		this.logger.log({
			message: 'Tenant request',
			method,
			url,
			tenant_id: tenantContext?.tenant_id,
			authuser_id: tenantContext?.authuser_id
		})

		return next.handle().pipe(
			tap({
				next: () => {
					const duration = Date.now() - startTime
					this.logger.log({
						message: 'Tenant request completed',
						method,
						url,
						duration,
						tenant_id: tenantContext?.tenant_id
					})
				},
				error: error => {
					const duration = Date.now() - startTime
					this.logger.error({
						message: 'Tenant request failed',
						method,
						url,
						duration,
						tenant_id: tenantContext?.tenant_id,
						error: error.message
					})
				}
			})
		)
	}
}
