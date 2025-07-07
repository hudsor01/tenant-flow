import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		if (req.path === '/stripe/webhook') {
			// For Stripe webhooks, we need the raw body
			const chunks: Buffer[] = []

			req.on('data', (chunk: Buffer) => {
				chunks.push(chunk)
			})

			req.on('end', () => {
				;(req as any).rawBody = Buffer.concat(chunks)
				next()
			})
		} else {
			next()
		}
	}
}