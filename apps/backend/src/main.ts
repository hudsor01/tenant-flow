import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()
import { NestFactory } from '@nestjs/core'
<<<<<<< HEAD
import { ValidationPipe } from '@nestjs/common'
=======
import { Logger, ValidationPipe } from '@nestjs/common'
>>>>>>> origin/main
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import {
	FastifyAdapter,
	type NestFastifyApplication
} from '@nestjs/platform-fastify'
<<<<<<< HEAD
import pino from 'pino'
=======
>>>>>>> origin/main
import helmet from '@fastify/helmet'
import compress from '@fastify/compress'
import etag from '@fastify/etag'
import sensible from '@fastify/sensible'
import underPressure from '@fastify/under-pressure'
import circuitBreaker from '@fastify/circuit-breaker'
import rateLimit from '@fastify/rate-limit'
import requestContext from '@fastify/request-context'
import cookie from '@fastify/cookie'
import csrfProtection from '@fastify/csrf-protection'
import env from '@fastify/env'
import multipart from '@fastify/multipart'
<<<<<<< HEAD
import { corsOptions } from './config/cors.options'
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter'

// Node.js error interface with common error properties
interface NodeError extends Error {
	code?: string
	errno?: number
	syscall?: string
	path?: string
	address?: string
	port?: number
}

async function bootstrap() {
	// Create bootstrap Pino logger (before Fastify is available)
	const logger = pino({
		level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
		transport:
			process.env.NODE_ENV !== 'production'
				? {
						target: 'pino-pretty',
						options: {
							colorize: true,
							translateTime: 'HH:MM:ss Z',
							ignore: 'pid,hostname'
						}
					}
				: undefined,
		base: { component: 'Bootstrap' }
	})

	logger.info('=== TENANTFLOW BACKEND STARTUP ===')
	logger.info(`Node.js version: ${process.version}`)
	logger.info(`Environment: ${process.env.NODE_ENV}`)
	logger.info(`Docker Container: ${process.env.DOCKER_CONTAINER ?? 'false'}`)
	logger.info(
		`Railway Environment: ${process.env.RAILWAY_ENVIRONMENT ?? 'none'}`
	)
	logger.info(`Target Port: ${process.env.PORT ?? 4600}`)

	logger.info('Creating NestJS application...')
	const fastifyAdapter = new FastifyAdapter({
		trustProxy: true,
		bodyLimit: 10485760,
		logger: {
			level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
			transport:
				process.env.NODE_ENV !== 'production'
					? {
							target: 'pino-pretty',
							options: {
								colorize: true,
								translateTime: 'HH:MM:ss Z',
								ignore: 'pid,hostname'
							}
						}
					: undefined
		}
	})
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		fastifyAdapter,
		{
			rawBody: true, // Enable raw body for webhook signature verification
			logger: false // Disable NestJS logger in favor of Pino
		}
	)
	logger.info('NestJS application created successfully')

	const configService = app.get(ConfigService)

	logger.info('Configuring application middleware...')

	// Core configuration
	logger.info('Setting global prefix: api/v1')
=======
import { createCorsOptions } from './config/cors.options'

async function bootstrap() {
	const logger = new Logger('Bootstrap')

	logger.log('=== TENANTFLOW BACKEND STARTUP ===')
	logger.log(`Node.js version: ${process.version}`)
	logger.log(`Environment: ${process.env.NODE_ENV}`)
	logger.log(`Docker Container: ${process.env.DOCKER_CONTAINER || 'false'}`)
	logger.log(
		`Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'none'}`
	)
	logger.log(`Target Port: ${process.env.PORT || 4600}`)

	logger.log('Creating NestJS application...')
	const fastifyAdapter = new FastifyAdapter({ trustProxy: true, bodyLimit: 10485760 })
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		fastifyAdapter
	)
	logger.log('NestJS application created successfully')

	const configService = app.get(ConfigService)

	logger.log('Configuring application middleware...')

	// Core configuration
	logger.log('Setting global prefix: api/v1')
