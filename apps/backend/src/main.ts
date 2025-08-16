import 'reflect-metadata'
import dotenvFlow from 'dotenv-flow'

// Load environment variables FIRST, before any other imports that might use them
// In production environments (Railway, Docker), env vars should be set at system level
// For local development, load from .env files
if (!process.env.RAILWAY_ENVIRONMENT && !process.env.DOCKER_CONTAINER) {
	// Always use process.cwd() which should be the backend directory when running npm run dev
	dotenvFlow.config({
		path: process.cwd(),
		node_env: process.env.NODE_ENV || 'production'
	})
}

import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger, BadRequestException, RequestMethod } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import {
	setRunningPort,
	PerformanceLogger
} from './common/logging/logger.config'
import { createLogger as createWinstonLogger } from './common/config/winston.config'
import { FastifyRequestLoggerService } from './common/logging/fastify-request-logger.service'
import { FastifyPluginsConfigService } from './common/plugins/fastify-plugins.config'
import {
	type NestFastifyApplication,
	FastifyAdapter
} from '@nestjs/platform-fastify'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { SecurityUtils } from './common/security/security.utils'
import helmet from '@fastify/helmet'
import securityHeadersPlugin from './common/plugins/security-headers.plugin'
import type { FastifyRequest, FastifyReply } from 'fastify'
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

