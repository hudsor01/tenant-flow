import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { getCORSConfig } from '@repo/shared'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import 'reflect-metadata'
import { AppModule } from './app.module'
import { SupabaseService } from './database/supabase.service'
import { HEALTH_PATHS } from './shared/constants/routes'
import { routeSchemaRegistry } from './shared/utils/route-schema-registry'

// Extend FastifyRequest interface for request timing
declare module 'fastify' {
	interface FastifyRequest {
		startTime?: number
	}
}

async function bootstrap() {
	const startTime = Date.now()
	const port = Number(process.env.PORT) || 4600

	// Fastify adapter with NestJS
	const fastifyAdapter = new FastifyAdapter({
		logger: false,
		bodyLimit: 10 * 1024 * 1024 // 10MB limit for security
	})
	// Attach onRoute hook BEFORE Nest registers routes so schemas apply
	const GLOBAL_PREFIX = 'api/v1'
	const preInstance = fastifyAdapter.getInstance()

	preInstance.addHook('onRoute', routeOptions => {
		const methods = Array.isArray(routeOptions.method)
			? routeOptions.method
			: [routeOptions.method]
		for (const method of methods) {
			const match = routeSchemaRegistry.find(
				String(method),
				routeOptions.url,
				GLOBAL_PREFIX
			)
			if (match) {
				routeOptions.schema = {
					...(routeOptions.schema ?? {}),
					...match.schema
				}
				break
			}
		}
	})

	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		fastifyAdapter,
		{
			rawBody: true,
			bufferLogs: true
		}
	)

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

	// Security: Apply security headers middleware
	logger.log('Applying security headers...')
	const { SecurityHeadersMiddleware } = await import(
		'./shared/middleware/security-headers.middleware.js'
	)
	app.use(
		new SecurityHeadersMiddleware().use.bind(new SecurityHeadersMiddleware())
	)
	logger.log('Security headers enabled')

	// Security: Apply rate limiting middleware
	logger.log('Configuring rate limiting...')
	const { RateLimitMiddleware } = await import(
		'./shared/middleware/rate-limit.middleware.js'
	)
	const rateLimitLogger = new Logger('RateLimit')
	app.use(
		new RateLimitMiddleware(rateLimitLogger).use.bind(
			new RateLimitMiddleware(rateLimitLogger)
		)
	)
	logger.log('Rate limiting enabled')

	// Security: Apply input sanitization middleware
	logger.log('Configuring input sanitization...')
	const { InputSanitizationMiddleware } = await import(
		'./shared/middleware/input-sanitization.middleware.js'
	)
	const { SecurityMonitorService } = await import(
		'./shared/services/security-monitor.service.js'
	)
	const securityMonitor = app.get(SecurityMonitorService)
	const sanitizationLogger = new Logger('InputSanitization')
	app.use(
		new InputSanitizationMiddleware(
			sanitizationLogger,
			securityMonitor
		).use.bind(
			new InputSanitizationMiddleware(sanitizationLogger, securityMonitor)
		)
	)
	logger.log('Input sanitization enabled')

	// Security: Apply security exception filter
	logger.log('Configuring security exception filter...')
	const { SecurityExceptionFilter } = await import(
		'./shared/filters/security-exception.filter.js'
	)
	const exceptionLogger = new Logger('SecurityException')
	app.useGlobalFilters(
		new SecurityExceptionFilter(exceptionLogger, securityMonitor)
	)
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
			// Enhanced security options
			validateCustomDecorators: true,
			stopAtFirstError: false,
			skipMissingProperties: false,
			skipNullProperties: false,
			skipUndefinedProperties: false
		})
	)

	const fastify = app
		.getHttpAdapter()
		.getInstance() as unknown as FastifyInstance

	// Enable graceful shutdown
	app.enableShutdownHooks()

	// Ultra-reliable health endpoint for Railway: raw Fastify with real checks
	const supabase = app.get(SupabaseService)
	let shuttingDown = false
	process.on('SIGTERM', () => (shuttingDown = true))
	process.on('SIGINT', () => (shuttingDown = true))

	function healthHintFor(message?: string) {
		if (!message)
			return 'Check Supabase URL/service key and network reachability.'
		if (message.includes('health_db_timeout'))
			return 'DB timed out. Verify Supabase is reachable from Railway and not rate-limited.'
		const msg = message.toLowerCase()
		if (msg.includes('configuration is missing'))
			return 'Missing SUPABASE_URL or SERVICE_ROLE_KEY. Set them in Doppler/Railway env.'
		if (msg.includes('does not exist'))
			return 'Table for health check not found. Set HEALTH_CHECK_TABLE to an existing public table.'
		if (
			msg.includes('invalid jwt') ||
			msg.includes('jwt') ||
			msg.includes('auth')
		)
			return 'Auth failed. Use the Supabase service role key (not anon) in SERVICE_ROLE_KEY.'
		if (msg.includes('db_unhealthy'))
			return 'Supabase returned an error. Enable /health/debug and verify credentials + table name.'
		return 'Check Supabase credentials (URL/Service Key) and connectivity.'
	}

	async function dbHealthy(
		timeoutMs = Number(process.env.HEALTH_DB_TIMEOUT_MS ?? 1500)
	) {
		try {
			const result = await Promise.race([
				supabase.checkConnection(),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('health_db_timeout')), timeoutMs)
				)
			])
			const { status, message } = result as {
				status: 'healthy' | 'unhealthy'
				message?: string
			}
			return { ok: status === 'healthy', message }
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : 'unknown'
			}
		}
	}

	fastify.get('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
		const start = Date.now()
		const headers = (): FastifyReply =>
			reply.header(
				'Cache-Control',
				'no-store, no-cache, must-revalidate, proxy-revalidate'
			)

		if (shuttingDown) {
			logger.warn(
				{ reason: 'shutting_down' },
				'Health check unhealthy: shutting down'
			)
			headers()
				.code(503)
				.type('application/json; charset=utf-8')
				.send({
					status: 'unhealthy',
					reason: 'shutting_down',
					uptime: Math.round(process.uptime()),
					timestamp: new Date().toISOString()
				})
			return
		}

		const db = await dbHealthy()
		const duration = Date.now() - start
		if (db.ok) {
			logger.log({ duration }, 'Health check ok')
			headers()
				.code(200)
				.type('application/json; charset=utf-8')
				.send({
					status: 'ok',
					checks: { db: 'healthy' },
					duration,
					uptime: Math.round(process.uptime()),
					timestamp: new Date().toISOString()
				})
		} else {
			const hint = healthHintFor(db.message)
			logger.error(
				{ duration, reason: db.message, hint },
				'Health check unhealthy: db'
			)
			headers()
				.code(503)
				.type('application/json; charset=utf-8')
				.send({
					status: 'unhealthy',
					checks: { db: 'unhealthy', message: db.message, hint },
					duration,
					uptime: Math.round(process.uptime()),
					timestamp: new Date().toISOString()
				})
		}
	})

	// Railway compatibility endpoint - simple ping that Railway expects
	fastify.get(
		'/health/ping',
		async (_req: FastifyRequest, reply: FastifyReply) => {
			if (shuttingDown) {
				return reply
					.header('Cache-Control', 'no-store')
					.code(503)
					.type('application/json; charset=utf-8')
					.send({
						status: 'unhealthy',
						reason: 'shutting_down'
					})
			}

			return reply
				.header('Cache-Control', 'no-store')
				.code(200)
				.type('application/json; charset=utf-8')
				.send({
					status: 'ok',
					uptime: Math.round(process.uptime()),
					timestamp: new Date().toISOString()
				})
		}
	)

	// fastify.head('/health', async (_req: FastifyRequest, reply: FastifyReply) => {
	//   if (shuttingDown) return reply.header('Cache-Control', 'no-store').code(503).send()
	//   const db = await dbHealthy()
	//   reply.header('Cache-Control', 'no-store').code(db.ok ? 200 : 503).send()
	// })

	fastify.addHook(
		'onRequest',
		(req: FastifyRequest, _reply: FastifyReply, done: () => void) => {
			req.startTime = Date.now()
			done()
		}
	)

	fastify.addHook(
		'onResponse',
		(req: FastifyRequest, reply: FastifyReply, done: () => void) => {
			const duration = Date.now() - (req.startTime ?? Date.now())
			logger.log(
				`${req.method} ${req.url} -> ${reply.statusCode} in ${duration}ms`
			)
			done()
		}
	)

	// Start server
	await app.listen(port, '0.0.0.0')

	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	logger.log(`SERVER: Listening on http://0.0.0.0:${port}`)
	logger.log(`STARTUP: Completed in ${startupTime}s`)
	logger.log(`ENVIRONMENT: ${process.env.NODE_ENV}`)
}

// Catch bootstrap errors
bootstrap().catch((err: unknown) => {
	console.error('ERROR: Failed to start server:', err)
	process.exit(1)
})
// test
