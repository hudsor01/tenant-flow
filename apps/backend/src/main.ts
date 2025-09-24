import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { getCORSConfig } from '@repo/shared'
import type { NextFunction, Request, Response } from 'express'
import 'reflect-metadata'
import { v4 as uuidv4 } from 'uuid'
import { AppModule } from './app.module'
import { registerExpressMiddleware } from './config/express.config'

// Trigger Railway deployment after fixing husky script
import { HEALTH_PATHS } from './shared/constants/routes'

// Extend Express Request interface for request timing
interface RequestWithTiming extends Request {
	startTime?: number
	id?: string
}

// Module-level logger for bootstrap operations
const bootstrapLogger = new Logger('Bootstrap')

async function bootstrap() {
	const startTime = Date.now()
	// Railway uses PORT env var, require explicit configuration
	// Use BACKEND_PORT for local dev override
	const port = (() => {
		if (process.env.PORT) return Number(process.env.PORT)
		if (process.env.BACKEND_PORT) return Number(process.env.BACKEND_PORT)
		throw new Error('PORT or BACKEND_PORT environment variable is required for server startup')
	})()

	// Express adapter with NestJS - zero type casts needed
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		rawBody: true,
		bufferLogs: true
	})

	app.set('trust proxy', 1)

	// Register Express middleware with full TypeScript support
	await registerExpressMiddleware(app)

	const GLOBAL_PREFIX = 'api/v1'

	// Use native NestJS Logger
	app.useLogger(bootstrapLogger)
	// Quick environment summary to help diagnose deploy issues (no secrets)
	bootstrapLogger.log(
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
	bootstrapLogger.log('Configuring CORS...')
	app.enableCors(getCORSConfig())
	bootstrapLogger.log('CORS enabled')

	// Express middleware already registered via registerExpressMiddleware()
	bootstrapLogger.log('Express middleware configured with full TypeScript support')

	// Security: Apply input sanitization middleware
	bootstrapLogger.log('Configuring input sanitization...')
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
	const inputSanitizationMiddleware = new InputSanitizationMiddleware(
		securityMonitor
	)
	app.use(inputSanitizationMiddleware.use.bind(inputSanitizationMiddleware))
	bootstrapLogger.log('Input sanitization enabled')

	// Security: Apply security exception filter
	bootstrapLogger.log('Configuring security exception filter...')
	const securityExceptionFilter = new SecurityExceptionFilter(
		securityMonitor
	)
	app.useGlobalFilters(securityExceptionFilter)
	bootstrapLogger.log('Security exception filter enabled')

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
	app.use((req: RequestWithTiming, _res: Response, next: () => void) => {
		req.startTime = Date.now()
		next()
	})

	// Express response logging middleware
	app.use((req: RequestWithTiming, res: Response, next: () => void) => {
		const originalSend = res.send
		res.send = function (body) {
			const duration = Date.now() - (req.startTime ?? Date.now())
			bootstrapLogger.log(
				`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`
			)
			return originalSend.call(this, body)
		}
		next()
	})

	app.use((req: RequestWithTiming, _res: Response, next: () => void) => {
		req.id = uuidv4()
		next()
	})

	app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
		bootstrapLogger.error(`Unhandled error: ${err.message}`, err.stack)
		res.status(500).send('Internal Server Error')
	})

	// Start server
	await app.listen(port, '0.0.0.0')

	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	bootstrapLogger.log(`EXPRESS SERVER: Listening on http://0.0.0.0:${port}`)
	bootstrapLogger.log(`STARTUP: Completed in ${startupTime}s`)
	bootstrapLogger.log(`ENVIRONMENT: ${process.env.NODE_ENV}`)
	bootstrapLogger.log('TYPE SAFETY: Zero type casts required with Express adapter')
}

// Catch bootstrap errors
bootstrap().catch((err: unknown) => {
	bootstrapLogger.error('Failed to start server:', err)
	process.exit(1)
})
// test