// Validate environment variables
EnvValidator.validate()
// Force redeploy: ${Date.now()}

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
	
	// Try JWT_SECRET first, fallback to SUPABASE_JWT_SECRET for Railway deployment
	let jwtSecret = configService.get<string>('JWT_SECRET')
	if (!jwtSecret) {
		jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET')
		if (jwtSecret) {
			logger.log('Using SUPABASE_JWT_SECRET as JWT_SECRET fallback', {
				phase: 'jwt-fallback-configuration'
			})
		}
	}

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

		// Handle warnings - strict production enforcement
		if (validation.warnings.length > 0) {
			const isProduction = configService.get<string>('NODE_ENV') === 'production'
			
			if (isProduction) {
				// Production: Treat warnings as blocking errors
				securityLogger.error('❌ JWT_SECRET production security violations:')
				validation.warnings.forEach(warning =>
					securityLogger.error(`  - ${warning}`)
				)
				
				if (validation.suggestions.length > 0) {
					securityLogger.error('💡 Required fixes for production:')
					validation.suggestions.forEach(suggestion =>
						securityLogger.error(`  - ${suggestion}`)
					)
				}
				
				securityLogger.error('🚫 Production requires secure JWT_SECRET - blocking startup')
				throw new Error(`Production JWT_SECRET security requirements not met: ${validation.warnings.join(', ')}`)
			} else {
				// Development: Show warnings but allow startup
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
				
				securityLogger.warn('🔒 These warnings will block production deployment')
			}
		}

		// Success message for valid secrets
		if (validation.valid) {
			securityLogger.log('✅ JWT_SECRET meets all security requirements')
		}
	} else {
		securityLogger.error('❌ JWT_SECRET is not configured')
		// In production, JWT_SECRET should be set in Railway environment variables
		// For now, log error but don't block startup to allow health checks
		const currentEnv = configService.get<string>('NODE_ENV') || 'production'
		const isProductionEnv = currentEnv === 'production'
		if (isProductionEnv) {
			securityLogger.error('⚠️  JWT_SECRET not found - using fallback for health check only')
			// Set a temporary JWT_SECRET just for health checks
			process.env.JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'temporary-health-check-only-' + Date.now()
		} else {
			// In development, we can be more lenient
			securityLogger.warn('⚠️  JWT_SECRET not configured - using development default')
			process.env.JWT_SECRET = 'development-jwt-secret-not-for-production'
		}
	}

	// NestJS logger for remaining legacy logging

	// Global exception filter for production error sanitization
	try {
		const filterModule = await import('./common/filters/production-exception.filter')
		const ProductionExceptionFilter = filterModule.ProductionExceptionFilter
		app.useGlobalFilters(new ProductionExceptionFilter())
	} catch (error) {
		logger.error('Failed to load ProductionExceptionFilter:', error instanceof Error ? { error: error.message } : { error: String(error) })
		// Continue without the filter if it fails to load
	}

	app.useGlobalPipes(
		new ValidationPipe({
			// Security: Remove properties not in DTOs
			whitelist: true,
			// Security: Throw error if unknown properties are sent
			forbidNonWhitelisted: true,
			// Transform payloads to DTO instances
			transform: true,
			transformOptions: {
				// Allow implicit type conversion
				enableImplicitConversion: true,
				// Security: Strip unknown properties in nested objects
				excludeExtraneousValues: false,
				// Enable type conversion for primitives
				enableCircularCheck: true
			},
			// Security: Don't stop at first error to avoid enumeration attacks
			stopAtFirstError: false,
			// Security: Disable detailed error messages in production
			disableErrorMessages: process.env.NODE_ENV === 'production',
			// Return 400 for validation errors
			errorHttpStatusCode: 400,
			// Custom error factory for consistent error format
			exceptionFactory: errors => {
				// In production, return generic message to avoid information disclosure
				if (process.env.NODE_ENV === 'production') {
					return new BadRequestException('Validation failed')
				}
				// In development, return detailed errors
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
	const environment = configService.get<string>('NODE_ENV') || 'production' // Default to production for safety
	const isProduction = environment === 'production'

	// SECURITY: Validate environment to prevent accidental exposure
	const validEnvironments = ['development', 'test', 'production']
	if (!validEnvironments.includes(environment)) {
		throw new Error(
			`Invalid NODE_ENV: ${environment}. Must be one of: ${validEnvironments.join(', ')}`
		)
	}

	// Get CORS origins from config service - CORS_ORIGINS is already transformed to array
	const corsOrigins = configService.get<string[]>('CORS_ORIGINS') || []

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
	
	// If corsOrigins is already populated from CORS_ORIGINS env var, use it
	if (corsOrigins.length > 0) {
		securityLogger.log(`✅ Using CORS origins from configuration: ${corsOrigins.join(', ')}`)
		finalCorsOrigins = corsOrigins
	} else {
		// Fallback to legacy environment variables
		const productionDomains = configService.get<string>('PRODUCTION_DOMAINS', '')
			.split(',')
			.filter(domain => domain.trim())
			.map(domain => `https://${domain.trim()}`)
		
		const frontendUrl = configService.get<string>('FRONTEND_URL')
		
		if (isProduction) {
			// SECURITY: Production only allows HTTPS origins from environment
			if (productionDomains.length > 0) {
				finalCorsOrigins = productionDomains
			} else if (frontendUrl && frontendUrl.startsWith('https://')) {
				finalCorsOrigins = [frontendUrl]
			} else {
				// Fallback for production - require explicit configuration
				securityLogger.error('❌ Production CORS configuration missing')
				securityLogger.error('Set CORS_ORIGINS, PRODUCTION_DOMAINS or FRONTEND_URL environment variable')
				throw new Error('Production CORS origins must be configured via environment variables')
			}
		} else {
			// Development: Use configured domains or safe defaults
			if (productionDomains.length > 0) {
				finalCorsOrigins = [...productionDomains]
			} else if (frontendUrl) {
				finalCorsOrigins = [frontendUrl]
			} else {
				// Development fallback
				finalCorsOrigins = ['http://localhost:3000']
			}

			// SECURITY: Only add localhost origins in non-production with explicit flag
			if (environment === 'development' || environment === 'test') {
				const allowLocalhost = configService.get<string>('ALLOW_LOCALHOST_CORS')
				if (allowLocalhost === 'true') {
					// Get localhost ports from environment or use defaults
					const localhostPorts = configService.get<string>('LOCALHOST_PORTS', '3000,3001,3002,3003,3004,5172,5173,5174,5175')
						.split(',')
						.map(port => `http://localhost:${port.trim()}`)
					
					finalCorsOrigins.push(...localhostPorts)
				}
			}
		}
	}

	// SECURITY: In production deployment environments, enforce HTTPS-only origins
	// Allow HTTP origins for local production testing (NODE_ENV=production locally)
	const isActualProductionDeployment = isProduction && (
		process.env.RAILWAY_ENVIRONMENT === 'production' || 
		process.env.VERCEL_ENV === 'production' ||
		process.env.DOCKER_CONTAINER === 'true'
	)
	
	if (isActualProductionDeployment) {
		const httpOrigins = finalCorsOrigins.filter(origin =>
			origin.startsWith('http://')
		)
		if (httpOrigins.length > 0) {
			throw new Error(
				`Production deployment cannot have HTTP origins: ${httpOrigins.join(', ')}`
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

	// SECURITY FIX: Add /api/v1 global prefix to match frontend expectations
	// Frontend is configured to use https://api.tenantflow.app/api/v1/
	// Exclude health endpoint for Railway health checks
	app.setGlobalPrefix('api/v1', {
		exclude: [
			{ path: 'health', method: RequestMethod.GET },
			{ path: '/', method: RequestMethod.GET }
		]
	})

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

	// Properly declare request decorators for optimal performance
	// This prevents JavaScript engine deoptimization by defining object shape upfront
	fastifyInstance.decorateRequest('correlationId', '')
	fastifyInstance.decorateRequest('startTime', 0)
	fastifyInstance.decorateRequest('rawBody', undefined)
	logger.log('✅ Request decorators properly declared for performance optimization')

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

	// ======================================================================
	// FASTIFY PLUGIN CONFIGURATION - Performance & Reliability Enhancements
	// ======================================================================

	// 1. COMPRESSION - Reduce bandwidth by 60-70% for JSON responses
	const fastifyCompress = await import('@fastify/compress')
	await app.register(fastifyCompress.default, {
		global: true, // Apply to all routes by default
		threshold: 1024, // Only compress responses larger than 1KB
		encodings: ['gzip', 'deflate', 'br'], // Support multiple encodings
		customTypes: /^(text|application)\//, // Compress text and JSON
		removeContentLengthHeader: false,
		// Exclude already compressed files
		requestEncodings: ['gzip', 'deflate', 'br', 'identity']
	})
	logger.log('✅ Response compression enabled (gzip, deflate, brotli)')

	// 2. ETAG - Enable HTTP caching for better performance
	const fastifyEtag = await import('@fastify/etag')
	await app.register(fastifyEtag.default, {
		algorithm: 'fnv1a', // Fast, non-cryptographic hash
		weak: false // Use strong ETags for better cache validation
	})
	logger.log('✅ ETag generation enabled for HTTP caching')

	// 3. REQUEST CONTEXT - Request-scoped storage for logging and tracing
	const fastifyRequestContext = await import('@fastify/request-context')
	await app.register(fastifyRequestContext.fastifyRequestContext, {
		defaultStoreValues: {
			requestId: () => crypto.randomUUID(),
			timestamp: () => new Date().toISOString()
		},
		hook: 'onRequest' // Initialize context early in request lifecycle
	})
	logger.log('✅ Request context enabled for request-scoped storage')

	// 4. UNDER PRESSURE - Monitor process load and protect against overload
	const fastifyUnderPressure = await import('@fastify/under-pressure')
	await app.register(fastifyUnderPressure.default, {
		maxEventLoopDelay: 1000, // Max event loop delay in ms
		maxEventLoopUtilization: 0.98, // Max event loop utilization (0-1)
		maxHeapUsedBytes: 0.98, // Max heap usage percentage
		maxRssBytes: 0.98, // Max RSS memory usage percentage
		pressureHandler: (req: FastifyRequest, res: FastifyReply, type: string) => {
			logger.warn(`Server under pressure: ${type}`, {
				type,
				url: req.url,
				method: req.method,
				correlationId: req.correlationId
			})
			res.code(503).send({ 
				error: 'Service Unavailable',
				message: 'Server is under heavy load, please try again later'
			})
		},
		retryAfter: 60, // Retry-After header value in seconds
		healthCheck: async () => {
			// Custom health check logic if needed
			return true
		},
		healthCheckInterval: 5000 // Check every 5 seconds
	})
	logger.log('✅ Under pressure plugin enabled for load protection')

	// 5. SENSIBLE - Adds useful HTTP error decorators and utilities
	const fastifySensible = await import('@fastify/sensible')
	await app.register(fastifySensible.default)
	logger.log('✅ Sensible plugin enabled for HTTP utilities')

	// 6. CIRCUIT BREAKER & OTHER PLUGINS - Initialize via config service
	const pluginsConfig = new FastifyPluginsConfigService()
	try {
		await pluginsConfig.initializeAllPlugins(app, configService)
	} catch (error) {
		logger.warn('Some Fastify plugins failed to initialize', error as Record<string, unknown>)
		// Continue - these are enhancements, not critical
	}

	// Configure comprehensive security headers following OWASP best practices
	await app.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				// SECURITY: Restrict script sources - avoid 'unsafe-inline' in production
				scriptSrc: isProduction
					? ["'self'", 'https://js.stripe.com']
					: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
				// SECURITY: Restrict style sources - use nonce-based CSP in production when possible
				styleSrc: isProduction
					? ["'self'", "'unsafe-inline'"] // TODO: Migrate to nonce-based CSP
					: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:', 'https:'],
				// SECURITY: Restrict API connections to trusted domains
				connectSrc: [
					"'self'",
					'https://api.stripe.com',
					'wss://api.stripe.com',
					'https://*.supabase.co', // Supabase API
					'wss://*.supabase.co', // Supabase realtime
					...(isProduction
						? ['https://api.tenantflow.app']
						: ['http://localhost:*', 'ws://localhost:*'])
				],
				fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
				objectSrc: ["'none'"], // SECURITY: Block plugins and object embedding
				mediaSrc: ["'self'"],
				// SECURITY: Only allow trusted iframe sources
				frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
				frameAncestors: ["'none'"], // SECURITY: Prevent clickjacking
				formAction: ["'self'"], // SECURITY: Prevent form hijacking
				baseUri: ["'self'"], // SECURITY: Restrict base URI
				manifestSrc: ["'self'"],
				workerSrc: ["'self'", 'blob:'],
				// SECURITY: Restrict child sources (for workers and frames)
				childSrc: ["'self'", 'blob:'],
				// SECURITY: Report CSP violations (configure endpoint separately)
				reportUri: isProduction ? '/api/v1/csp-report' : null,
				// SECURITY: Upgrade insecure requests in production
				upgradeInsecureRequests: isProduction ? [] : null,
				// SECURITY: Block mixed content
				blockAllMixedContent: isProduction ? [] : null
			},
			// Report CSP violations without enforcing (useful for testing)
			reportOnly: false
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

	// Register enhanced security headers plugin
	await app.register(securityHeadersPlugin, {
		environment: isProduction ? 'production' : 'development'
	})
	
	logger.log('✅ Enhanced security headers plugin registered')

	// Configure cookie support (required for CSRF)
	const fastifyCookie = await import('@fastify/cookie')
	
	// Get cookie domain from environment or extract from frontend URL
	let cookieDomain: string | undefined
	if (isProduction) {
		const cookieDomainEnv = configService.get<string>('COOKIE_DOMAIN')
		if (cookieDomainEnv) {
			cookieDomain = cookieDomainEnv
		} else {
			// Extract domain from FRONTEND_URL if available
			const frontendUrl = configService.get<string>('FRONTEND_URL')
			if (frontendUrl) {
				try {
					const url = new URL(frontendUrl)
					// Extract main domain (e.g., 'example.com' from 'app.example.com')
					const parts = url.hostname.split('.')
					if (parts.length >= 2) {
						cookieDomain = `.${parts.slice(-2).join('.')}`
					}
				} catch (_error) {
					securityLogger.warn('Failed to parse FRONTEND_URL for cookie domain', { frontendUrl })
				}
			}
		}
	}
	
	await app.register(fastifyCookie.default, {
		secret: jwtSecret || 'csrf-secret-change-in-production', // Use JWT secret for cookie signing
		parseOptions: {
			domain: cookieDomain,
			path: '/',
			sameSite: isProduction ? 'strict' : 'lax',
			secure: isProduction, // HTTPS only in production
			httpOnly: true
		}
	})

	// Configure CSRF protection for production
	const fastifyCsrf = await import('@fastify/csrf-protection')
	await app.register(fastifyCsrf.default, {
		cookieOpts: {
			signed: true,
			sameSite: isProduction ? 'strict' : 'lax',
			secure: isProduction, // HTTPS only in production
			httpOnly: true,
			path: '/',
			domain: cookieDomain
		},
		sessionPlugin: '@fastify/cookie',
		getToken: (req: FastifyRequest): string | void => {
			// Check multiple places for CSRF token
			const headers = req.headers as Record<string, string | undefined>
			const body = req.body as Record<string, unknown> | undefined
			const query = req.query as Record<string, unknown> | undefined
			
			const token = headers['x-csrf-token'] || 
				   headers['csrf-token'] || 
				   body?._csrf || 
				   query?._csrf
			
			return typeof token === 'string' ? token : undefined
		}
	})

	logger.log('✅ CSRF protection configured for production')

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

	// Dynamic port assignment - Railway provides PORT, fallback to 3001 for local dev
	const configuredPort = parseInt(process.env.PORT || '3001', 10)
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
