import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { join } from 'path'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import type { IncomingMessage, ServerResponse } from 'http'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fastifyHelmet from '@fastify/helmet'

import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { TrpcService } from './trpc/trpc.service'
import { AppContext } from './trpc/context/app.context'

/**
 * Vercel-compatible serverless handler for NestJS Fastify API.
 * Ensures singleton app instance per cold start, supports static files, Stripe webhooks, and CORS.
 * Exports handler as both ESM and CJS for maximum compatibility.
 */

let appPromise: Promise<NestFastifyApplication> | undefined

async function createApp(): Promise<NestFastifyApplication> {
	const fastifyAdapter = new FastifyAdapter({
		bodyLimit: 10485760, // 10MB limit for file uploads
		logger: false
	})

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		fastifyAdapter
	)
	const configService = app.get(ConfigService)
	const nestLogger = new Logger('Serverless')

	await app.register(fastifyMultipart, {
		limits: {
			fieldNameSize: 100,
			fieldSize: 100,
			fields: 10,
			fileSize: 10485760,
			files: 1,
			headerPairs: 2000
		}
	})

	// Register content type parsers for JSON and raw body support (Stripe webhooks)
	await app.register(async function (fastify: FastifyInstance) {
		fastify.addContentTypeParser(
			'application/json',
			{ parseAs: 'buffer' },
			function (
				req: FastifyRequest,
				body: Buffer,
				done: (error: Error | null, parsed?: Record<string, string | number | boolean | null>) => void
			) {
				if (req.url === '/api/v1/stripe/webhook') {
					// Adding rawBody property for webhook verification
					(req as FastifyRequest & { rawBody: Buffer }).rawBody = body
					done(null, {})
				} else {
					try {
						const json = JSON.parse(body.toString())
						done(null, json)
					} catch (err) {
						done(
							err instanceof Error
								? err
								: new Error('Invalid JSON'),
							undefined
						)
					}
				}
			}
		)
	})

	await app.register(fastifyStatic, {
		root: join(__dirname, '..', 'uploads'),
		prefix: '/uploads/'
	})

	await app.register(fastifyHelmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", 'data:', 'https:']
			}
		},
		crossOriginEmbedderPolicy: false
	})

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true
			}
		})
	)

	const corsOrigins = configService
		.get<string>('CORS_ORIGINS')
		?.split(',') || [
		'https://tenantflow.app',
		'https://www.tenantflow.app',
		'https://api.tenantflow.app',
		'https://blog.tenantflow.app'
	]

	app.enableCors({
		origin: corsOrigins,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: [
			'Origin',
			'X-Requested-With',
			'Content-Type',
			'Accept',
			'Authorization',
			'Cache-Control'
		]
	})

	app.setGlobalPrefix('api/v1')

	// Register TRPC plugin
	const trpcService = app.get(TrpcService)
	const appContext = app.get(AppContext)
	const appRouter = trpcService.getAppRouter()
	const fastifyInstance = app
		.getHttpAdapter()
		.getInstance() as FastifyInstance

	await fastifyInstance.register(fastifyTRPCPlugin, {
		prefix: '/api/v1/trpc',
		trpcOptions: {
			router: appRouter,
			createContext: async ({ req, res }: { req: FastifyRequest; res: FastifyReply }) => {
				return await appContext.create({ req, res })
			},
			onError: ({ path, error }: { path?: string; error: Error }) => {
				nestLogger.error(
					`Error in tRPC handler on path '${path}':`,
					error
				)
			}
		}
	})

	await app.init()
	nestLogger.log('🚀 TenantFlow API initialized for serverless deployment')

	return app
}

// Vercel handler: ensures singleton app instance per cold start
async function handler(req: Request, res: Response) {
	if (!appPromise) {
		appPromise = createApp()
	}
	const nestApp = await appPromise

	const fastifyInstance = nestApp
		.getHttpAdapter()
		.getInstance() as FastifyInstance
	// Type conversions for serverless environment
	// These are necessary because Vercel's Request/Response types differ from Node's
	const nodeReq = req as unknown as IncomingMessage
	const nodeRes = res as unknown as ServerResponse

	fastifyInstance.server.emit('request', nodeReq, nodeRes)
}

// ESM export
export default handler

// CJS export for Vercel compatibility (ESLint disable for compatibility)
 
module.exports = handler

// Export the handler type for external use
export type ServerlessHandler = typeof handler
