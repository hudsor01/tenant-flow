import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { getCORSConfig } from '@repo/shared'
import type { Request, Response } from 'express'
import 'reflect-metadata'
import { AppModule } from './app.module'
import { registerExpressMiddleware } from './config/express.config'

// Trigger Railway deployment after fixing husky script
import { HEALTH_PATHS } from './shared/constants/routes'

// Extend Express Request interface for request timing
declare module 'express-serve-static-core' {
	interface Request {
		startTime?: number
	}
}

async function bootstrap() {
	const startTime = Date.now()
	// Railway uses PORT env var, fallback to 4600 for Railway compatibility
	// Use BACKEND_PORT for local dev override
	const port =
		Number(process.env.PORT) || Number(process.env.BACKEND_PORT) || 4600

	// Express adapter with NestJS - zero type casts needed
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		rawBody: true,
		bufferLogs: true
	})

	// Register Express middleware with full TypeScript support
	await registerExpressMiddleware(app)

	const GLOBAL_PREFIX = 'api/v1'

	// Use native NestJS Logger
	const logger = new Logger('Bootstrap')
	app.useLogger(logger)
	// Quick environment summary to help diagnose deploy issues (no secrets)
	logger.log(
		{
			env: process.env.NODE_ENV,
			port,
			hasSupabaseUrl: !!process.env.SUPABASE_URL,
			hasServiceKey: !!process.env.SERVICE_ROLE_KEY
		},
		'Environment summary'
	)

	// Global API prefix
	app.setGlobalPrefix(GLOBAL_PREFIX, {
		exclude: [
			...HEALTH_PATHS.map(path => ({ path, method: RequestMethod.ALL })),
			{ path: '/', method: RequestMethod.ALL }
		]
	})

	// Configure CORS using NestJS built-in support
	logger.log('Configuring CORS...')
	app.enableCors(getCORSConfig())
	logger.log('CORS enabled')

	// Express middleware already registered via registerExpressMiddleware()
	logger.log('Express middleware configured with full TypeScript support')

	// Security: Apply input sanitization middleware
	logger.log('Configuring input sanitization...')
	const [
		{ InputSanitizationMiddleware },
		{ SecurityMonitorService },
		{ SecurityExceptionFilter }
	] = await Promise.all([
		import('./shared/middleware/input-sanitization.middleware.js'),
		import('./shared/services/security-monitor.service.js'),
		import('./shared/filters/security-exception.filter.js')
	])
	const securityMonitor = await app.resolve(SecurityMonitorService)
	const sanitizationLogger = new Logger('InputSanitization')
	const inputSanitizationMiddleware = new InputSanitizationMiddleware(
		sanitizationLogger,
		securityMonitor
	)
	app.use(inputSanitizationMiddleware.use.bind(inputSanitizationMiddleware))
	logger.log('Input sanitization enabled')

	// Security: Apply security exception filter
	logger.log('Configuring security exception filter...')
	const exceptionLogger = new Logger('SecurityException')
	const securityExceptionFilter = new SecurityExceptionFilter(
		exceptionLogger,
		securityMonitor
	)
	app.useGlobalFilters(securityExceptionFilter)
	logger.log('Security exception filter enabled')

	// Global validation pipe with enhanced security
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			transformOptions: { enableImplicitConversion: true },
			whitelist: true,
			forbidNonWhitelisted: true,
			disableErrorMessages: process.env.NODE_ENV === 'production',
			validationError: { target: false, value: false },
			validateCustomDecorators: true,
			stopAtFirstError: false,
			skipMissingProperties: false,
			skipNullProperties: false,
			skipUndefinedProperties: false
		})
	)

	// Enable graceful shutdown
	app.enableShutdownHooks()

	// Health endpoint is now handled by HealthController at /api/v1/health
	// Express request timing middleware
	app.use((req: Request, _res: Response, next: () => void) => {
		req.startTime = Date.now()
		next()
	})

	// Express response logging middleware
	app.use((req: Request, res: Response, next: () => void) => {
		const originalSend = res.send
		res.send = function (body) {
			const duration = Date.now() - (req.startTime ?? Date.now())
			logger.log(
				`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`
			)
			return originalSend.call(this, body)
		}
		next()
	})

	// Start server
	await app.listen(port, '0.0.0.0')

	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	logger.log(`EXPRESS SERVER: Listening on http://0.0.0.0:${port}`)
	logger.log(`STARTUP: Completed in ${startupTime}s`)
	logger.log(`ENVIRONMENT: ${process.env.NODE_ENV}`)
	logger.log('TYPE SAFETY: Zero type casts required with Express adapter')
}

// Catch bootstrap errors
bootstrap().catch((err: unknown) => {
	console.error('ERROR: Failed to start server:', err)
	process.exit(1)
})
// test
