import type { NestMiddleware } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { AppLogger } from '../../logger/app-logger.service'

interface RequestWithTiming extends Request {
	/** Unix timestamp (milliseconds) set by RequestTimingMiddleware */
	startTime?: number
	/** Request ID (UUID) set by RequestIdMiddleware */
	id?: string
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
	constructor(private readonly logger: AppLogger) {}

	use(req: RequestWithTiming, res: Response, next: NextFunction): void {
		const originalSend = res.send.bind(res)

		res.send = ((body: unknown) => {
			const duration = Date.now() - (req.startTime ?? Date.now())
			const baseMeta = {
				statusCode: res.statusCode,
				path: req.url,
				method: req.method,
				durationMs: duration,
				requestId: req.id
			}

			const headerMeta = {
				headers: {
					origin: req.headers.origin,
					referer: req.headers.referer,
					userAgent: req.headers['user-agent']?.substring(0, 100)
				}
			}

			if (duration > 1000) {
				this.logger.error(
					`🐌 SLOW REQUEST: ${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`,
					'HTTP',
					{
						...baseMeta,
						...headerMeta,
						warning: 'PERFORMANCE BOTTLENECK DETECTED'
					}
				)
			}

			if (res.statusCode >= 400) {
				let bodyString: string | undefined
				if (res.statusCode >= 500 && body !== null) {
					try {
						bodyString = String(body).substring(0, 500)
					} catch {
						bodyString = '[Unable to stringify body]'
					}
				}

				this.logger.warn(
					`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`,
					'HTTP',
					{
						...baseMeta,
						...headerMeta,
						body: bodyString
					}
				)
			} else {
				this.logger.log(
					`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`,
					'HTTP',
					baseMeta
				)
			}

			return originalSend(body)
		}) as Response['send']

		next()
	}
}