>>>>>>> origin/main
	app.setGlobalPrefix('api/v1', {
		exclude: [
			{ path: 'health', method: 0 },
			{ path: 'health/ping', method: 0 },
			{ path: 'health/ready', method: 0 },
			{ path: 'health/debug', method: 0 },
			{ path: '/', method: 0 }
		]
	})
<<<<<<< HEAD

	// Configure CORS using centralized configuration
	logger.info('Configuring CORS...')
	app.enableCors(corsOptions)
	logger.info('CORS enabled')

	// Use NestJS native validation pipe with better configuration
	logger.info('Setting up validation pipes...')
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // Strip properties not in DTO
			forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
			transform: true, // Auto-transform payloads to DTO instances
			transformOptions: {
				enableImplicitConversion: true // Allow implicit type conversion
			}
		})
	)

	// Use NestJS native global exception filter (replaces custom ErrorHandlerService)
	logger.info('Setting up global exception filters...')
	app.useGlobalFilters(new GlobalExceptionFilter())
	logger.info('Global exception filters registered')

	// Core Fastify plugins - optimized order for performance and security
	logger.info('Registering Fastify core plugins...')

	// 1. Environment validation (fail fast if config invalid)
	await app.register(env, {
		schema: {
			type: 'object',
			required: ['NODE_ENV'],
			properties: {
				NODE_ENV: {
					type: 'string',
					enum: ['development', 'production', 'test']
				},
				PORT: { type: 'string', default: '4600' },
				SUPABASE_URL: { type: 'string' },
				SUPABASE_SERVICE_ROLE_KEY: { type: 'string' },
				JWT_SECRET: { type: 'string' }
			}
		},
		dotenv: false // Already handled by dotenv.config()
	})
	logger.info('Environment validation registered')

	// 2. Request context for correlation IDs and tracing
	await app.register(requestContext, {
		defaultStoreValues: {
			correlationId: () =>
				`req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			traceId: () =>
				`trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			startTime: () => Date.now(),
			timing: () => ({ startTime: Date.now() }),
			// Request metadata will be populated by hooks
			method: () => 'unknown',
			path: () => 'unknown',
			ip: () => 'unknown'
		},
		hook: 'onRequest' // Initialize context early in request lifecycle
	})
	logger.info('Request context plugin registered')

	// Request context hooks removed - using Fastify native hooks directly if needed

	// Native performance monitoring via Railway logs - zero custom code needed
	logger.info('Performance monitoring: Railway native metrics enabled')
	logger.info('Memory monitoring: Railway native CPU/RAM tracking enabled')
	logger.info('Request context: NestJS AsyncLocalStorage enabled')

	// 3. Cookie support for session management
	await app.register(cookie, {
		secret: process.env.COOKIE_SECRET ?? process.env.JWT_SECRET,
		hook: 'onRequest', // Parse cookies early
		parseOptions: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
			maxAge: 24 * 60 * 60 * 1000 // 24 hours
		}
	})
	logger.info('Cookie support registered')

	// 4. CSRF protection at Fastify level (exclude webhook endpoints)
