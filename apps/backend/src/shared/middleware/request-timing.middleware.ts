import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * Request Timing Middleware
 *
 * Records the start time of each request for performance monitoring and logging.
 * The timestamp is stored in `req.startTime` and used by RequestLoggerMiddleware
 * to calculate request duration.
 *
 * **Execution Order**: Must run FIRST before all other middleware to capture
 * accurate start time at the beginning of the request lifecycle.
 *
 * **Performance Metrics**:
 * - Duration calculated as: `Date.now() - req.startTime`
 * - Used for: Request timing logs, performance alerts, SLA monitoring
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

interface RequestWithTiming extends Request {
	/** Unix timestamp (milliseconds) when request was received */
	startTime?: number
	/** Request ID (set by RequestIdMiddleware) */
	id?: string
}

@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
	/**
	 * Middleware handler that records request start time
	 *
	 * @param req - Express request object (extended with startTime property)
	 * @param _res - Express response object (unused)
	 * @param next - Express next function to pass control to next middleware
	 */
	use(req: RequestWithTiming, _res: Response, next: NextFunction): void {
		req.startTime = Date.now()
		next()
	}
}
