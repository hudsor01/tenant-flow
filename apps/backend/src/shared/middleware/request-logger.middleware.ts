import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * Request Logger Middleware
 * Logs HTTP requests and responses with timing information
 *
 * Official NestJS Pattern:
 * https://docs.nestjs.com/middleware#middleware
 */

interface RequestWithTiming extends Request {
	startTime?: number
	id?: string
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
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
