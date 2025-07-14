import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { createAppRouter, createContext } from './trpc/app-router'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { AuthService } from './auth/auth.service'
import { PropertiesService } from './properties/properties.service'
import { TenantsService } from './tenants/tenants.service'
import { PaymentsService } from './payments/payments.service'
import { MaintenanceService } from './maintenance/maintenance.service'
import { SubscriptionsService } from './subscriptions/subscriptions.service'
import { SubscriptionService } from './stripe/services/subscription.service'
import { PortalService } from './stripe/services/portal.service'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import * as Sentry from '@sentry/node'
import dotenvFlow from 'dotenv-flow'
import { z } from 'zod'
import Redis from 'ioredis'
import fastifyMultipart from '@fastify/multipart'
import type { TrpcContextOpts } from "../../../../packages/types/trpc";

dotenvFlow.config()

// Validate environment variables
const envSchema = z.object({
	NODE_ENV: z.string().default('development'),
	PORT: z.coerce.number().default(3001),
	CORS_ORIGINS: z.string().optional(),
	REDIS_URL: z.string().optional(),
	SENTRY_DSN: z.string().optional()
})
envSchema.parse(process.env)

async function bootstrap() {
	// Use Fastify for better cold start
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter()
	)

	//// Register Fastify multipart plugin for file uploads
	await app.register(fastifyMultipart, {
		limits: {
			fieldNameSize: 100, // Max field name size in bytes
			fieldSize: 100,     // Max field value size in bytes
			fields: 10,         // Max number of non-file fields
			fileSize: 10485760, // 10MB max file size
			files: 1,           // Max number of file fields
			headerPairs: 2000   // Max number of header key=>value pairs
		}
	})
	const configService = app.get(ConfigService)
	const logger = new Logger('Bootstrap')

	// Sentry error monitoring
	if (process.env.SENTRY_DSN) {
		Sentry.init({ dsn: process.env.SENTRY_DSN })
		// Sentry error monitoring (handled globally in main.ts)
	}

	// Redis session/caching (Upstash or similar)
	if (process.env.REDIS_URL) {
		const redis = new Redis(process.env.REDIS_URL)
		redis.on('connect', () => logger.log('Connected to Redis'))
		redis.on('error', err => logger.error('Redis error:', err))
		// Attach redis to app for DI or session/caching as needed
		app.redis = redis
	}

	// Security middleware
	app.use(
		helmet({
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
	)

	// Global validation pipe
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

	// CORS configuration
	const corsOrigins =
		configService.get<string>('CORS_ORIGINS')?.split(',') || [
			'http://localhost:5173',
			'http://localhost:5174',
			'http://localhost:3001',
			'https://tenantflow.app',
			'https://www.tenantflow.app',
			'https://n8n.tenantflow.app',
			'https://cloud.tenantflow.app',
			'https://blog.tenantflow.app',
			'https://api.tenantflow.app'
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

	// Throttling (rate limiting) - configured as global guard in AppModule

	//// Register tRPC Fastify plugin

	const authService = app.get(AuthService)
	const propertiesService = app.get(PropertiesService)
	const tenantsService = app.get(TenantsService)
	const paymentsService = app.get(PaymentsService)
	const maintenanceService = app.get(MaintenanceService)
	const subscriptionsService = app.get(SubscriptionsService)
	const subscriptionService = app.get(SubscriptionService)
	const portalService = app.get(PortalService)

	const appRouter = createAppRouter({
		authService,
		propertiesService,
		tenantsService,
		paymentsService,
		maintenanceService,
		subscriptionsService,
		subscriptionService,
		portalService,
	})

	await app.getHttpAdapter().getInstance().register(fastifyTRPCPlugin, {
		prefix: '/trpc',
		trpcOptions: {
			router: appRouter,
			createContext: (opts: TrpcContextOpts) =>
				createContext({
					req: opts.req,
					res: opts.res,
					services: {
						authService,
						propertiesService,
						tenantsService,
						paymentsService,
						maintenanceService,
						subscriptionsService,
						subscriptionService,
						portalService,
					},
				}),
		},
	})

	const config = new DocumentBuilder()
		.setTitle('TenantFlow API')
		.setDescription('API documentation')
		.setVersion('1.0')
		.build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api/docs', app, document)

	// Global prefix for API routes
	app.setGlobalPrefix('api/v1')

	const port = configService.get<number>('PORT') || 3001

	try {
		await app.listen(port, '0.0.0.0')

		const environment = configService.get<string>('NODE_ENV') || 'development'

		if (environment === 'production') {
			logger.log(`TenantFlow API Server connected on port ${port}`)
		} else {
			const baseUrl = `http://localhost:${port}`
			logger.log(`🚀 TenantFlow API Server running on ${baseUrl}`)
			logger.log(`📚 API Documentation: ${baseUrl}/api/docs`)
			logger.log(`🔐 Authentication: Supabase Hybrid Mode`)
			logger.log(`🌍 Environment: ${environment}`)
			logger.log(`🔗 CORS Origins: ${corsOrigins.join(', ')}`)
		}
	} catch (error) {
		logger.error(`❌ Failed to start server on port ${port}:`, error)
		throw error
	}
}

bootstrap().catch(error => {
	console.error('❌ Failed to start server:', error)
	Sentry.captureException?.(error)
	process.exit(1)
})
