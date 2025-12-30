/**
 * @todo DOCS-001: Add OpenAPI/Swagger documentation using @nestjs/swagger.
 *       61 controllers need API documentation with decorators.
 *       See TODO.md for details.
 */

import { ClassSerializerInterceptor, RequestMethod } from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'
import { Reflector } from '@nestjs/core'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { getCORSConfig } from '@repo/shared/security/cors-config'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import 'reflect-metadata'
import { AppModule } from './app.module'
import { AppConfigService } from './config/app-config.service'
import { registerExpressMiddleware } from './config/express.config'
import { AppLogger } from './logger/app-logger.service'

// Trigger Railway deployment after fixing husky script
import { HEALTH_PATHS, WEBHOOK_PATHS } from './shared/constants/routes'

const DEFAULT_PORT = 4650

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

async function bootstrap() {
	const startTime = Date.now()
	// Industry best practice: hardcode default port, let platform override if needed
	const port = resolvePort(process.env.PORT, DEFAULT_PORT)

	// Express adapter with NestJS - zero type casts needed
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		rawBody: true,
		bufferLogs: true,
		bodyParser: false
	})

	app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
	const logger = app.get(AppLogger)

	if (
		process.env.PORT &&
		port === DEFAULT_PORT &&
		process.env.PORT !== String(DEFAULT_PORT)
	) {
		logger.warn(
			`Invalid PORT value "${process.env.PORT}" - falling back to ${DEFAULT_PORT}`,
			'Bootstrap'
		)
	}
	logger.log(
		`Port configuration -> env="${process.env.PORT ?? 'undefined'}", resolved=${port}`,
		'Bootstrap'
	)
	logger.log('NestFactory application created successfully', 'Bootstrap')

	app.set('trust proxy', 1)

	const GLOBAL_PREFIX = 'api/v1'

	// Register Express middleware with full TypeScript support - moved before global prefix
	logger.log('Registering Express middleware...', 'Bootstrap')
	const appConfigService = app.get(AppConfigService)
	await registerExpressMiddleware(app, appConfigService)
	logger.log('Express middleware registered', 'Bootstrap')

	// Global API prefix
	app.setGlobalPrefix(GLOBAL_PREFIX, {
		exclude: [
			...HEALTH_PATHS.map(path => ({ path, method: RequestMethod.ALL })),
			...WEBHOOK_PATHS.map(path => ({ path, method: RequestMethod.ALL })),
			{ path: '/', method: RequestMethod.ALL },
			{ path: '/metrics', method: RequestMethod.ALL }
		]
	})
	const healthPaths = HEALTH_PATHS.join(', ')
	const webhookPaths = WEBHOOK_PATHS.join(', ')
	logger.log(`Health endpoints registered without prefix at: ${healthPaths}`)
	logger.log(`Webhook endpoints registered without prefix at: ${webhookPaths}`)

	// Configure CORS using NestJS built-in support
	logger.log('Configuring CORS...', 'Bootstrap')
	app.enableCors(getCORSConfig())
	logger.log('CORS enabled', 'Bootstrap')

	// Enable response serialization globally
	logger.log('Enabling response serialization...', 'Bootstrap')
	app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))
	logger.log('ClassSerializerInterceptor enabled', 'Bootstrap')

	// Security: Using built-in NestJS validation and exception handling
	logger.log('Security: Using native NestJS validation', 'Bootstrap')
	logger.log('Security exception filter enabled', 'Bootstrap')

	// Global Zod validation pipe (required for nestjs-zod DTOs)
	// NOTE: ZodValidationPipe handles transform, whitelist, and validation automatically
	app.useGlobalPipes(new ZodValidationPipe())

	// Enable graceful shutdown
	app.enableShutdownHooks()

	// Start server
	await app.listen(port, '0.0.0.0')
	logger.log(`Listening on port ${port} (bind 0.0.0.0)`, 'Bootstrap')

	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	logger.log(`EXPRESS SERVER: Listening on http://0.0.0.0:${port}`, 'Bootstrap')
	logger.log(`STARTUP: Completed in ${startupTime}s`, 'Bootstrap')
	const nodeEnv = appConfigService.getNodeEnv()
	logger.log(`ENVIRONMENT: ${nodeEnv}`, 'Bootstrap')
	logger.log('TYPE SAFETY: Zero type casts required with Express adapter')
}

// Catch bootstrap errors
bootstrap().catch((err: unknown) => {
	// Note: Logger not available yet during bootstrap failure
	// Using process.stderr.write for critical startup errors
	process.stderr.write(`Failed to start server: ${err}\n`)
	process.exit(1)
})
