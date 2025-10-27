import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * Request Logger Middleware
 *
 * Logs HTTP requests and responses with timing, status codes, and error details.
 * Uses NestJS Logger with contextual information for debugging and monitoring.
 *
 * **Log Levels**:
 * - `logger.log()`: Success responses (status < 400)
 * - `logger.warn()`: Client/server errors (status >= 400)
 *
 * **Error Logging**:
 * - Captures response body for 5xx errors (first 500 chars)
 * - Includes request headers (origin, referer, user-agent)
 * - Calculates request duration from RequestTimingMiddleware
 *
 * **Execution Order**: Must run LAST after RequestTimingMiddleware and RequestIdMiddleware
 * to have access to `req.startTime` and `req.id` for complete logs.
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
 *
 * @example
 * ```
 * // Log output (success):
 * GET /api/v1/properties -> 200 in 45ms
 *
 * // Log output (error with details):
 * POST /api/v1/tenants -> 500 in 123ms
 * {
 *   statusCode: 500,
 *   path: '/api/v1/tenants',
 *   method: 'POST',
 *   duration: '123ms',
 *   headers: { origin: 'https://tenantflow.app', ... },
 *   body: 'Internal Server Error: Database connection failed...'
 * }
 * ```
 */

interface RequestWithTiming extends Request {
	/** Unix timestamp (milliseconds) set by RequestTimingMiddleware */
	startTime?: number
	/** Request ID (UUID) set by RequestIdMiddleware */
	id?: string
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
	/** NestJS Logger instance with 'HTTP' context for request/response logs */
	private readonly logger = new Logger('HTTP')

	use(req: RequestWithTiming, res: Response, next: NextFunction): void {
		const originalSend = res.send
		const logger = this.logger

		res.send = function (this: Response, body: unknown) {
			const duration = Date.now() - (req.startTime ?? Date.now())

			// Enhanced logging for errors
			if (res.statusCode >= 400) {
				// Safely convert body to string for logging
				let bodyString: string | undefined
				if (res.statusCode >= 500 && body !== null) {
					try {
						bodyString = String(body).substring(0, 500)
					} catch {
						bodyString = '[Unable to stringify body]'
					}
				}

				logger.warn(
					`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`,
					{
						statusCode: res.statusCode,
						path: req.url,
						method: req.method,
						duration: `${duration}ms`,
						headers: {
							origin: req.headers.origin,
							referer: req.headers.referer,
							userAgent: req.headers['user-agent']?.substring(0, 100)
						},
						body: bodyString
					}
				)
			} else {
				logger.log(
					`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`
				)
			}

			return originalSend.call(this, body)
		}

		next()
	}
}