=======

	// Configure CORS using centralized configuration
	logger.log('Configuring CORS...')
	const corsOptions = createCorsOptions()
	app.enableCors(corsOptions)
	logger.log('CORS enabled')

	// Use NestJS native validation pipe with better configuration
	logger.log('Setting up validation pipes...')
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // Strip properties not in DTO
			forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
			transform: true, // Auto-transform payloads to DTO instances
			transformOptions: {
				enableImplicitConversion: true // Allow implicit type conversion
			}
		})
	)

	// Core Fastify plugins - optimized order for performance and security
	logger.log('Registering Fastify core plugins...')
	
	// 1. Environment validation (fail fast if config invalid)
	await app.register(env, {
		schema: {
			type: 'object',
			required: ['NODE_ENV'],
			properties: {
				NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'] },
				PORT: { type: 'string', default: '4600' },
				SUPABASE_URL: { type: 'string' },
				SUPABASE_SERVICE_ROLE_KEY: { type: 'string' },
				JWT_SECRET: { type: 'string' }
			}
		},
		dotenv: false // Already handled by dotenv.config()
	})
	logger.log('Environment validation registered')

	// 2. Request context for correlation IDs and tracing
	await app.register(requestContext, {
		defaultStoreValues: {
			correlationId: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			traceId: () => `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			startTime: () => Date.now(),
			timing: () => ({ startTime: Date.now() }),
			// Request metadata will be populated by hooks
			method: () => 'unknown',
			path: () => 'unknown',
			ip: () => 'unknown'
		},
		hook: 'onRequest' // Initialize context early in request lifecycle
	})
	logger.log('Request context plugin registered')
	
	// Initialize request context hooks (after request context plugin)
	const { RequestContextHooksService } = await import('./shared/services/request-context-hooks.service')
	const contextHooksService = new RequestContextHooksService()
	contextHooksService.registerContextHooks(app.getHttpAdapter().getInstance())
	logger.log('Request context hooks registered')

	// Initialize unified performance monitoring hooks (after context hooks)
	const { UnifiedPerformanceMonitoringService } = await import('./shared/services/unified-performance-monitoring.service')
	const { MemoryMonitoringService } = await import('./shared/services/memory-monitoring.service')
	const { MetricsAggregatorService } = await import('./shared/services/metrics-aggregator.service')
	
	const unifiedPerformanceService = new UnifiedPerformanceMonitoringService()
	const memoryService = new MemoryMonitoringService()
	const metricsAggregator = new MetricsAggregatorService(unifiedPerformanceService, memoryService)
	
	// Register hooks in correct order
	unifiedPerformanceService.registerPerformanceHooks(app.getHttpAdapter().getInstance())
	memoryService.registerMemoryPressureIntegration(app.getHttpAdapter().getInstance())
	metricsAggregator.startTrendCollection()
	
	logger.log('Unified performance monitoring system registered')
	logger.log('Memory monitoring and pressure integration registered')
	logger.log('Metrics aggregation and trend collection started')

	// 3. Cookie support for session management
	await app.register(cookie, {
		secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,
		hook: 'onRequest', // Parse cookies early
		parseOptions: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
			maxAge: 24 * 60 * 60 * 1000 // 24 hours
		}
	})
	logger.log('Cookie support registered')

	// 4. CSRF protection at Fastify level
>>>>>>> origin/main
	await app.register(csrfProtection, {
		cookieOpts: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
		},
		sessionPlugin: '@fastify/cookie',
<<<<<<< HEAD
		getToken: req => {
			// Skip CSRF for webhook endpoints
			if (req.url?.includes('/webhook')) {
				return undefined
			}
			const csrfToken = req.headers['x-csrf-token']
			const xsrfToken = req.headers['x-xsrf-token']
			if (typeof csrfToken === 'string') {
				return csrfToken
			}
			if (typeof xsrfToken === 'string') {
				return xsrfToken
			}
=======
		getToken: (req) => {
			const csrfToken = req.headers['x-csrf-token']
			const xsrfToken = req.headers['x-xsrf-token']
			if (typeof csrfToken === 'string') {return csrfToken}
			if (typeof xsrfToken === 'string') {return xsrfToken}
>>>>>>> origin/main
			return undefined
		},
		cookieKey: '_csrf'
	})
<<<<<<< HEAD
	logger.info('CSRF protection registered')
=======
	logger.log('CSRF protection registered')
>>>>>>> origin/main

	// 5. Multipart support for file uploads
	await app.register(multipart, {
		limits: {
			fieldNameSize: 100, // Max field name size
<<<<<<< HEAD
			fieldSize: 100, // Max field value size
=======
			fieldSize: 100, // Max field value size  
>>>>>>> origin/main
			fields: 10, // Max number of non-file fields
			fileSize: 10485760, // 10MB max file size (matches body limit)
			files: 5, // Max number of file fields
			headerPairs: 2000 // Max number of header key=>value pairs
		},
		attachFieldsToBody: 'keyValues' // Attach non-file fields to body
	})
<<<<<<< HEAD
	logger.info('Multipart support registered (file uploads)')
=======
	logger.log('Multipart support registered (file uploads)')
>>>>>>> origin/main

	// 6. Response compression (after request parsing, before response generation)
	await app.register(compress, {
		global: true,
		encodings: ['gzip', 'deflate', 'br'], // brotli (br) preferred, fallback to gzip
		threshold: 1024, // Only compress responses > 1KB
		customTypes: /^text\/|\+json$|\+text$|\+xml$|^application\/.*json.*$/, // Enhanced pattern
		zlibOptions: {
			level: 6, // Balanced compression vs speed
			chunkSize: 16 * 1024 // 16KB chunks
		},
		brotliOptions: {
			params: {
				// Using numeric values directly instead of require imports
				[1]: 0, // BROTLI_PARAM_MODE: BROTLI_MODE_TEXT
				[11]: 6 // BROTLI_PARAM_QUALITY: 6 (balanced)
			}
		}
	})
<<<<<<< HEAD
	logger.info('Compression plugin registered (gzip/brotli)')
=======
	logger.log('Compression plugin registered (gzip/brotli)')
>>>>>>> origin/main

	// 7. ETag generation for efficient caching
	await app.register(etag, {
		algorithm: 'fnv1a', // Faster than MD5, good distribution
		weak: true // Use weak ETags for better performance
	})
<<<<<<< HEAD
	logger.info('ETag plugin registered (fnv1a)')
=======
	logger.log('ETag plugin registered (fnv1a)')
>>>>>>> origin/main

	// 8. Rate limiting (more granular than NestJS throttler)
	await app.register(rateLimit, {
		global: true,
		max: 100, // 100 requests per window (aligns with NestJS config)
		timeWindow: '1 minute',
		cache: 10000, // Cache up to 10k IP addresses
		allowList: ['127.0.0.1', '::1'], // Whitelist local IPs
		continueExceeding: true, // Don't ban, just rate limit
<<<<<<< HEAD
		keyGenerator: req => {
			// Enhanced key generation for better rate limiting
			const forwarded = req.headers['x-forwarded-for']
			const realIP = req.headers['x-real-ip']
			const remoteAddress = req.socket.remoteAddress

			// Normalize possible header shapes to single values
			const forwardedValue = Array.isArray(forwarded)
				? forwarded[0]
				: forwarded
			const realIpValue = Array.isArray(realIP) ? realIP[0] : realIP

			// Prefer the first entry of x-forwarded-for (if present), otherwise fallback
			let clientIp = 'unknown'
			if (
				typeof forwardedValue === 'string' &&
				forwardedValue.trim() !== ''
			) {
				clientIp = forwardedValue.split(',')[0].trim()
			} else if (
				typeof realIpValue === 'string' &&
				realIpValue.trim() !== ''
			) {
				clientIp = realIpValue.trim()
			} else if (
				typeof remoteAddress === 'string' &&
				remoteAddress.trim() !== ''
			) {
				clientIp = remoteAddress
			}

			return String(clientIp)
=======
		keyGenerator: (req) => {
			// Enhanced key generation for better rate limiting
			const forwarded = req.headers['x-forwarded-for'] as string
			const realIP = req.headers['x-real-ip'] as string
			const remoteAddress = req.socket.remoteAddress
			return forwarded?.split(',')[0]?.trim() || realIP || remoteAddress || 'unknown'
>>>>>>> origin/main
		},
		errorResponseBuilder: (_req, context) => ({
			code: 'RATE_LIMIT_EXCEEDED',
			error: 'Rate limit exceeded',
			message: `Too many requests. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
			statusCode: 429,
			retryAfter: context.ttl
		}),
		onExceeding: (req, key) => {
			logger.warn(`Rate limit approaching for ${key}: ${req.ip}`)
		},
		onExceeded: (req, key) => {
			logger.warn(`Rate limit exceeded for ${key}: ${req.ip}`)
		}
	})
