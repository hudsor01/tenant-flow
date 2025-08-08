import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { setRunningPort } from './common/logging/logger.config'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import dotenvFlow from 'dotenv-flow'
import { SecurityUtils } from './common/security/security.utils'
import helmet from '@fastify/helmet'
import type { FastifyRequest } from 'fastify'

// Extend FastifyRequest to include startTime for performance monitoring and rawBody for Stripe webhooks
declare module 'fastify' {
	interface FastifyRequest {
		startTime?: number
		rawBody?: Buffer
	}
}

// Only load dotenv-flow in development
if (process.env.NODE_ENV !== 'production') {
	dotenvFlow.config({
		path: process.cwd()
	})
}



async function bootstrap() {
	const bootstrapStartTime = Date.now()
	console.warn('🚀 BOOTSTRAP STARTING...')
	console.warn(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
	console.warn(`Port configuration: PORT=${process.env.PORT}`)

	// Vercel-optimized Fastify configuration
	const fastifyOptions = {
		bodyLimit: 10 * 1024 * 1024,
		maxParamLength: 200,
		trustProxy: true, // Always trust proxy for production
		logger: false,
		keepAliveTimeout: 30000,
		connectionTimeout: 10000,
		requestTimeout: 9000, // Under Vercel's 10s timeout
	}

	console.warn(`🔧 Fastify config: ${JSON.stringify({
		bodyLimit: fastifyOptions.bodyLimit,
		trustProxy: fastifyOptions.trustProxy,
		keepAliveTimeout: fastifyOptions.keepAliveTimeout
	})}`)

	console.warn('🔧 Creating NestJS application...')

	// Add timeout to detect hanging during module creation
	const createTimeout = setTimeout(() => {
		console.error('⚠️ NestFactory.create() taking longer than 15 seconds - possible hang detected')
		console.error('Check for: missing env vars, circular dependencies, blocking constructors')
	}, 15000)

	console.warn('🔍 About to call NestFactory.create...')

	// Add a more aggressive timeout to catch hangs
	const aggressiveTimeout = setTimeout(() => {
		console.error('💥 CRITICAL: NestFactory.create() hung for 30+ seconds!')
		console.error('💡 This indicates a module initialization issue or circular dependency')
		console.error('🔍 Check the last module that was being initialized above')
		process.exit(1)
	}, 30000)

	console.warn('🔍 Creating Fastify adapter...')
	const fastifyAdapter = new FastifyAdapter(fastifyOptions)
	console.warn('🔍 Fastify adapter created, calling NestFactory.create...')

	const moduleLoadStartTime = Date.now()
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		fastifyAdapter,
		{
			bodyParser: false,
		}
	)
	const moduleLoadTime = Date.now() - moduleLoadStartTime
	console.warn(`🔍 NestFactory.create completed in ${moduleLoadTime}ms, clearing timeout...`)
	clearTimeout(aggressiveTimeout)

	clearTimeout(createTimeout)
	console.warn('✅ NestJS application created successfully')

	console.warn('🔍 About to get ConfigService...')
	const configService = app.get(ConfigService)
	console.warn('✅ ConfigService obtained')

	console.warn('🔍 About to create SecurityUtils...')
	const securityUtils = new SecurityUtils()
	console.warn('✅ SecurityUtils created')

	console.warn('🔍 About to get JWT_SECRET...')
	const jwtSecret = configService.get<string>('JWT_SECRET')
	console.warn('✅ JWT_SECRET obtained')

	// Validate JWT secret with user-friendly warnings

	// Run SRI security assessment - TEMPORARILY DISABLED FOR DEBUGGING
	const securityLogger = new Logger('Security')
	console.warn('🔍 Skipping SRI security assessment for debugging...')

	if (jwtSecret) {
		const validation = securityUtils.validateJwtSecret(jwtSecret)

		// Handle critical errors (length < 32 chars)
		if (validation.errors.length > 0) {
			securityLogger.error('❌ JWT_SECRET critical issues:')
			validation.errors.forEach(error => securityLogger.error(`  - ${error}`))

			if (validation.suggestions.length > 0) {
				securityLogger.error('💡 Suggestions:')
				validation.suggestions.forEach(suggestion => securityLogger.error(`  - ${suggestion}`))
			}

			// Only fail if we cannot proceed (critical security issue)
			if (!validation.canProceed) {
				if (configService.get<string>('NODE_ENV') === 'production') {
					throw new Error('JWT_SECRET is too short - minimum 32 characters required for security')
				} else {
					securityLogger.error('🚫 JWT_SECRET too short - system may be unstable')
				}
			}
		}

		// Handle warnings (non-critical security recommendations)
		if (validation.warnings.length > 0) {
			securityLogger.warn('⚠️  JWT_SECRET security recommendations:')
			validation.warnings.forEach(warning => securityLogger.warn(`  - ${warning}`))

			if (validation.suggestions.length > 0) {
				securityLogger.warn('💡 Suggestions for better security:')
				validation.suggestions.forEach(suggestion => securityLogger.warn(`  - ${suggestion}`))
			}

			if (configService.get<string>('NODE_ENV') === 'production') {
				securityLogger.warn('🔒 Consider updating JWT_SECRET for production security')
			}
		}

		// Success message for valid secrets
		if (validation.valid) {
			securityLogger.log('✅ JWT_SECRET meets all security requirements')
		}
	} else {
		securityLogger.error('❌ JWT_SECRET is not configured')
		throw new Error('JWT_SECRET environment variable is required')
	}


	const logger = new Logger('Bootstrap')

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true
			},
			errorHttpStatusCode: 400,
			exceptionFactory: (errors) => {
				const messages = errors.map(err => ({
					field: err.property,
					errors: Object.values(err.constraints || {}),
					value: err.value
				}))
				return new BadRequestException({
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Validation failed',
						statusCode: 400,
						details: messages
					}
				})
			}
		})
	)

	// CORS configuration - production-first with conditional development support
	const environment = configService.get<string>('NODE_ENV') || 'development'
	const isProduction = environment === 'production'

	// SECURITY: Validate environment to prevent accidental exposure
	const validEnvironments = ['development', 'test', 'production']
	if (!validEnvironments.includes(environment)) {
		throw new Error(`Invalid NODE_ENV: ${environment}. Must be one of: ${validEnvironments.join(', ')}`)
	}

	// Get CORS origins from config service - it returns an array already
	const corsOrigins = configService.get<string[]>('cors.origins') || []

	// Debug CORS configuration
	logger.log(`🔍 CORS origins configured: ${JSON.stringify(corsOrigins)}`)

	// SECURITY: Validate CORS origins format
	const validOriginPattern = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/
	corsOrigins.forEach(origin => {
		if (!validOriginPattern.test(origin)) {
			throw new Error(`Invalid CORS origin format: ${origin}. Origins must be valid URLs.`)
		}
	})

	// If no environment variable is set, use secure defaults
	let finalCorsOrigins = corsOrigins
	if (corsOrigins.length === 0) {
		if (isProduction) {
			// SECURITY: Production only allows HTTPS origins
			finalCorsOrigins = [
				'https://tenantflow.app',
				'https://www.tenantflow.app',
				'https://blog.tenantflow.app',
			]
		} else {
			// Development defaults - include production domains
			finalCorsOrigins = [
				'https://tenantflow.app',
				'https://www.tenantflow.app',
				'https://blog.tenantflow.app',
			]

			// SECURITY: Only add localhost origins in non-production with explicit flag
			if (environment === 'development' || environment === 'test') {
				const allowLocalhost = configService.get<string>('ALLOW_LOCALHOST_CORS')
				if (allowLocalhost === 'true') {
					finalCorsOrigins.push(
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
		}
	}

	// SECURITY: In production, enforce HTTPS-only origins
	if (isProduction) {
		const httpOrigins = finalCorsOrigins.filter(origin => origin.startsWith('http://'))
		if (httpOrigins.length > 0) {
			throw new Error(`Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`)
		}
	}

	// SECURITY: Log CORS origins for audit trail (but not in production)
	if (!isProduction) {
		logger.log(`CORS origins: ${finalCorsOrigins.join(', ')}`)
	} else {
		// In production, log count only
		logger.log(`CORS configured with ${finalCorsOrigins.length} origins`)
	}

	app.enableCors({
		origin: finalCorsOrigins,
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

	app.setGlobalPrefix('api/v1', {
		exclude: ['/health', '/ping', '/']
	})

	console.warn('🔄 Initializing NestJS application...')
	console.warn('📋 Starting app.init()...')
	const appInitStartTime = Date.now()

	// Add timeout to detect if app.init() hangs
	const initTimeout = setTimeout(() => {
		console.error('⚠️ app.init() taking longer than 10 seconds - possible hang detected')
		console.error('⚠️ This suggests an onModuleInit() method is hanging')
		console.error('⚠️ Check PrismaService, StripeCheckoutService, or other services with onModuleInit()')
	}, 10000)

	try {
		console.warn('📋 About to call app.init()...')
		await app.init()
		clearTimeout(initTimeout)
		const appInitTime = Date.now() - appInitStartTime
		console.warn(`✅ app.init() completed successfully in ${appInitTime}ms`)
	} catch (error) {
		clearTimeout(initTimeout)
		console.error('❌ app.init() failed:', error)
		console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
		throw error
	}

	console.warn('✅ NestJS application initialized')

	// Configure raw body parsing for Stripe webhook endpoint
	const fastifyInstance = app.getHttpAdapter().getInstance()

	// Add content type parser for Stripe webhooks that preserves raw body
	fastifyInstance.addContentTypeParser(
		'application/json',
		{ parseAs: 'buffer' },
		(req: FastifyRequest, rawBody: Buffer, done: (err: Error | null, body?: unknown) => void) => {
			// Store raw body for Stripe webhook signature verification
			if (req.url === '/api/v1/stripe/webhook') {
				req.rawBody = rawBody
				try {
					const json = JSON.parse(rawBody.toString('utf8'))
					done(null, json)
				} catch (err) {
					done(err as Error)
				}
			} else {
				// Use default JSON parsing for other routes
				try {
					const json = JSON.parse(rawBody.toString('utf8'))
					done(null, json)
				} catch (err) {
					done(err as Error)
				}
			}
		}
	)

	logger.log('✅ Raw body parsing configured for Stripe webhook endpoint')

	// Configure comprehensive security headers
	await app.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", "data:", "https:"],
				connectSrc: ["'self'", "https://api.stripe.com", "wss://api.stripe.com"],
				fontSrc: ["'self'"],
				objectSrc: ["'none'"],
				mediaSrc: ["'self'"],
				frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
				frameAncestors: ["'none'"],
				formAction: ["'self'"],
				upgradeInsecureRequests: isProduction ? [] : null
			}
		},
		hsts: isProduction ? {
			maxAge: 31536000, // 1 year
			includeSubDomains: true,
			preload: true
		} : false,
		noSniff: true,
		xssFilter: true,
		referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
		ieNoOpen: true,
		frameguard: { action: 'deny' },
		dnsPrefetchControl: { allow: false },
		permittedCrossDomainPolicies: false,
		hidePoweredBy: true
	})

	logger.log('✅ Security headers configured')

	// Register Fastify hooks for request lifecycle management (AFTER app.init)
	// TEMPORARILY DISABLED FOR DEBUGGING
	console.warn('🔍 Skipping Fastify hooks registration for debugging...')
	/*
	const fastifyHooksService = app.get(FastifyHooksService)
	fastifyHooksService.registerHooks(fastifyInstance)
	logger.log('✅ Fastify hooks registered for request lifecycle management')
	*/

	const config = new DocumentBuilder()
		.setTitle('TenantFlow API')
		.setDescription('API documentation')
		.setVersion('1.0')
		.build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api/docs', app, document)

	// Vercel provides PORT env variable
	const port = parseInt(process.env.PORT || '4600', 10)
	// Health check is handled by AppController

	// Add detailed error logging for startup
	process.on('unhandledRejection', (reason, promise) => {
		logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
	})

	process.on('uncaughtException', (error) => {
		logger.error('Uncaught Exception:', error)
		process.exit(1)
	})

	try {
		// Log port information and environment
		logger.log(`🚀 Starting server on port ${port} (PORT: ${process.env.PORT})`)
		logger.log(`🌐 Environment: ${JSON.stringify({
			NODE_ENV: process.env.NODE_ENV,
			PORT: process.env.PORT
		})}`)

		// Add pre-listen check
		logger.log(`📡 About to listen on 0.0.0.0:${port}`)

		const listenStartTime = Date.now()
		await app.listen(port, '0.0.0.0')
		const listenTime = Date.now() - listenStartTime

		const totalBootstrapTime = Date.now() - bootstrapStartTime
		logger.log(`✅ Server listening on 0.0.0.0:${port}`)
		logger.log(`📈 Performance Summary:`)
		logger.log(`  - Module Load: ${moduleLoadTime}ms`)
		logger.log(`  - App Init: ${Date.now() - appInitStartTime}ms`)
		logger.log(`  - Listen: ${listenTime}ms`)
		logger.log(`  - Total Bootstrap: ${totalBootstrapTime}ms`)

		// Update the logger with the actual running port
		setRunningPort(port)

		// Health check
		const healthUrls = [
			`http://0.0.0.0:${port}/health`,
			`http://0.0.0.0:${port}/`
		]

		let healthCheckPassed = false
		logger.log('🔍 Testing app routes after startup...')

		for (const url of healthUrls) {
			try {
				const testResponse = await fetch(url, {
					method: 'GET',
					headers: { 'Accept': 'application/json' }
				}).catch(() => null)

				if (testResponse) {
					logger.log(`📡 ${url} - Status: ${testResponse.status} ${testResponse.statusText}`)
					if (testResponse.ok) {
						healthCheckPassed = true
						const responseText = await testResponse.text().catch(() => 'No response body')
						logger.log(`✅ Route accessible: ${url} - Response: ${responseText.substring(0, 100)}...`)
					}
				} else {
					logger.warn(`⚠️ No response from ${url}`)
				}
			} catch (error) {
				logger.warn(`⚠️ Health check failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
			}
		}

		if (!healthCheckPassed) {
			logger.error('❌ All health checks failed - server may not be accessible')

			// Additional debugging - check if Fastify is actually listening
			try {
				const fastifyInstance = app.getHttpAdapter().getInstance()
				logger.log(`🔧 Fastify server info:`, {
					listening: fastifyInstance.server?.listening,
					address: fastifyInstance.server?.address(),
				})
			} catch (error) {
				logger.error('Failed to get Fastify info:', error)
			}
		}

		if (isProduction) {
			logger.log(`TenantFlow API Server connected on port ${port}`)
		} else {
			const baseUrl = `http://localhost:${port}`
			logger.log(`🚀 TenantFlow API Server running on ${baseUrl}`)
			logger.log(`📚 API Documentation: ${baseUrl}/api/docs`)
			logger.log(`🔐 Authentication: Supabase Hybrid Mode`)
			logger.log(`🌍 Environment: ${environment}`)
			logger.log(`🔗 CORS Origins: ${finalCorsOrigins.join(', ')}`)
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
