import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import {
	setRunningPort,
	PerformanceLogger
} from './common/logging/logger.config'
import { createLogger as createWinstonLogger } from './common/config/winston.config'
import { FastifyRequestLoggerService } from './common/logging/fastify-request-logger.service'
import {
	type NestFastifyApplication,
	FastifyAdapter
} from '@nestjs/platform-fastify'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import dotenvFlow from 'dotenv-flow'
import { SecurityUtils } from './common/security/security.utils'
import helmet from '@fastify/helmet'
import type { FastifyRequest } from 'fastify'
import { WinstonModule } from 'nest-winston'
import { EnvValidator } from './config/env-validator'
import * as net from 'net'

// Extend FastifyRequest to include startTime for performance monitoring and rawBody for Stripe webhooks
declare module 'fastify' {
	interface FastifyRequest {
		startTime?: number
		rawBody?: Buffer
		correlationId?: string
	}
}

// Only load dotenv-flow in development
if (process.env.NODE_ENV !== 'production') {
	dotenvFlow.config({
		path: __dirname.includes('apps/backend')
			? process.cwd()
			: `${process.cwd()}/apps/backend`
	})
}

// Validate environment variables
EnvValidator.validate()

// DEBUGGING: Log initial process state
const bootstrapLogger = new Logger('Bootstrap')
bootstrapLogger.log('=== BOOTSTRAP DEBUG START ===', {
	processPID: process.pid,
	nodeVersion: process.version,
	currentDirectory: process.cwd(),
	NODE_ENV: process.env.NODE_ENV,
	DOCKER_CONTAINER: process.env.DOCKER_CONTAINER,
	RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
	PORT: process.env.PORT
})