<<<<<<< HEAD
	logger.info('Rate limiting plugin registered (100 req/min)')

	// 9. Sensible utilities (adds useful request/response helpers)
	await app.register(sensible)
	logger.info('Sensible utilities plugin registered')

	// 10. Load monitoring and shedding
	// Configure @fastify/under-pressure following official documentation
	// This provides automatic "Service Unavailable" responses under high load
	await app.register(underPressure, {
		maxEventLoopDelay: 1000, // 1 second max event loop delay
		maxHeapUsedBytes: parseInt(process.env.MAX_HEAP_BYTES || '1073741824'), // 1GB default
		maxRssBytes: parseInt(process.env.MAX_RSS_BYTES || '1342177280'), // 1.25GB default
		maxEventLoopUtilization: 0.98, // 98% max event loop utilization
		retryAfter: 50, // Tell clients to retry after 50ms
		message: 'Service temporarily unavailable due to high load',
		// On-demand health check - ONLY runs when /health/pressure endpoint is called
		// No automatic interval checks - perfect for deployments!
		healthCheck: async () => {
			try {
				// Quick event loop responsiveness check
				const start = Date.now()
				await new Promise(resolve => setImmediate(resolve))
				if (Date.now() - start > 100) return false // 100ms threshold

				// Memory percentage check (more reliable than fixed MB)
				const mem = process.memoryUsage()
				const heapPercent = (mem.heapUsed / mem.heapTotal) * 100
				if (heapPercent > 95) return false // 95% heap usage threshold

				return true
			} catch {
				return false
			}
		},
		// NO healthCheckInterval - health check ONLY runs on-demand via endpoint
		exposeStatusRoute: {
			url: '/health/pressure',
			routeOpts: {
				logLevel: 'warn' // Only log warnings for pressure endpoint
			}
		}
	})
	logger.info('Under pressure plugin registered (load monitoring)')
