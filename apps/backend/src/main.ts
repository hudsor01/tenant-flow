import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { getCORSConfig } from '@repo/shared/security/cors-config'
import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import 'reflect-metadata'
import { AppModule } from './app.module'
import { registerExpressMiddleware } from './config/express.config'

// Trigger Railway deployment after fixing husky script
import { HEALTH_PATHS } from './shared/constants/routes'

// Extend Express Request interface for request timing
interface RequestWithTiming extends Request {
	startTime?: number
	id?: string
}

const DEFAULT_PORT = 4600

function resolvePort(portValue: string | undefined, fallback: number): number {
	if (!portValue) {
		return fallback
	}

	const parsedPort = Number.parseInt(portValue, 10)
	if (Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort <= 65535) {
		return parsedPort
	}

	return fallback
}

// Module-level logger for bootstrap operations
const bootstrapLogger = new Logger('Bootstrap')

async function bootstrap() {

	const startTime = Date.now()
	// Industry best practice: hardcode default port, let platform override if needed
	const port = resolvePort(process.env.PORT, DEFAULT_PORT)
	if (
		process.env.PORT &&
		port === DEFAULT_PORT &&
		process.env.PORT !== String(DEFAULT_PORT)
	) {
		bootstrapLogger.warn(
			`Invalid PORT value "${process.env.PORT}" - falling back to ${DEFAULT_PORT}`
		)
	}
	bootstrapLogger.log(
		`Port configuration -> env="${process.env.PORT ?? 'undefined'}", resolved=${port}`
	)

	// Express adapter with NestJS - zero type casts needed
	bootstrapLogger.log('Creating NestFactory application...')
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		rawBody: true,
		bufferLogs: true
	})
	bootstrapLogger.log('NestFactory application created successfully')

	app.set('trust proxy', 1)

	// Register Express middleware with full TypeScript support
	bootstrapLogger.log('Registering Express middleware...')
	await registerExpressMiddleware(app)
	bootstrapLogger.log('Express middleware registered')

	const GLOBAL_PREFIX = 'api/v1'

	// Use native NestJS Logger
	app.useLogger(bootstrapLogger)
	// Quick environment summary to help diagnose deploy issues (no secrets)
	bootstrapLogger.log(
		{
			env: process.env.NODE_ENV,
			port,
			hasSupabaseUrl: !!process.env.SUPABASE_URL,
			hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
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
	const healthPaths = HEALTH_PATHS.join(', ')
	bootstrapLogger.log(
		`Health endpoints registered without prefix at: ${healthPaths}`
	)

	// Configure CORS using NestJS built-in support
	bootstrapLogger.log('Configuring CORS...')
	app.enableCors(getCORSConfig())
	bootstrapLogger.log('CORS enabled')

	// Express middleware already registered via registerExpressMiddleware()
	bootstrapLogger.log(
		'Express middleware configured with full TypeScript support'
	)

	// Security: Using built-in NestJS validation and exception handling
	bootstrapLogger.log('Security: Using native NestJS validation')
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

	// Express response logging middleware with enhanced error details
	app.use((req: RequestWithTiming, res: Response, next: () => void) => {
		const originalSend = res.send
		res.send = function (body: unknown) {
			const duration = Date.now() - (req.startTime ?? Date.now())

			// Enhanced logging for errors
			if (res.statusCode >= 400) {
				// Safely convert body to string for logging
				let bodyString: string | undefined
				if (res.statusCode >= 500 && body !== null) {
					try {
						bodyString = String(body).substring(0, 500)
					} catch {
						bodyString = '[Unable to stringify body]'
					}
				}

				bootstrapLogger.warn(
					`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`,
					{
						statusCode: res.statusCode,
						path: req.url,
						method: req.method,
						duration: `${duration}ms`,
						headers: {
							origin: req.headers.origin,
							referer: req.headers.referer,
							userAgent: req.headers['user-agent']?.substring(0, 100)
						},
						body: bodyString
					}
				)
			} else {
				bootstrapLogger.log(
					`${req.method} ${req.url} -> ${res.statusCode} in ${duration}ms`
				)
			}
			return originalSend.call(this, body)
		}
		next()
	})

	app.use((req: RequestWithTiming, _res: Response, next: () => void) => {
		req.id = randomUUID()
		next()
	})

	app.use(
		(
			err: Error,
			req: RequestWithTiming,
			res: Response,
			_next: NextFunction
		) => {
			const duration = Date.now() - (req.startTime ?? Date.now())
			bootstrapLogger.error('Unhandled error in Express middleware', {
				error: err.message,
				stack: err.stack?.split('\n').slice(0, 5).join('\n'),
				path: req.url,
				method: req.method,
				requestId: req.id,
				duration: `${duration}ms`,
				headers: {
					origin: req.headers.origin,
					referer: req.headers.referer,
					userAgent: req.headers['user-agent']?.substring(0, 100)
				}
			})
			res.status(500).send('Internal Server Error')
		}
	)

	// Start server
	await app.listen(port, '0.0.0.0')
	bootstrapLogger.log(`Listening on port ${port} (bind 0.0.0.0)`)

	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	bootstrapLogger.log(`EXPRESS SERVER: Listening on http://0.0.0.0:${port}`)
	bootstrapLogger.log(`STARTUP: Completed in ${startupTime}s`)
	bootstrapLogger.log(`ENVIRONMENT: ${process.env.NODE_ENV}`)
	bootstrapLogger.log(
		'TYPE SAFETY: Zero type casts required with Express adapter'
	)
}

// Catch bootstrap errors
bootstrap().catch((err: unknown) => {
	bootstrapLogger.error('Failed to start server:', err)
	process.exit(1)
})
// test
