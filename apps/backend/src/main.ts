import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'
import * as net from 'net'
import { createAppRouter } from './trpc/app-router'
import { LazyAppContext } from './trpc/context/lazy-app.context'
import { setRunningPort } from './common/logging/logger.config'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import type {
	FastifyRequest,
	FastifyReply
} from 'fastify'
import { AuthService } from './auth/auth.service'
import { EmailService } from './email/email.service'
import { PropertiesService } from './properties/properties.service'
import { TenantsService } from './tenants/tenants.service'
import { MaintenanceService } from './maintenance/maintenance.service'
import { SubscriptionsService } from './subscriptions/subscriptions.service'
import { SubscriptionService } from './stripe/subscription.service'
import { StorageService } from './storage/storage.service'
import { UsersService } from './users/users.service'
import { UnitsService } from './units/units.service'
import { LeasesService } from './leases/leases.service'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import dotenvFlow from 'dotenv-flow'
import { join } from 'path'
import fastifyEnv from '@fastify/env'
import fastifyCookie from '@fastify/cookie'
import fastifyCircuitBreaker from '@fastify/circuit-breaker'

// Extend FastifyRequest to include rawBody for webhook signature verification
declare module 'fastify' {
	interface FastifyRequest {
		rawBody?: Buffer
	}
}

dotenvFlow.config({
	path: join(__dirname, '..', '..', '..')
})

async function findAvailablePort(startPort: number, endPort: number = startPort + 9): Promise<number> {
	for (let port = startPort; port <= endPort; port++) {
		const available = await isPortAvailable(port)
		if (available) {
			return port
		}
	}
	throw new Error(`No available ports found in range ${startPort}-${endPort}`)
}