=======
	logger.log('Rate limiting plugin registered (100 req/min)')

	// 9. Sensible utilities (adds useful request/response helpers)
	await app.register(sensible)
	logger.log('Sensible utilities plugin registered')

	// 10. Load monitoring and shedding
	await app.register(underPressure, {
		maxEventLoopDelay: 1000, // 1 second max event loop delay
		maxHeapUsedBytes: 1073741824, // 1GB max heap (adjusted for Railway)
		maxRssBytes: 1342177280, // 1.25GB max RSS (adjusted for Railway)
		maxEventLoopUtilization: 0.98, // 98% max event loop utilization
		retryAfter: 50, // Tell clients to retry after 50ms
		message: 'Service temporarily unavailable due to high load',
		healthCheck: async (_fastifyInstance) => {
			// Enhanced health check with actual service verification
			try {
				const configService = app.get(ConfigService)
				const supabaseUrl = configService.get('SUPABASE_URL')
				// Basic connectivity check without expensive operations
				return !!supabaseUrl
			} catch (error) {
				logger.error('Health check failed:', error)
				return false
			}
		},
		healthCheckInterval: 5000, // Check every 5 seconds
		exposeStatusRoute: '/health/pressure' // Expose pressure metrics
	})
	logger.log('Under pressure plugin registered (load monitoring)')
