import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { createAppRouter } from './trpc/app-router'
import { AppContext } from './trpc/context/app.context'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type {
	FastifyRequest,
	FastifyReply
} from 'fastify'
import { AuthService } from './auth/auth.service'
import { PropertiesService } from './properties/properties.service'
import { TenantsService } from './tenants/tenants.service'
import { MaintenanceService } from './maintenance/maintenance.service'
import { SubscriptionsService } from './subscriptions/subscriptions.service'
import { PortalService } from './stripe/services/portal.service'
import { StorageService } from './storage/storage.service'
import { StripeService } from './stripe/services/stripe.service'
import { WebhookService } from './stripe/services/webhook.service'
import { UsersService } from './users/users.service'
import { UnitsService } from './units/units.service'
import { LeasesService } from './leases/leases.service'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import dotenvFlow from 'dotenv-flow'
// Using Fastify's built-in capabilities instead of external plugins
import fastifyEnv from '@fastify/env'
import fastifyCookie from '@fastify/cookie'
import fastifyCircuitBreaker from '@fastify/circuit-breaker'

dotenvFlow.config()

// Enhanced environment schema using Fastify validation approach
const envSchema = {
	type: 'object',
	required: ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET'],
	properties: {
		NODE_ENV: {
			type: 'string',
			default: 'development',
			enum: ['development', 'production', 'test']
		},
		PORT: {
			type: 'integer',
			default: 3002,
			minimum: 1000,
			maximum: 65535
		},
		CORS_ORIGINS: {
			type: 'string',
			default: 'https://tenantflow.app,https://www.tenantflow.app,https://api.tenantflow.app,https://cloud.tenantflow.app,https://blog.tenantflow.app'
		},
		DATABASE_URL: {
			type: 'string',
			pattern: '^postgresql://'
		},
		DIRECT_URL: {
			type: 'string',
			pattern: '^postgresql://'
		},
		JWT_SECRET: {
			type: 'string',
			minLength: 32
		},
		STRIPE_SECRET_KEY: {
			type: 'string',
			pattern: '^sk_(test_|live_)[a-zA-Z0-9]{99}$'
		},
		STRIPE_WEBHOOK_SECRET: {
			type: 'string',
			pattern: '^whsec_[a-zA-Z0-9]{32,}$'
		},
		STRIPE_API_VERSION: {
			type: 'string',
			default: '2025-06-30.basil'
		},
		SUPABASE_URL: {
			type: 'string',
			pattern: '^https://'
		},
		SUPABASE_SERVICE_ROLE_KEY: {
			type: 'string'
		},
		SUPABASE_JWT_SECRET: {
			type: 'string',
			minLength: 32
		},
		GOOGLE_CLIENT_ID: {
			type: 'string'
		},
		GOOGLE_CLIENT_SECRET: {
			type: 'string'
		},
		RESEND_API_KEY: {
			type: 'string',
			pattern: '^re_[a-zA-Z0-9_]{20,}$'
		},
		COOKIE_SECRET: {
			type: 'string',
			minLength: 32
		},
		SENTRY_DSN: {
			type: 'string',
			pattern: '^https://'
		}
	}
}

