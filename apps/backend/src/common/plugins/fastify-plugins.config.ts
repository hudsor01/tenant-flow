import { Logger } from '@nestjs/common'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type { ConfigService } from '@nestjs/config'

/**
 * Circuit Breaker Configuration for External Services
 * Prevents cascading failures when external services are down
 */
export interface CircuitBreakerConfig {
	threshold: number // Number of failures before opening circuit
	timeout: number // Time in ms before trying again
	resetTimeout: number // Time in ms to wait before resetting
	maxEventLoopDelay: number // Max event loop delay in ms
	maxHeapUsedBytes: number // Max heap usage in bytes
	maxRssBytes: number // Max RSS memory in bytes
	maxEventLoopUtilization: number // Max event loop utilization (0-1)
}

/**
 * Static File Serving Configuration
 */
export interface StaticFileConfig {
	root: string // Root directory for static files
	prefix: string // URL prefix for static routes
	constraints?: { host?: string } // Host constraints
	decorateReply?: boolean // Add reply decorators
	cacheControl?: boolean // Enable cache control
	dotfiles?: 'allow' | 'deny' | 'ignore' // Dotfile handling
	etag?: boolean // Enable ETag generation
	extensions?: string[] // File extensions to serve
	immutable?: boolean // Mark files as immutable
	index?: string[] | false // Index files
	lastModified?: boolean // Enable last-modified header
	maxAge?: string | number // Cache max age
	redirect?: boolean // Redirect to trailing slash
	serveDotFiles?: boolean // Serve dot files
}

/**
 * Environment Validation Schema
 */
export interface EnvSchema {
	type: 'object'
	required: string[]
	properties: Record<string, {
		type: string
		default?: unknown
		enum?: unknown[]
		pattern?: string
		minLength?: number
		maxLength?: number
	}>
	additionalProperties: boolean
}

export class FastifyPluginsConfigService {
	private readonly logger = new Logger('FastifyPlugins')

	/**
	 * Configure Circuit Breaker for external service calls
	 */
	async configureCircuitBreaker(
		app: NestFastifyApplication,
		_configService: ConfigService
	): Promise<void> {
		const fastifyCircuitBreaker = await import('@fastify/circuit-breaker')
		
		// Configure circuit breaker with sensible defaults
		await app.register(fastifyCircuitBreaker.default, {
			threshold: 5, // Open circuit after 5 failures
			timeout: 10000, // 10 second timeout for requests
			resetTimeout: 30000, // Try again after 30 seconds
			onCircuitOpen: (req: unknown, reply: unknown) => {
				const request = req as { url: string; method: string }
				const response = reply as { status: (code: number) => { send: (data: unknown) => void } }
				this.logger.error('Circuit breaker opened for external service', {
					path: request.url,
					method: request.method
				})
				response.status(503).send({
					error: 'Service temporarily unavailable',
					message: 'External service is experiencing issues. Please try again later.',
					retryAfter: 30
				})
			},
			onTimeout: (req: unknown, reply: unknown) => {
				const request = req as { url: string; method: string }
				const response = reply as { status: (code: number) => { send: (data: unknown) => void } }
				this.logger.warn('Request timeout in circuit breaker', {
					path: request.url,
					method: request.method
				})
				response.status(504).send({
					error: 'Gateway timeout',
					message: 'The request took too long to process',
					timeout: 10000
				})
			}
		})

		this.logger.log('✅ Circuit breaker configured for external service resilience')
	}

	/**
	 * Configure Static File Serving
	 */
	async configureStaticFiles(
		app: NestFastifyApplication,
		_configService: ConfigService
	): Promise<void> {
		const fastifyStatic = await import('@fastify/static')
		const path = await import('path')
		
		// Configure static file serving for uploaded documents and generated PDFs
		const uploadsDir = path.join(process.cwd(), 'uploads')
		const documentsDir = path.join(process.cwd(), 'documents')

		// Serve uploaded files
		await app.register(fastifyStatic.default, {
			root: uploadsDir,
			prefix: '/uploads/',
			constraints: { host: _configService.get<string>('HOST') },
			cacheControl: true,
			dotfiles: 'deny',
			etag: true,
			extensions: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx'],
			immutable: false,
			index: false,
			lastModified: true,
			maxAge: '1d', // Cache for 1 day
			redirect: false,
			decorateReply: false
		})

		// Serve generated documents (PDFs, reports)
		await app.register(fastifyStatic.default, {
			root: documentsDir,
			prefix: '/documents/',
			constraints: { host: _configService.get<string>('HOST') },
			cacheControl: true,
			dotfiles: 'deny',
			etag: true,
			extensions: ['pdf'],
			immutable: true, // Generated documents don't change
			index: false,
			lastModified: true,
			maxAge: '7d', // Cache for 7 days
			redirect: false,
			decorateReply: false
		})

		this.logger.log('✅ Static file serving configured for uploads and documents')
	}

