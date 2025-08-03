import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// import helmet from 'helmet' // REMOVED: Express middleware incompatible with Fastify
import { AppModule } from './app.module'
import { setRunningPort } from './common/logging/logger.config'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
// import type { FastifyRequest } from 'fastify' // REMOVED: Unused import
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import dotenvFlow from 'dotenv-flow'
import { join } from 'path'
// REMOVED: Fastify plugins causing middleware conflicts
// import fastifyEnv from '@fastify/env'
// import fastifyCookie from '@fastify/cookie'
// import fastifyCircuitBreaker from '@fastify/circuit-breaker'
// import fastifyCsrf from '@fastify/csrf-protection'
// import multipart from '@fastify/multipart'
import { SecurityUtils } from './common/security/security.utils'

// Extend FastifyRequest to include startTime for performance monitoring
declare module 'fastify' {
	interface FastifyRequest {
		startTime?: number
	}
}

dotenvFlow.config({
	path: join(__dirname, '..', '..', '..')
})


// REMOVED: envSchema - Environment validation moved to AppModule.validate()

async function bootstrap() {
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
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(fastifyOptions),
		{
			bodyParser: false,
		}
	)
	console.warn('✅ NestJS application created successfully')

	// REMOVED: Fastify plugins causing middleware conflicts
	// - fastifyEnv: Environment validation moved to AppModule
	// - multipart: Will use NestJS built-in file handling
	// - Custom content type parsers: Using built-in body parser
	
	// REMOVED: Unused fastifyAdapter reference

	const configService = app.get(ConfigService)

	// Validate JWT secret with user-friendly warnings
	const securityUtils = new SecurityUtils()
	const jwtSecret = configService.get<string>('JWT_SECRET')
	
	// Run SRI security assessment
	const securityLogger = new Logger('Security')
	try {
		const { SRIManager } = await import('./common/security/sri-manager')
		const sriManager = app.get(SRIManager)
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

	// REMOVED: Fastify plugins causing middleware conflicts with serverless
	// - fastifyCookie: JWT auth doesn't require cookie parsing in API mode
	// - fastifyCsrf: CSRF protection handled at application level
	// - fastifyCircuitBreaker: Not needed for serverless functions
	
	const logger = new Logger('Bootstrap')

	// Security middleware - REMOVED helmet (Express middleware incompatible with Fastify)
	// TODO: Implement Fastify-native security headers plugin
	// For now, security headers are handled in Vercel configuration

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
	
	let corsOrigins = configService
		.get<string>('CORS_ORIGINS')
		?.split(',')
		.filter(origin => origin.trim().length > 0) || []
	
	// Debug CORS configuration
	logger.log(`🔍 CORS_ORIGINS env var: ${configService.get<string>('CORS_ORIGINS')}`)
	logger.log(`🔍 Parsed CORS origins: ${JSON.stringify(corsOrigins)}`)

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
			// Development defaults - include production domains
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
	
	app.setGlobalPrefix('api/v1', {
		exclude: ['/health', '/ping', '/']
	})

	console.warn('🔄 Initializing NestJS application...')
	console.warn('📋 Starting app.init()...')
	
	try {
		await app.init()
		console.warn('✅ app.init() completed successfully')
	} catch (error) {
		console.error('❌ app.init() failed:', error)
		throw error
	}
	
	console.warn('✅ NestJS application initialized')
	

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
		
		await app.listen(port, '0.0.0.0')
		
		logger.log(`✅ Server listening on 0.0.0.0:${port}`)
		
		// Update the logger with the actual running port
		setRunningPort(port)

		// Health check - test both localhost and 0.0.0.0
		const healthUrls = [
			`http://localhost:${port}/health`,
			`http://0.0.0.0:${port}/health`,
			`http://localhost:${port}/`,
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
					// Remove routes check as it doesn't exist on FastifyInstance
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