>>>>>>> origin/main

	// 11. Circuit breaker for external calls
	await app.register(circuitBreaker, {
		threshold: 5, // Open circuit after 5 failures
		timeout: 10000, // 10 second timeout
		resetTimeout: 30000, // Reset after 30 seconds
<<<<<<< HEAD
		onCircuitOpen: req => {
			logger.warn(
				`Circuit breaker opened for ${req.url} - external service failures detected`
			)
		}
	})
	logger.info('Circuit breaker plugin registered')

	// 12. Security middleware (register last to protect all routes) - ENHANCED
	await app.register(helmet, {
		// Enhanced Content Security Policy
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"], // Required for some admin panels
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", 'data:', 'https:'],
				connectSrc: [
					"'self'",
					'https://api.stripe.com',
					'https://*.supabase.co',
					'https://api.resend.com', // Email service
					'https://api.posthog.com' // Analytics (if used)
				],
				frameSrc: [
					"'self'",
					'https://js.stripe.com',
					'https://checkout.stripe.com'
				],
				baseUri: ["'self'"],
				formAction: ["'self'"],
				objectSrc: ["'none'"], // Prevent object/embed/applet
				upgradeInsecureRequests: [], // Force HTTPS
				frameAncestors: ["'none'"] // Prevent clickjacking (X-Frame-Options alternative)
			}
		},
		crossOriginEmbedderPolicy: false, // Allows embedding for Stripe
		// Enhanced HSTS
		hsts: {
			maxAge: 63072000, // 2 years (recommended by security experts)
			includeSubDomains: true,
			preload: true
		},
		// Basic security headers
		hidePoweredBy: true,
		noSniff: true,
		frameguard: { action: 'deny' }
	})
	logger.info('Security middleware registered (enhanced CSP)')

	// Initialize Fastify Type Providers for schema-driven validation
	logger.info('Initializing Fastify Type Providers...')
	try {
		const { initializeTypeProviders, validateEnvironment } = await import(
			'./setup-type-providers.js'
		)

		// Validate environment with schema
		const env = validateEnvironment()
		logger.info(`✅ Environment validated (NODE_ENV: ${env.NODE_ENV})`)

		// Setup type providers
		await initializeTypeProviders(fastifyAdapter)
		logger.info('✅ Fastify Type Providers initialized successfully')
	} catch (typeProviderError) {
		logger.error(
			'❌ Failed to initialize Type Providers: ' +
				String(typeProviderError)
		)
=======
		onCircuitOpen: (req) => {
			logger.warn(`Circuit breaker opened for ${req.url} - external service failures detected`)
		}
	})
	logger.log('Circuit breaker plugin registered')

	// 12. Security middleware (register last to protect all routes)
	await app.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				scriptSrc: ["'self'"],
				imgSrc: ["'self'", "data:", "https:"],
				connectSrc: ["'self'", "https://api.stripe.com", "https://*.supabase.co"],
				frameSrc: ["'self'", "https://js.stripe.com"],
				baseUri: ["'self'"],
				formAction: ["'self'"]
			}
		},
		crossOriginEmbedderPolicy: false, // Allows embedding for Stripe
		hsts: {
			maxAge: 31536000, // 1 year
			includeSubDomains: true,
			preload: true
		}
	})
	logger.log('Security middleware registered (enhanced CSP)')

	// Initialize Fastify Type Providers for schema-driven validation
	logger.log('Initializing Fastify Type Providers...')
	try {
		const { initializeTypeProviders, validateEnvironment } = await import('./setup-type-providers')
		
		// Validate environment with schema
		const env = validateEnvironment()
		logger.log(`✅ Environment validated (NODE_ENV: ${env.NODE_ENV})`)
		
		// Setup type providers
		await initializeTypeProviders(fastifyAdapter)
		logger.log('✅ Fastify Type Providers initialized successfully')
		
	} catch (typeProviderError) {
		logger.error('❌ Failed to initialize Type Providers:', typeProviderError)
>>>>>>> origin/main
		// Continue without type providers in case of setup failure
		logger.warn('⚠️  Continuing without schema-driven type inference')
	}

	// Liveness probe handled by HealthController