async function bootstrap() {
	const bootstrapLogger = new Logger('Bootstrap')
	bootstrapLogger.log('=== ENTERING BOOTSTRAP FUNCTION ===', {
		timestamp: new Date().toISOString()
	})
	const bootstrapStartTime = Date.now()

	// Initialize Winston logger early for structured logging
	bootstrapLogger.log('=== CREATING WINSTON LOGGER ===')
	const winstonLogger = createWinstonLogger()
	bootstrapLogger.log('=== WINSTON LOGGER CREATED SUCCESSFULLY ===')

	// Create a logger adapter for compatibility with existing code
	class LoggerAdapter {
		log(message: string, context?: Record<string, unknown>) {
			winstonLogger.info(message, context)
		}
		error(message: string, context?: Record<string, unknown>) {
			winstonLogger.error(message, context)
		}
		warn(message: string, context?: Record<string, unknown>) {
			winstonLogger.warn(message, context)
		}
		debug(message: string, context?: Record<string, unknown>) {
			winstonLogger.debug(message, context)
		}
	}

	const logger = new LoggerAdapter()

	// Helper function to safely call debug method
	const logDebug = (message: string, context?: Record<string, unknown>) => {
		if ('debug' in logger && typeof logger.debug === 'function') {
			logger.debug(message, context)
		}
	}
	const bootstrapPerfLogger = new PerformanceLogger(logger, 'bootstrap', {
		environment: process.env.NODE_ENV,
		port: process.env.PORT
	})

	logger.log('🚀 Bootstrap starting', {
		environment: process.env.NODE_ENV,
		port: process.env.PORT,
		nodeVersion: process.version,
		platform: process.platform,
		pid: process.pid
	})

	// Vercel-optimized Fastify configuration
	const fastifyOptions = {
		bodyLimit: 10 * 1024 * 1024,
		maxParamLength: 200,
		trustProxy: true, // Always trust proxy for production
		logger: false,
		keepAliveTimeout: 30000,
		connectionTimeout: 10000,
		requestTimeout: 9000 // Under Vercel's 10s timeout
	}

	logDebug('Fastify configuration', {
		bodyLimit: fastifyOptions.bodyLimit,
		trustProxy: fastifyOptions.trustProxy,
		keepAliveTimeout: fastifyOptions.keepAliveTimeout,
		connectionTimeout: fastifyOptions.connectionTimeout,
		requestTimeout: fastifyOptions.requestTimeout
	})

	const appCreationPerfLogger = new PerformanceLogger(
		logger,
		'nestjs-application-creation'
	)

	// Add timeout to detect hanging during module creation
	const createTimeout = setTimeout(() => {
		logger.error(
			'NestFactory.create() taking longer than 15 seconds - possible hang detected',
			{
				operation: 'nestjs-application-creation',
				phase: 'timeout-warning',
				duration: 15000,
				suggestions: [
					'Check for missing environment variables',
					'Look for circular dependencies',
					'Review blocking constructors in modules'
				]
			}
		)
	}, 15000)

	// Add a more aggressive timeout to catch hangs
	const aggressiveTimeout = setTimeout(() => {
		logger.error('CRITICAL: NestFactory.create() hung for 30+ seconds!', {
			operation: 'nestjs-application-creation',
			phase: 'critical-timeout',
			duration: 30000,
			action: 'forcing-process-exit'
		})
		process.exit(1)
	}, 30000)

	logDebug('Creating Fastify adapter', { phase: 'adapter-creation' })
	const fastifyAdapter = new FastifyAdapter(fastifyOptions)

	const moduleLoadStartTime = Date.now()
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		fastifyAdapter,
		{
			bodyParser: false,
			logger: WinstonModule.createLogger({
				instance: winstonLogger
			})
		}
	)
	const moduleLoadTime = Date.now() - moduleLoadStartTime

	clearTimeout(aggressiveTimeout)
	clearTimeout(createTimeout)
	appCreationPerfLogger.complete({ moduleLoadTime })

	logger.log('NestJS application created successfully', {
		moduleLoadTime,
		phase: 'application-created'
	})

	logDebug('Obtaining ConfigService', { phase: 'service-initialization' })
	const configService = app.get(ConfigService)

	logDebug('Creating SecurityUtils', { phase: 'security-initialization' })
	const securityUtils = new SecurityUtils()

	logDebug('Retrieving JWT secret configuration', {
		phase: 'jwt-configuration'
	})
	const jwtSecret = configService.get<string>('JWT_SECRET')

	// Validate JWT secret with user-friendly warnings

	// Security assessment and JWT validation
	const securityLogger = new Logger('Security')
	logDebug('Starting security validation', { phase: 'security-assessment' })

	if (jwtSecret) {
		const validation = securityUtils.validateJwtSecret(jwtSecret)

		// Handle critical errors (length < 32 chars)
		if (validation.errors.length > 0) {
			securityLogger.error('❌ JWT_SECRET critical issues:')
			validation.errors.forEach(error =>
				securityLogger.error(`  - ${error}`)
			)

			if (validation.suggestions.length > 0) {
				securityLogger.error('💡 Suggestions:')
				validation.suggestions.forEach(suggestion =>
					securityLogger.error(`  - ${suggestion}`)
				)
			}

			// Only fail if we cannot proceed (critical security issue)
			if (!validation.canProceed) {
				if (configService.get<string>('NODE_ENV') === 'production') {
					throw new Error(
						'JWT_SECRET is too short - minimum 32 characters required for security'
					)
				} else {
					securityLogger.error(
						'🚫 JWT_SECRET too short - system may be unstable'
					)
				}
			}
		}

		// Handle warnings (non-critical security recommendations)
		if (validation.warnings.length > 0) {
			securityLogger.warn('⚠️  JWT_SECRET security recommendations:')
			validation.warnings.forEach(warning =>
				securityLogger.warn(`  - ${warning}`)
			)

			if (validation.suggestions.length > 0) {
				securityLogger.warn('💡 Suggestions for better security:')
				validation.suggestions.forEach(suggestion =>
					securityLogger.warn(`  - ${suggestion}`)
				)
			}

			if (configService.get<string>('NODE_ENV') === 'production') {
				securityLogger.warn(
					'🔒 Consider updating JWT_SECRET for production security'
				)
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

	// NestJS logger for remaining legacy logging

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true
			},
			errorHttpStatusCode: 400,
			exceptionFactory: errors => {
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
		throw new Error(
			`Invalid NODE_ENV: ${environment}. Must be one of: ${validEnvironments.join(', ')}`
		)
	}

	// Get CORS origins from config service - it returns an array already
	const corsOrigins = configService.get<string[]>('cors.origins') || []

	// Debug CORS configuration
	logDebug('CORS origins configured', { corsOrigins })

	// SECURITY: Validate CORS origins format
	const validOriginPattern = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/
	corsOrigins.forEach(origin => {
		if (!validOriginPattern.test(origin)) {
			throw new Error(
				`Invalid CORS origin format: ${origin}. Origins must be valid URLs.`
			)
		}
	})

	// If no environment variable is set, use secure defaults
	let finalCorsOrigins = corsOrigins
	if (corsOrigins.length === 0) {
		if (isProduction) {
			// SECURITY: Production only allows HTTPS origins
			// Include all possible Vercel deployment URLs
			finalCorsOrigins = [
				'https://tenantflow.app',
				'https://www.tenantflow.app',
				'https://blog.tenantflow.app',
				'https://tenantflow.vercel.app',
				'https://tenantflow-git-main.vercel.app',
				'https://tenantflow-git-fix-auth-flow.vercel.app',
				'https://tenant-flow.vercel.app',
				'https://tenant-flow-git-main.vercel.app',
				'https://tenant-flow-git-fix-auth-flow.vercel.app'
			]
		} else {
			// Development defaults - include production domains
			finalCorsOrigins = [
				'https://tenantflow.app',
				'https://www.tenantflow.app',
				'https://blog.tenantflow.app',
				'https://tenantflow.vercel.app',
				'https://tenantflow-git-main.vercel.app',
				'https://tenant-flow.vercel.app',
				'https://tenant-flow-git-main.vercel.app'
			]

			// SECURITY: Only add localhost origins in non-production with explicit flag
			if (environment === 'development' || environment === 'test') {
				const allowLocalhost = configService.get<string>(
					'ALLOW_LOCALHOST_CORS'
				)
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
		const httpOrigins = finalCorsOrigins.filter(origin =>
			origin.startsWith('http://')
		)
		if (httpOrigins.length > 0) {
			throw new Error(
				`Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`
			)
		}
	}

	// SECURITY: Log CORS origins for audit trail (but not in production)
	logger.log('CORS configuration finalized', {
		environment,
		originCount: finalCorsOrigins.length,
		origins: isProduction ? '[hidden-for-security]' : finalCorsOrigins
	})

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

	// Remove global prefix to match frontend expectations
	// Frontend expects API at root path: https://api.tenantflow.app
	// app.setGlobalPrefix('api/v1', {
	// 	exclude: ['/health', '/ping', '/']
	// })

	const appInitPerfLogger = new PerformanceLogger(
		logger,
		'application-initialization'
	)

	// Add timeout to detect if app.init() hangs
	const initTimeout = setTimeout(() => {
		logger.error(
			'app.init() taking longer than 10 seconds - possible hang detected',
			{
				operation: 'application-initialization',
				phase: 'timeout-warning',
				duration: 10000,
				suggestions: [
					'Check PrismaService onModuleInit()',
					'Review StripeCheckoutService initialization',
					'Look for hanging HTTP requests in service constructors'
				]
			}
		)
	}, 10000)

	try {
		logDebug('Calling app.init()', { phase: 'initialization-start' })
		await app.init()
		clearTimeout(initTimeout)
		appInitPerfLogger.complete()
	} catch (error) {
		clearTimeout(initTimeout)
		appInitPerfLogger.error(error as Error)
		logger.error('Application initialization failed', {
			error:
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
							name: error.name
						}
					: error
		})
		throw error
	}

	logger.log('NestJS application initialized successfully', {
		phase: 'initialization-complete'
	})

	// Configure raw body parsing for Stripe webhook endpoint
	const fastifyInstance = app.getHttpAdapter().getInstance()

	// Add content type parser for Stripe webhooks that preserves raw body
	fastifyInstance.addContentTypeParser(
		'application/json',
		{ parseAs: 'buffer' },
		(
			req: FastifyRequest,
			rawBody: Buffer,
			done: (err: Error | null, body?: unknown) => void
		) => {
			// Store raw body for Stripe webhook signature verification
			if (req.url === '/stripe/webhook') {
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
				// SECURITY: Restrict script sources - avoid 'unsafe-inline' in production
				scriptSrc: isProduction
					? ["'self'", 'https://js.stripe.com']
					: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
				// SECURITY: Restrict style sources - avoid 'unsafe-inline' in production when possible
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:', 'https:'],
				// SECURITY: Restrict API connections to trusted domains
				connectSrc: [
					"'self'",
					'https://api.stripe.com',
					'wss://api.stripe.com',
					...(isProduction
						? []
						: ['http://localhost:*', 'ws://localhost:*'])
				],
				fontSrc: ["'self'", 'data:'],
				objectSrc: ["'none'"], // SECURITY: Block plugins and object embedding
				mediaSrc: ["'self'"],
				// SECURITY: Only allow trusted iframe sources
				frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
				frameAncestors: ["'none'"], // SECURITY: Prevent clickjacking
				formAction: ["'self'"], // SECURITY: Prevent form hijacking
				baseUri: ["'self'"], // SECURITY: Restrict base URI
				manifestSrc: ["'self'"],
				workerSrc: ["'self'"],
				upgradeInsecureRequests: isProduction ? [] : null
			}
		},
		// SECURITY: HSTS for HTTPS enforcement
		hsts: isProduction
			? {
					maxAge: 63072000, // 2 years (recommended by security best practices)
					includeSubDomains: true,
					preload: true
				}
			: false,
		// SECURITY: Prevent MIME type sniffing
		noSniff: true,
		// SECURITY: XSS protection (legacy but still useful)
		xssFilter: true,
		// SECURITY: Control referrer information
		referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
		// SECURITY: Prevent IE from opening downloads in site context
		ieNoOpen: true,
		// SECURITY: Prevent framing (clickjacking protection)
		frameguard: { action: 'deny' },
		// SECURITY: Control DNS prefetching
		dnsPrefetchControl: { allow: false },
		// SECURITY: Block cross-domain policies
		permittedCrossDomainPolicies: false,
		// SECURITY: Hide server information
		hidePoweredBy: true,
		// SECURITY: Additional security headers
		crossOriginEmbedderPolicy: false, // May break some functionality if enabled
		crossOriginOpenerPolicy: {
			policy: isProduction ? 'same-origin' : 'unsafe-none'
		},
		crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for API
		// SECURITY: Origin-Agent-Cluster isolation
		originAgentCluster: true
	})

	logger.log('✅ Security headers configured')

	// Register Fastify hooks for request lifecycle management (AFTER app.init)
	try {
		const requestLoggerService = app.get(FastifyRequestLoggerService)
		requestLoggerService.registerHooks(fastifyInstance)
		logger.log('Fastify request logging hooks registered successfully', {
			phase: 'hooks-configuration'
		})
	} catch (error) {
		logger.warn('Failed to register request logging hooks', {
			error: error instanceof Error ? error.message : 'Unknown error',
			phase: 'hooks-configuration'
		})
	}

	const config = new DocumentBuilder()
		.setTitle('TenantFlow API')
		.setDescription('API documentation')
		.setVersion('1.0')
		.build()
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('docs', app, document)

	// Dynamic port assignment - try configured port first, fallback to available port
	const configuredPort = parseInt(process.env.PORT || '4600', 10)
	let port = configuredPort

	// Helper function to check if port is available
	const isPortAvailable = async (testPort: number): Promise<boolean> => {
		return new Promise(resolve => {
			const server = net.createServer()
			server.listen(testPort, '0.0.0.0', () => {
				server.once('close', () => resolve(true))
				server.close()
			})
			server.on('error', () => resolve(false))
		})
	}

	// Find an available port if configured port is in use
	let portAvailable = await isPortAvailable(port)
	if (!portAvailable) {
		logger.warn(
			`Configured port ${port} is not available, searching for alternative...`
		)

		// Try ports in range starting from configured port + 1
		const maxAttempts = 10
		let attempts = 0

		while (!portAvailable && attempts < maxAttempts) {
			port = configuredPort + attempts + 1
			portAvailable = await isPortAvailable(port)

			if (portAvailable) {
				logger.log(`Found available port: ${port}`)
				break
			}
			attempts++
		}

		if (!portAvailable) {
			logger.error(
				`Could not find available port after ${maxAttempts} attempts`
			)
			throw new Error(
				`Port range ${configuredPort}-${port} is not available`
			)
		}
	}

	// Health check is handled by AppController

	// Add detailed error logging for startup
	process.on('unhandledRejection', (reason, promise) => {
		logger.error('Unhandled Rejection', {
			promise: String(promise),
			reason:
				reason instanceof Error
					? {
							message: reason.message,
							stack: reason.stack,
							name: reason.name
						}
					: reason
		})
	})

	process.on('uncaughtException', error => {
		logger.error('Uncaught Exception', {
			error:
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
							name: error.name
						}
					: error
		})
		process.exit(1)
	})

	try {
		// Track server startup performance
		const serverStartupPerfLogger = new PerformanceLogger(
			logger,
			'server-startup',
			{
				port,
				environment: process.env.NODE_ENV
			}
		)
		serverStartupPerfLogger.complete({ port, started: true })

		logger.log('Starting server', {
			port,
			configuredPort: process.env.PORT,
			environment: process.env.NODE_ENV,
			host: '0.0.0.0'
		})

		const listenStartTime = Date.now()
		await app.listen(port, '0.0.0.0')
		const listenTime = Date.now() - listenStartTime

		const totalBootstrapTime = Date.now() - bootstrapStartTime
		bootstrapPerfLogger.complete({
			port,
			totalBootstrapTime,
			performanceBreakdown: {
				moduleLoad: moduleLoadTime,
				appInit: Date.now() - moduleLoadStartTime,
				serverListen: listenTime,
				total: totalBootstrapTime
			}
		})

		logger.log('Server startup completed', {
			port,
			host: '0.0.0.0',
			performanceSummary: {
				moduleLoadTime: `${moduleLoadTime}ms`,
				listenTime: `${listenTime}ms`,
				totalBootstrapTime: `${totalBootstrapTime}ms`
			}
		})

		// Update the logger with the actual running port
		setRunningPort(port)

		// Health check - skip in production Docker container
		let healthCheckPassed = true // Default to true

		// Skip health check in production to avoid fetch issues in Docker
		if (process.env.NODE_ENV !== 'production') {
			const healthUrls = [
				`http://0.0.0.0:${port}/health`,
				`http://0.0.0.0:${port}/`
			]

			healthCheckPassed = false
			const healthCheckPerfLogger = new PerformanceLogger(
				logger,
				'health-check-validation'
			)

			for (const url of healthUrls) {
				try {
					const testResponse = await fetch(url, {
						method: 'GET',
						headers: { Accept: 'application/json' }
					}).catch(() => null)

					if (testResponse) {
						logDebug('Health check response received', {
							url,
							status: testResponse.status,
							statusText: testResponse.statusText
						})

						if (testResponse.ok) {
							healthCheckPassed = true
							const responseText = await testResponse
								.text()
								.catch(() => 'No response body')
							logger.log('Health check endpoint accessible', {
								url,
								status: testResponse.status,
								responsePreview: responseText.substring(0, 100)
							})
						}
					} else {
						logger.warn('No response from health check endpoint', {
							url
						})
					}
				} catch (error) {
					logger.warn('Health check failed for endpoint', {
						url,
						error:
							error instanceof Error
								? error.message
								: 'Unknown error'
					})
				}
			}

			if (!healthCheckPassed) {
				logger.error(
					'All health checks failed - server may not be accessible'
				)

				// Additional debugging - check if Fastify is actually listening
				try {
					const fastifyInstance = app.getHttpAdapter().getInstance()
					logDebug('Fastify server diagnostic info', {
						listening: fastifyInstance.server?.listening,
						address: fastifyInstance.server?.address()
					})
				} catch (error) {
					logger.error('Failed to retrieve Fastify diagnostic info', {
						error
					})
				}
			} else {
				healthCheckPerfLogger.complete({ healthCheckPassed })
			}
		} else {
			logger.log('Skipping health check in production environment')
		}

		if (isProduction) {
			logger.log('TenantFlow API Server connected successfully', {
				port,
				environment: 'production',
				healthCheckPassed
			})
		} else {
			const baseUrl = `http://localhost:${port}`
			logger.log('TenantFlow API Server running in development mode', {
				baseUrl,
				port,
				environment,
				endpoints: {
					api: `${baseUrl}`,
					docs: `${baseUrl}/docs`,
					health: `${baseUrl}/health`
				},
				authentication: 'Supabase Hybrid Mode',
				corsOrigins: finalCorsOrigins,
				healthCheckPassed
			})
		}
	} catch (error) {
		bootstrapPerfLogger.error(error as Error)
		logger.error('Failed to start server', {
			port,
			error:
				error instanceof Error
					? {
							message: error.message,
							stack: error.stack,
							name: error.name,
							code: (error as unknown as Record<string, unknown>)
								?.code,
							errno: (error as unknown as Record<string, unknown>)
								?.errno,
							syscall: (
								error as unknown as Record<string, unknown>
							)?.syscall,
							address: (
								error as unknown as Record<string, unknown>
							)?.address,
							port: (error as unknown as Record<string, unknown>)
								?.port
						}
					: error
		})
		throw error
	}
}

bootstrap().catch(error => {
	const errorLogger = new Logger('Bootstrap')
	errorLogger.error('FATAL: Bootstrap failed:', error)
	process.exit(1)
})
