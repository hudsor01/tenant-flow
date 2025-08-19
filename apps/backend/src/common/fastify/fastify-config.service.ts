import { Injectable } from '@nestjs/common'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'

declare module 'fastify' {
	interface FastifyRequest {
		rawBody?: Buffer
	}
}

@Injectable()
export class FastifyConfigService {
	async configureFastifyPlugins(app: NestFastifyApplication): Promise<void> {
		const fastifyInstance = app.getHttpAdapter().getInstance()
		
		// Configure raw body parsing for Stripe webhooks
		fastifyInstance.addContentTypeParser(
			'application/json',
			{ parseAs: 'buffer' },
			(req: FastifyRequest, rawBody: Buffer, done) => {
				if (req.url === '/api/v1/stripe/webhook') {
					req.rawBody = rawBody
				}
				try {
					const json = JSON.parse(rawBody.toString('utf8'))
					done(null, json)
				} catch (err) {
					done(err as Error)
				}
			}
		)
		
		// Register compression
		const fastifyCompress = await import('@fastify/compress')
		await app.register(fastifyCompress.default, {
			global: true,
			threshold: 1024
		})
		
		// Register ETag
		const fastifyEtag = await import('@fastify/etag')
		await app.register(fastifyEtag.default)
	}
}