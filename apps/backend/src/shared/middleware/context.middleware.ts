import { Injectable, NestMiddleware } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'
import {
	requestContextStorage,
	RequestContext
} from '../context/request-context'

/**
 * Simple context middleware using native AsyncLocalStorage
 * Replaces all custom request context hooks with 15 lines of code
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
	use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
		const context: RequestContext = {
			correlationId:
				(req.headers['x-correlation-id'] as string) || randomUUID(),
			userId: req.headers['x-user-id'] as string,
			organizationId: req.headers['x-organization-id'] as string,
			startTime: Date.now()
		}

		// Native AsyncLocalStorage - zero custom code needed
		requestContextStorage.run(context, next)
	}
}