<<<<<<< HEAD
	logger.info('Enabling graceful shutdown hooks...')
	app.enableShutdownHooks()

	// Start server
	const portValue = configService.get<string | number>('PORT', 4600)
	const port =
		typeof portValue === 'string' ? parseInt(portValue, 10) : portValue
	logger.info(`Preparing to start server on port ${port}...`)

	try {
		logger.info(`Binding to 0.0.0.0:${port}...`)
		await app.listen(port, '0.0.0.0')

		logger.info('=== SERVER STARTUP SUCCESSFUL ===')
		logger.info(`🚀 Server listening on 0.0.0.0:${port}`)
		logger.info(`🌍 Environment: ${process.env.NODE_ENV}`)
		logger.info(
			`📦 Docker Container: ${process.env.DOCKER_CONTAINER ?? 'false'}`
		)
		logger.info(
			`🚄 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT ?? 'none'}`
		)
		logger.info(
			`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
		)
		logger.info(`⏱️  Startup time: ${process.uptime()}s`)

		// Health check endpoints
		logger.info('=== HEALTH CHECK ENDPOINTS ===')
		const baseUrl = process.env.NODE_ENV === 'production' 
			? 'https://api.tenantflow.app' 
			: `http://localhost:${port}`
		
		logger.info(`✅ Ping (bulletproof): ${baseUrl}/health/ping`)
		logger.info(`🔍 Full health check: ${baseUrl}/health`)
		logger.info(`📊 Debug info: ${baseUrl}/health/debug`)
		logger.info(`🚀 Readiness probe: ${baseUrl}/health/ready`)

		// External URLs for production
		if (process.env.NODE_ENV === 'production') {
			logger.info('=== PRODUCTION ENDPOINTS ===')
			logger.info(`🌐 API Base: https://api.tenantflow.app/api/v1/`)
			logger.info(`🔒 Environment: ${process.env.RAILWAY_ENVIRONMENT || 'production'}`)
		}

		logger.info('=== READY FOR TRAFFIC ===')
=======
	logger.log('Enabling graceful shutdown hooks...')
	app.enableShutdownHooks()

	// Start server
	const port = configService.get('PORT', 4600)
	logger.log(`Preparing to start server on port ${port}...`)

	try {
		logger.log(`Binding to 0.0.0.0:${port}...`)
		await app.listen(port, '0.0.0.0')

		logger.log('=== SERVER STARTUP SUCCESSFUL ===')
		logger.log(`🚀 Server listening on 0.0.0.0:${port}`)
		logger.log(`🌍 Environment: ${process.env.NODE_ENV}`)
		logger.log(
			`📦 Docker Container: ${process.env.DOCKER_CONTAINER || 'false'}`
		)
		logger.log(
			`🚄 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'none'}`
		)
		logger.log(
			`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
		)
		logger.log(`⏱️  Startup time: ${process.uptime()}s`)

		// Health check endpoints
		logger.log('=== HEALTH CHECK ENDPOINTS ===')
		logger.log(
			`✅ Ping (bulletproof): http://localhost:${port}/health/ping`
		)
		logger.log(`🔍 Full health check: http://localhost:${port}/health`)
		logger.log(`📊 Debug info: http://localhost:${port}/health/debug`)
		logger.log(`🚀 Readiness probe: http://localhost:${port}/health/ready`)

		// External URLs (if not local)
		if (process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL_ENV) {
			logger.log('=== EXTERNAL ENDPOINTS ===')
			logger.log(
				`🌐 External health: https://api.tenantflow.app/health/ping`
			)
			logger.log(`🌐 External API: https://api.tenantflow.app/api/v1/`)
		}

		logger.log('=== READY FOR TRAFFIC ===')
>>>>>>> origin/main
	} catch (error: unknown) {
		logger.error('=== SERVER STARTUP FAILED ===')
		logger.error(`❌ Failed to start server on port ${port}`)
		logger.error(
			`Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`
		)
		logger.error(
			`Error message: ${error instanceof Error ? error.message : String(error)}`
		)
		logger.error(
<<<<<<< HEAD
			`Error code: ${error instanceof Error && 'code' in error ? (error as NodeError).code : 'unknown'}`
=======
			`Error code: ${error instanceof Error && 'code' in error ? (error as Error & { code: string }).code : 'unknown'}`
>>>>>>> origin/main
		)
		logger.error(
			`Stack trace: ${error instanceof Error ? error.stack : 'No stack'}`
		)

		// Additional debugging info
		logger.error('=== ENVIRONMENT DEBUG ===')
		logger.error(`NODE_ENV: ${process.env.NODE_ENV}`)
		logger.error(`PORT: ${process.env.PORT}`)
		logger.error(`DOCKER_CONTAINER: ${process.env.DOCKER_CONTAINER}`)
		logger.error(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`)
		logger.error(`Process PID: ${process.pid}`)
		logger.error(`Process uptime: ${process.uptime()}s`)

		process.exit(1)
	}
}

<<<<<<< HEAD
bootstrap().catch((err: unknown) => {
	const logger = pino({
		level: 'error',
		transport:
			process.env.NODE_ENV !== 'production'
				? {
						target: 'pino-pretty',
						options: {
							colorize: true,
							translateTime: 'HH:MM:ss Z',
							ignore: 'pid,hostname'
						}
					}
				: undefined,
		base: { component: 'Bootstrap-Error' }
	})

	const error = err instanceof Error ? err : new Error(String(err))

	logger.error('=== BOOTSTRAP CATASTROPHIC FAILURE ===')
	logger.error(`❌ Application failed to start`)
	logger.error(`Error type: ${error.constructor.name}`)
	logger.error(`Error message: ${error.message}`)
	logger.error(`Error code: ${(error as NodeError).code ?? 'unknown'}`)
	logger.error(`Stack trace: ${error.stack ?? 'No stack trace available'}`)

	logger.error('=== ENVIRONMENT AUDIT ===')
	logger.error(`NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}`)
	logger.error(`PORT: ${process.env.PORT ?? 'undefined'}`)
	logger.error(
		`DOCKER_CONTAINER: ${process.env.DOCKER_CONTAINER ?? 'undefined'}`
	)
	logger.error(
		`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT ?? 'undefined'}`
=======
bootstrap().catch(err => {
	const logger = new Logger('Bootstrap')

	logger.error('=== BOOTSTRAP CATASTROPHIC FAILURE ===')
	logger.error(`❌ Application failed to start`)
	logger.error(`Error type: ${err.constructor.name}`)
	logger.error(`Error message: ${err.message}`)
	logger.error(`Error code: ${err.code || 'unknown'}`)
	logger.error(`Stack trace:`, err.stack)

	logger.error('=== ENVIRONMENT AUDIT ===')
	logger.error(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`)
	logger.error(`PORT: ${process.env.PORT || 'undefined'}`)
	logger.error(
		`DOCKER_CONTAINER: ${process.env.DOCKER_CONTAINER || 'undefined'}`
	)
	logger.error(
		`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'undefined'}`
>>>>>>> origin/main
	)
	logger.error(
		`Supabase URL: ${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`
	)
	logger.error(
		`Supabase Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}`
	)
	logger.error(`JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'MISSING'}`)

	logger.error('=== PROCESS INFO ===')
	logger.error(`Process PID: ${process.pid}`)
	logger.error(`Node version: ${process.version}`)
	logger.error(`Platform: ${process.platform}`)
	logger.error(`Architecture: ${process.arch}`)
	logger.error(`Uptime: ${process.uptime()}s`)
	logger.error(
		`Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`
	)

	logger.error('=== APPLICATION WILL EXIT ===')
	process.exit(1)
})
