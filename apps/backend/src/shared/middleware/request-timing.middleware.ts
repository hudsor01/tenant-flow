import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * Request Timing Middleware
 * Tracks request start time for performance monitoring
 *
 * Official NestJS Pattern:
 * https://docs.nestjs.com/middleware#middleware
 */

interface RequestWithTiming extends Request {
	startTime?: number
	id?: string
}

@Injectable()
export class RequestTimingMiddleware implements NestMiddleware {
	use(req: RequestWithTiming, _res: Response, next: NextFunction): void {
		req.startTime = Date.now()
		next()
	}
}
