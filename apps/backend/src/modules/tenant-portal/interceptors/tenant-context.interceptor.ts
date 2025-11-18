import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
	Logger
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'

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
 *   @Get()
 *   async getPayments(@Req() req: AuthenticatedRequest) {
 *     // req.tenantContext available
 *   }
 * }
 * ```
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
	private readonly logger = new Logger(TenantContextInterceptor.name)

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context
			.switchToHttp()
			.getRequest<AuthenticatedRequest>()

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
