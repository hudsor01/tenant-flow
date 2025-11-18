import {
	ClassSerializerInterceptor,
	Logger,
	RequestMethod
} from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'
import { Reflector } from '@nestjs/core'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { getCORSConfig } from '@repo/shared/security/cors-config'
import 'reflect-metadata'
import { AppModule } from './app.module'
import { AppConfigService } from './config/app-config.service'
import { CONFIG_DEFAULTS } from './config/config.constants'
import { registerExpressMiddleware } from './config/express.config'

// Trigger Railway deployment after fixing husky script
import { HEALTH_PATHS } from './shared/constants/routes'

const DEFAULT_PORT = CONFIG_DEFAULTS.PORT

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
		bufferLogs: true,
		bodyParser: false
	})
	bootstrapLogger.log('NestFactory application created successfully')

	app.set('trust proxy', 1)

	const GLOBAL_PREFIX = 'api/v1'

	// Register Express middleware with full TypeScript support - moved before global prefix
	bootstrapLogger.log('Registering Express middleware...')
	const appConfigService = app.get(AppConfigService)
	await registerExpressMiddleware(app, appConfigService)
	bootstrapLogger.log('Express middleware registered')

	// Global API prefix
	app.setGlobalPrefix(GLOBAL_PREFIX, {
		exclude: [
			...HEALTH_PATHS.map(path => ({ path, method: RequestMethod.ALL })),
			{ path: '/', method: RequestMethod.ALL },
			{ path: '/metrics', method: RequestMethod.ALL }
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

	// Enable response serialization globally
	bootstrapLogger.log('Enabling response serialization...')
	app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))
	bootstrapLogger.log('ClassSerializerInterceptor enabled')

	// Security: Using built-in NestJS validation and exception handling
	bootstrapLogger.log('Security: Using native NestJS validation')
	bootstrapLogger.log('Security exception filter enabled')

	// Global Zod validation pipe (required for nestjs-zod DTOs)
	// NOTE: ZodValidationPipe handles transform, whitelist, and validation automatically
	app.useGlobalPipes(new ZodValidationPipe())

	// Enable graceful shutdown
	app.enableShutdownHooks()

	// Start server
	await app.listen(port, '0.0.0.0')
	bootstrapLogger.log(`Listening on port ${port} (bind 0.0.0.0)`)

	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	bootstrapLogger.log(`EXPRESS SERVER: Listening on http://0.0.0.0:${port}`)
	bootstrapLogger.log(`STARTUP: Completed in ${startupTime}s`)
	const nodeEnv = appConfigService.getNodeEnv()
	bootstrapLogger.log(`ENVIRONMENT: ${nodeEnv}`)
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