function isPortAvailable(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer()
		server.listen(port, () => {
			server.close(() => resolve(true))
		})
		server.on('error', () => resolve(false))
	})
}

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
			default: 'https://tenantflow.app,https://blog.tenantflow.app'
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
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
		{
			bodyParser: false
		}
	)

	// SECURITY: Enabled environment validation for production safety
	await app.register(fastifyEnv, {
		schema: envSchema,
		dotenv: true
	})

	// Configure body parsing to preserve raw body for webhooks
	const fastifyAdapter = app.getHttpAdapter().getInstance()
	
	// Add content type parsers with raw body preservation
	fastifyAdapter.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
		req.rawBody = body as Buffer
		try {
			const json = JSON.parse((body as Buffer).toString('utf8'))
			done(null, json)
		} catch (err) {
			done(err as Error)
		}
	})
	
	// Handle other content types normally
	fastifyAdapter.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (req, body, done) => {
		try {
			const parsed = new URLSearchParams(body as string)
			const result = Object.fromEntries(parsed)
			done(null, result)
		} catch (err) {
			done(err as Error)
		}
	})

	const configService = app.get(ConfigService)

	await app.register(fastifyCookie, {
		secret: configService.get<string>('COOKIE_SECRET') || configService.get<string>('JWT_SECRET'),
		parseOptions: {
			httpOnly: true,
			secure: configService.get<string>('NODE_ENV') === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000,
		}
	})

	await app.register(fastifyCircuitBreaker, {
		threshold: 5,
		timeout: 10000,
		resetTimeout: 30000,
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

	// Note: Webhook signature verification will be handled in the guard
	// by reconstructing the raw body from the parsed JSON
	
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
		?.split(',')
		.filter(origin => origin.trim().length > 0) || []

	// If no environment variable is set, use secure defaults
	if (corsOrigins.length === 0) {
		corsOrigins = [
			'https://tenantflow.app',
			'https://www.tenantflow.app',
			'https://blog.tenantflow.app',
		]

		// SECURITY: Only add development origins in explicit development/test environments
		if (environment === 'development' || environment === 'test') {
			corsOrigins.push(
				// Development ports (only in development/test)
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

	// SECURITY: Log CORS origins for audit trail (but not in production)
	if (!isProduction) {
		logger.log(`CORS origins: ${corsOrigins.join(', ')}`)
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

	await app.init()
	
	const authService = app.get(AuthService)
	const emailService = app.get(EmailService)
	const propertiesService = app.get(PropertiesService)
	const tenantsService = app.get(TenantsService)
	const maintenanceService = app.get(MaintenanceService)
	const subscriptionsService = app.get(SubscriptionsService)
	const subscriptionService = app.get(SubscriptionService)
	const storageService = app.get(StorageService)
	const lazyAppContext = app.get(LazyAppContext)
	const usersService = app.get(UsersService)
	const unitsService = app.get(UnitsService)
	const leasesService = app.get(LeasesService)
	

	// Debug: Check services exist
	logger.log('🔍 Checking services before router creation:')
	logger.log('  authService:', !!authService)
	logger.log('  subscriptionsService:', !!subscriptionsService)
	logger.log('  subscriptionService:', !!subscriptionService)

	const appRouter = createAppRouter({
		authService,
		emailService,
		propertiesService,
		tenantsService,
		maintenanceService,
		subscriptionsService,
		subscriptionService,
		storageService,
		usersService,
		unitsService,
		leasesService
	})

	// Debug: Log router structure (using safe property access)
	logger.log('🔍 TRPC router initialized successfully')
	logger.log('🔍 Router procedures:', Object.keys(appRouter._def.procedures || {}))

	try {
		logger.log('🔧 Registering tRPC Fastify plugin...')

		const fastifyInstanceForTRPC = app.getHttpAdapter().getInstance()

		await fastifyInstanceForTRPC.register(fastifyTRPCPlugin, {
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
					return await lazyAppContext.create({
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
		fastifyInstanceForTRPC.printRoutes()
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

	const preferredPort = configService.get<number>('PORT') || 3002
	const port = await findAvailablePort(preferredPort, preferredPort + 9)
	const fastifyInstanceForHealth = app.getHttpAdapter().getInstance()
	fastifyInstanceForHealth.get('/health', async (_request, _reply) => {
		return { 
			status: 'ok', 
			timestamp: new Date().toISOString(),
			port,
			environment,
			uptime: process.uptime()
		}
	})

	// Add detailed error logging for startup
	process.on('unhandledRejection', (reason, promise) => {
		logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
	})

	process.on('uncaughtException', (error) => {
		logger.error('Uncaught Exception:', error)
		process.exit(1)
	})

	try {
		await app.listen(port, '0.0.0.0')
		
		// Update the logger with the actual running port
		setRunningPort(port)

		// Test that the server is actually listening
		const testResponse = await fetch(`http://localhost:${port}/health`).catch(() => null)
		if (!testResponse) {
			logger.warn('⚠️ Server started but health check failed')
		} else {
			logger.log('✅ Health check passed')
		}

		if (isProduction) {
			logger.log(`TenantFlow API Server connected on port ${port}`)
		} else {
			const baseUrl = `http://localhost:${port}`
			logger.log(`🚀 TenantFlow API Server running on ${baseUrl}`)
			logger.log(`📚 API Documentation: ${baseUrl}/api/docs`)
			logger.log(`🔐 Authentication: Supabase Hybrid Mode`)
			logger.log(`🌍 Environment: ${environment}`)
			logger.log(`🔗 CORS Origins: ${corsOrigins.join(', ')}`)
			logger.log(`💚 Health Check: ${baseUrl}/health`)
		}
	} catch (error) {
		logger.error(`❌ Failed to start server on port ${port}:`, error)
		logger.error('Error details:', {
			message: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : 'No stack trace',
			code: (error as Record<string, unknown>)?.code,
			errno: (error as Record<string, unknown>)?.errno,
			syscall: (error as Record<string, unknown>)?.syscall,
			address: (error as Record<string, unknown>)?.address,
			port: (error as Record<string, unknown>)?.port
		})
		throw error
	}
}

bootstrap().catch(_error => {
	process.exit(1)
})
