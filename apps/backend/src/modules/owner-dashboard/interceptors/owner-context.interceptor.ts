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
 * OwnerContextInterceptor
 *
 * Enriches the request context with owner-specific metadata.
 * Logs all owner dashboard requests for audit and monitoring purposes.
 *
 * Context added:
 * - Owner ID
 * - Request timestamp
 * - Route path
 * - HTTP method
 *
 * Usage:
 * @UseInterceptors(OwnerContextInterceptor)
 */
@Injectable()
export class OwnerContextInterceptor implements NestInterceptor {
	private readonly logger = new Logger(OwnerContextInterceptor.name)

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const { method, url, user } = request

		const ownerId = user?.id
		const timestamp = new Date().toISOString()

		// Enrich request with owner context
		request.ownerContext = {
			ownerId: ownerId || 'unknown',
			timestamp,
			route: url,
			method
		}

		this.logger.log('Owner dashboard request', {
			ownerId,
			method,
			route: url,
			timestamp
		})

		const startTime = Date.now()

		return next.handle().pipe(
			tap({
				next: () => {
					const duration = Date.now() - startTime
					this.logger.log('Owner dashboard response', {
						ownerId,
						method,
						route: url,
						duration: `${duration}ms`,
						status: 'success'
					})
				},
				error: (error) => {
					const duration = Date.now() - startTime
					this.logger.error('Owner dashboard error', {
						ownerId,
						method,
						route: url,
						duration: `${duration}ms`,
						error: error.message,
						status: 'error'
					})
				}
			})
		)
	}
}
