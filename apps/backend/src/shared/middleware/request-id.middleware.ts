import { Injectable, NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

/**
 * Request ID Middleware
 * Assigns unique ID to each request for tracing
 *
 * Official NestJS Pattern:
 * https://docs.nestjs.com/middleware#middleware
 */

interface RequestWithId extends Request {
	id?: string
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
	use(req: RequestWithId, _res: Response, next: NextFunction): void {
		req.id = randomUUID()
		next()
	}
}
