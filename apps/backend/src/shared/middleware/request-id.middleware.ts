import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

/**
 * Request ID Middleware
 *
 * Assigns a unique UUID to each incoming request for distributed tracing.
 * The request ID is stored in `req.id` and can be used for:
 * - Correlating logs across services
 * - Debugging request flows
 * - Performance monitoring
 *
 * **Execution Order**: Should run AFTER RequestTimingMiddleware and BEFORE RequestLoggerMiddleware
 * to ensure the ID is available for logging.
 *
 * **Official NestJS Pattern**:
 * @see {@link https://docs.nestjs.com/middleware#middleware NestJS Middleware Documentation}
 *
 * @example
 * ```typescript
 * // In AppModule.configure()
 * consumer
 *   .apply(RequestTimingMiddleware, RequestIdMiddleware, RequestLoggerMiddleware)
 *   .forRoutes('*')
 * ```
 */

interface RequestWithId extends Request {
	/** Unique request identifier (UUID v4) */
	id?: string
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
	/**
	 * Middleware handler that assigns a UUID to each request
	 *
	 * @param req - Express request object (extended with id property)
	 * @param _res - Express response object (unused)
	 * @param next - Express next function to pass control to next middleware
	 */
	use(req: RequestWithId, _res: Response, next: NextFunction): void {
		req.id = randomUUID()
		next()
	}
}
