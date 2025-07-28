import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'
import * as net from 'net'
import { setRunningPort } from './common/logging/logger.config'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import dotenvFlow from 'dotenv-flow'
import { join } from 'path'
import fastifyEnv from '@fastify/env'
import fastifyCookie from '@fastify/cookie'
import fastifyCircuitBreaker from '@fastify/circuit-breaker'
import fastifyMultipart from '@fastify/multipart'
import { SecurityUtils } from './common/security/security.utils'
// Removed Express imports - using Fastify types instead
// import { Request, Response, NextFunction } from 'express'
// import { ParamsDictionary } from 'express-serve-static-core'
// import { ParsedQs } from 'qs'

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
			minLength: 1
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
		new FastifyAdapter({
			bodyLimit: 10 * 1024 * 1024,
			maxParamLength: 200,
			trustProxy: true,
			logger: false
		}),
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
	
	// Register multipart support with security limits
	await app.register(fastifyMultipart, {
		limits: {
			fieldNameSize: 100,
			fieldSize: 100,
			fields: 10,
			fileSize: 10 * 1024 * 1024, // 10MB per file
			files: 5, // Max 5 files per request
			headerPairs: 50
		},
		throwFileSizeLimit: true,
		sharedSchemaId: '#fastifyMultipartSchema'
	})
	
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

	// Validate JWT secret with user-friendly warnings
	const securityUtils = new SecurityUtils()
	const jwtSecret = configService.get<string>('JWT_SECRET')
	
	// Run SRI security assessment
	const securityLogger = new Logger('Security')
	try {
		const sriManager = app.get('SRIManager')
		sriManager.logSecurityAssessment()
	} catch (error) {
		securityLogger.warn('SRI security assessment failed:', error instanceof Error ? error.message : 'Unknown error')
	}
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
			},
			hsts: {
				maxAge: 31536000,
				includeSubDomains: true,
				preload: true
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
	
	// SECURITY: Validate environment to prevent accidental exposure
	const validEnvironments = ['development', 'test', 'production']
	if (!validEnvironments.includes(environment)) {
		throw new Error(`Invalid NODE_ENV: ${environment}. Must be one of: ${validEnvironments.join(', ')}`)
	}
	
	let corsOrigins = configService
		.get<string>('CORS_ORIGINS')
		?.split(',')
		.filter(origin => origin.trim().length > 0) || []

	// SECURITY: Validate CORS origins format
	const validOriginPattern = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/
	corsOrigins.forEach(origin => {
		if (!validOriginPattern.test(origin)) {
			throw new Error(`Invalid CORS origin format: ${origin}. Origins must be valid URLs.`)
		}
	})

	// If no environment variable is set, use secure defaults
	if (corsOrigins.length === 0) {
		if (isProduction) {
			// SECURITY: Production only allows HTTPS origins
			corsOrigins = [
				'https://tenantflow.app',
				'https://www.tenantflow.app',
				'https://blog.tenantflow.app',
			]
		} else {
			// Development defaults
			corsOrigins = [
				'https://tenantflow.app',
				'https://www.tenantflow.app',
				'https://blog.tenantflow.app',
			]
			
			// SECURITY: Only add localhost origins in non-production with explicit flag
			if (environment === 'development' || environment === 'test') {
				const allowLocalhost = configService.get<string>('ALLOW_LOCALHOST_CORS')
				if (allowLocalhost === 'true') {
					corsOrigins.push(
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
		const httpOrigins = corsOrigins.filter(origin => origin.startsWith('http://'))
		if (httpOrigins.length > 0) {
			throw new Error(`Production environment cannot have HTTP origins: ${httpOrigins.join(', ')}`)
		}
	}

	// SECURITY: Log CORS origins for audit trail (but not in production)
	if (!isProduction) {
		logger.log(`CORS origins: ${corsOrigins.join(', ')}`)
	} else {
		// In production, log count only
		logger.log(`CORS configured with ${corsOrigins.length} origins`)
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
	// Global prefix for API routes
	app.setGlobalPrefix('api/v1')

	await app.init()
	

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