	/**
	 * Configure Environment Variable Validation
	 */
	async configureEnvValidation(
		app: NestFastifyApplication,
		_configService: ConfigService
	): Promise<void> {
		const fastifyEnv = await import('@fastify/env')
		
		// Define environment variable schema
		const schema: EnvSchema = {
			type: 'object',
			required: [
				'NODE_ENV',
				'DATABASE_URL',
				'JWT_SECRET',
				'SUPABASE_URL',
				'SUPABASE_ANON_KEY'
			],
			properties: {
				NODE_ENV: {
					type: 'string',
					enum: ['development', 'test', 'production'],
					default: 'development'
				},
				PORT: {
					type: 'string',
					default: '3001',
					pattern: '^\\d+$'
				},
				DATABASE_URL: {
					type: 'string',
					pattern: '^postgres(ql)?:\\/\\/'
				},
				JWT_SECRET: {
					type: 'string',
					minLength: 32
				},
				SUPABASE_URL: {
					type: 'string',
					pattern: '^https:\\/\\/'
				},
				SUPABASE_ANON_KEY: {
					type: 'string',
					minLength: 40
				},
				STRIPE_SECRET_KEY: {
					type: 'string',
					pattern: '^(sk_test_|sk_live_)'
				},
				STRIPE_WEBHOOK_SECRET: {
					type: 'string',
					pattern: '^(whsec_)'
				},
				FRONTEND_URL: {
					type: 'string',
					pattern: '^https?:\\/\\/',
					default: 'http://localhost:3000'
				},
				RESEND_API_KEY: {
					type: 'string'
				},
				CORS_ORIGINS: {
					type: 'string',
					default: 'http://localhost:3000'
				}
			},
			additionalProperties: true
		}

		await app.register(fastifyEnv.default, {
			confKey: 'config', // Access via fastify.config
			schema,
			dotenv: false, // We're already using dotenv-flow
			data: process.env // Use existing env vars
		})

		this.logger.log('✅ Environment variable validation configured')
	}

	/**
	 * Configure Template Rendering for PDFs and Emails
	 */
	async configureViewEngine(
		app: NestFastifyApplication,
		configService: ConfigService
	): Promise<void> {
		const fastifyView = await import('@fastify/view')
		const ejs = await import('ejs')
		const path = await import('path')
		
		// Configure EJS template engine
		await app.register(fastifyView.default, {
			engine: {
				ejs
			},
			root: path.join(process.cwd(), 'templates'),
			layout: 'layouts/default',
			viewExt: 'ejs',
			defaultContext: {
				appName: 'TenantFlow',
				year: new Date().getFullYear(),
				baseUrl: configService.get<string>('FRONTEND_URL')
			},
			options: {
				filename: path.join(process.cwd(), 'templates'),
				async: true,
				cache: configService.get<string>('NODE_ENV') === 'production',
				rmWhitespace: true
			}
		})

		this.logger.log('✅ Template rendering engine configured (EJS)')
	}

	/**
	 * Initialize all Fastify plugins with proper error handling
	 */
	async initializeAllPlugins(
		app: NestFastifyApplication,
		configService: ConfigService
	): Promise<void> {
		try {
			// Critical plugins
			await this.configureCircuitBreaker(app, configService)
			
			// Performance plugins are already in main.ts (compress, etag, request-context)
			
			// Optional plugins - don't fail if they error
			try {
				await this.configureStaticFiles(app, configService)
			} catch (error) {
				this.logger.warn('Static file serving setup failed (non-critical)', error)
			}

			try {
				await this.configureEnvValidation(app, configService)
			} catch (error) {
				this.logger.warn('Environment validation setup failed (non-critical)', error)
			}

			try {
				await this.configureViewEngine(app, configService)
			} catch (error) {
				this.logger.warn('View engine setup failed (non-critical)', error)
			}

			this.logger.log('🚀 All Fastify plugins initialized successfully')
		} catch (error) {
			this.logger.error('Critical plugin initialization failed', error)
			throw error
		}
	}
}