async function bootstrap() {
	// Use Fastify for better cold start
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
		{
			bodyParser: true // Re-enable body parser now that we have proper raw body handling
		}
	)

	//// Register Fastify environment validation plugin
	await app.register(fastifyEnv, {
		schema: envSchema,
		dotenv: true // Load from .env files
	})

	// Fastify provides built-in JSON parsing, URL parsing, and multipart handling
	// NestJS handles form parsing automatically
	// For webhook raw body access, we'll handle it in the guard directly

	//// Register Fastify cookie plugin for secure session management
	await app.register(fastifyCookie, {
		secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET, // Use environment secret
		parseOptions: {
			httpOnly: true, // Prevent XSS
			secure: process.env.NODE_ENV === 'production', // HTTPS only in production
			sameSite: 'strict', // CSRF protection
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		}
	})

	//// Register circuit breaker for external API resilience
	await app.register(fastifyCircuitBreaker, {
		threshold: 5, // 5 failures before circuit opens
		timeout: 10000, // 10 second timeout
		resetTimeout: 30000, // 30 seconds before trying to close circuit
		onCircuitOpen: async (req, reply) => {
			reply.statusCode = 503
			reply.send({
				error: 'Service temporarily unavailable',
				message: 'External service is experiencing issues. Please try again later.',
				retryAfter: 30
			})
		},
		onTimeout: async (req, reply) => {
			reply.statusCode = 504
			reply.send({
				error: 'Gateway timeout',
				message: 'Request took too long to process'
			})
		}
	})

	// Get configuration service
	const configService = app.get(ConfigService)
	const logger = new Logger('Bootstrap')

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
			}
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

	// CORS configuration - production-first with conditional development support
	const environment = configService.get<string>('NODE_ENV') || 'development'
	const isProduction = environment === 'production'
	
	let corsOrigins = configService
		.get<string>('CORS_ORIGINS')
		?.split(',') || []

	// If no environment variable is set, use secure defaults
	if (corsOrigins.length === 0) {
		corsOrigins = [
			// Production domains (always included)
			'https://tenantflow.app',
			'https://www.tenantflow.app',
			'https://api.tenantflow.app',
			'https://cloud.tenantflow.app',
			'https://blog.tenantflow.app',
			'https://n8n.tenantflow.app'
		]

		// Add development origins only in non-production environments
		if (!isProduction) {
			corsOrigins.push(
				// Development ports (only in development)
				'http://localhost:5172',
				'http://localhost:5173',
				'http://localhost:5174',
				'http://localhost:5175',
				'http://localhost:3000',
				'http://localhost:3001',
				'http://localhost:3002',
				'http://localhost:3003',
				'http://localhost:3004'
			)
		}
	}

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

	// Global prefix for API routes (MUST be set before tRPC registration)
	app.setGlobalPrefix('api/v1')

	const authService = app.get(AuthService)
	const propertiesService = app.get(PropertiesService)
	const tenantsService = app.get(TenantsService)
	const maintenanceService = app.get(MaintenanceService)
	const subscriptionsService = app.get(SubscriptionsService)
	const portalService = app.get(PortalService)
	const storageService = app.get(StorageService)
	const appContext = app.get(AppContext)

	// Get additional Stripe services via dependency injection
	const stripeService = app.get(StripeService)
	const webhookService = app.get(WebhookService)
	const usersService = app.get(UsersService)
	const unitsService = app.get(UnitsService)
	const leasesService = app.get(LeasesService)
	

	const appRouter = createAppRouter({
		authService,
		propertiesService,
		tenantsService,
		maintenanceService,
		subscriptionsService,
		portalService,
		stripeService,
		webhookService,
		storageService,
		usersService,
		unitsService,
		leasesService
	})

	// Debug: Log router structure (using safe property access)
	logger.log('🔍 TRPC router initialized successfully')

	try {
		logger.log('🔧 Registering tRPC Fastify plugin...')

		const fastifyInstance = app.getHttpAdapter().getInstance()

		await fastifyInstance.register(fastifyTRPCPlugin, {
			prefix: '/api/v1/trpc', // Full prefix since this bypasses NestJS routing
			trpcOptions: {
				router: appRouter,
				createContext: async (opts: {
					req: FastifyRequest
					res: FastifyReply
				}) => {
					logger.debug(
						'🔍 TRPC createContext called for:',
						opts.req.method,
						opts.req.url
					)
					return await appContext.create({
						req: opts.req,
						res: opts.res
					})
				},
				onError: ({ path, error }: { path?: string; error: Error }) => {
					logger.error(`Error in tRPC handler on path '${path}':`, error)
				}
			}
		})

		logger.log('✅ tRPC Fastify plugin registered successfully')

		// Debug: Test router after registration
		logger.log('🔍 Testing router registration...')
		logger.log('Fastify routes after TRPC registration:')
		fastifyInstance.printRoutes()
	} catch (error) {
		logger.error('❌ Failed to register tRPC plugin:', error)
		throw error
	}

	const config = new DocumentBuilder()
		.setTitle('TenantFlow API')
		.setDescription('API documentation')
		.setVersion('1.0')
		.build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api/docs', app, document)

	const port = configService.get<number>('PORT') || 3001

	try {
		await app.listen(port, '0.0.0.0')

		if (isProduction) {
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

bootstrap().catch(_error => {
	// Server startup error handled by exception filter
	process.exit(1)
})
