import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import {
	FastifyAdapter,
	type NestFastifyApplication
} from '@nestjs/platform-fastify'
import pino from 'pino'
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
import { corsOptions } from './config/cors.options'
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter'

async function bootstrap() {
	// Create bootstrap Pino logger (before Fastify is available)
	const logger = pino({
		level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
		transport: process.env.NODE_ENV !== 'production' ? {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'HH:MM:ss Z',
				ignore: 'pid,hostname'
			}
		} : undefined,
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
			transport: process.env.NODE_ENV !== 'production' ? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'HH:MM:ss Z',
					ignore: 'pid,hostname'
				}
			} : undefined
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
	app.setGlobalPrefix('api/v1', {
		exclude: [
			{ path: 'health', method: 0 },
			{ path: 'health/ping', method: 0 },
			{ path: 'health/ready', method: 0 },
			{ path: 'health/debug', method: 0 },
			{ path: '/', method: 0 }
		]
	})

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
				NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'] },
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
	await app.register(csrfProtection, {
		cookieOpts: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
		},
		sessionPlugin: '@fastify/cookie',
		getToken: (req) => {
			// Skip CSRF for webhook endpoints
			if (req.url?.includes('/webhook')) {
				return undefined
			}
			const csrfToken = req.headers['x-csrf-token']
			const xsrfToken = req.headers['x-xsrf-token']
			if (typeof csrfToken === 'string') {return csrfToken}
			if (typeof xsrfToken === 'string') {return xsrfToken}
			return undefined
		},
		cookieKey: '_csrf'
	})
	logger.info('CSRF protection registered')

	// 5. Multipart support for file uploads
	await app.register(multipart, {
		limits: {
			fieldNameSize: 100, // Max field name size
			fieldSize: 100, // Max field value size  
			fields: 10, // Max number of non-file fields
			fileSize: 10485760, // 10MB max file size (matches body limit)
			files: 5, // Max number of file fields
			headerPairs: 2000 // Max number of header key=>value pairs
		},
		attachFieldsToBody: 'keyValues' // Attach non-file fields to body
	})
	logger.info('Multipart support registered (file uploads)')

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
	logger.info('Compression plugin registered (gzip/brotli)')

	// 7. ETag generation for efficient caching
	await app.register(etag, {
		algorithm: 'fnv1a', // Faster than MD5, good distribution
		weak: true // Use weak ETags for better performance
	})
	logger.info('ETag plugin registered (fnv1a)')

	// 8. Rate limiting (more granular than NestJS throttler)
	await app.register(rateLimit, {
		global: true,
		max: 100, // 100 requests per window (aligns with NestJS config)
		timeWindow: '1 minute',
		cache: 10000, // Cache up to 10k IP addresses
		allowList: ['127.0.0.1', '::1'], // Whitelist local IPs
		continueExceeding: true, // Don't ban, just rate limit
		keyGenerator: (req) => {
			// Enhanced key generation for better rate limiting
			const forwarded = req.headers['x-forwarded-for']
			const realIP = req.headers['x-real-ip']
			const remoteAddress = req.socket.remoteAddress

			// Normalize possible header shapes to single values
			const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded
			const realIpValue = Array.isArray(realIP) ? realIP[0] : realIP

			// Prefer the first entry of x-forwarded-for (if present), otherwise fallback
			let clientIp = 'unknown'
			if (typeof forwardedValue === 'string' && forwardedValue.trim() !== '') {
				clientIp = forwardedValue.split(',')[0].trim()
			} else if (typeof realIpValue === 'string' && realIpValue.trim() !== '') {
				clientIp = realIpValue.trim()
			} else if (typeof remoteAddress === 'string' && remoteAddress.trim() !== '') {
				clientIp = remoteAddress
			}

			return String(clientIp)
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

	// 11. Circuit breaker for external calls
	await app.register(circuitBreaker, {
		threshold: 5, // Open circuit after 5 failures
		timeout: 10000, // 10 second timeout
		resetTimeout: 30000, // Reset after 30 seconds
		onCircuitOpen: (req) => {
			logger.warn(`Circuit breaker opened for ${req.url} - external service failures detected`)
		}
	})
	logger.info('Circuit breaker plugin registered')

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
	logger.info('Security middleware registered (enhanced CSP)')

	// Initialize Fastify Type Providers for schema-driven validation
	logger.info('Initializing Fastify Type Providers...')
	try {
		const { initializeTypeProviders, validateEnvironment } = await import('./setup-type-providers.js')
		
		// Validate environment with schema
		const env = validateEnvironment()
		logger.info(`✅ Environment validated (NODE_ENV: ${env.NODE_ENV})`)
		
		// Setup type providers
		await initializeTypeProviders(fastifyAdapter)
		logger.info('✅ Fastify Type Providers initialized successfully')
		
	} catch (typeProviderError) {
		logger.error('❌ Failed to initialize Type Providers: ' + String(typeProviderError))
		// Continue without type providers in case of setup failure
		logger.warn('⚠️  Continuing without schema-driven type inference')
	}

	// Liveness probe handled by HealthController
	logger.info('Enabling graceful shutdown hooks...')
	app.enableShutdownHooks()

	// Start server
	const port = configService.get('PORT', 4600)
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
		logger.info(
			`✅ Ping (bulletproof): http://localhost:${port}/health/ping`
		)
		logger.info(`🔍 Full health check: http://localhost:${port}/health`)
		logger.info(`📊 Debug info: http://localhost:${port}/health/debug`)
		logger.info(`🚀 Readiness probe: http://localhost:${port}/health/ready`)

		// External URLs (if not local)
		if (process.env.RAILWAY_ENVIRONMENT ?? process.env.VERCEL_ENV) {
			logger.info('=== EXTERNAL ENDPOINTS ===')
			logger.info(
				`🌐 External health: https://api.tenantflow.app/health/ping`
			)
			logger.info(`🌐 External API: https://api.tenantflow.app/api/v1/`)
		}

		logger.info('=== READY FOR TRAFFIC ===')
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
			`Error code: ${error instanceof Error && 'code' in error ? (error as Error & { code: string }).code : 'unknown'}`
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

bootstrap().catch((err: unknown) => {
	const logger = pino({
		level: 'error',
		transport: process.env.NODE_ENV !== 'production' ? {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'HH:MM:ss Z',
				ignore: 'pid,hostname'
			}
		} : undefined,
		base: { component: 'Bootstrap-Error' }
	})
	
	const error = err instanceof Error ? err : new Error(String(err))

	logger.error('=== BOOTSTRAP CATASTROPHIC FAILURE ===')
	logger.error(`❌ Application failed to start`)
	logger.error(`Error type: ${error.constructor.name}`)
	logger.error(`Error message: ${error.message}`)
	logger.error(`Error code: ${(error as any).code ?? 'unknown'}`)
	logger.error(`Stack trace: ${error.stack ?? 'No stack trace available'}`)

	logger.error('=== ENVIRONMENT AUDIT ===')
	logger.error(`NODE_ENV: ${process.env.NODE_ENV ?? 'undefined'}`)
	logger.error(`PORT: ${process.env.PORT ?? 'undefined'}`)
	logger.error(
		`DOCKER_CONTAINER: ${process.env.DOCKER_CONTAINER ?? 'undefined'}`
	)
	logger.error(
		`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT ?? 'undefined'}`
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


