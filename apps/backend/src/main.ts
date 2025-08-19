import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import {
	FastifyAdapter,
	type NestFastifyApplication
} from '@nestjs/platform-fastify'
import helmet from '@fastify/helmet'

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({ trustProxy: true, bodyLimit: 10485760 })
	)

	const configService = app.get(ConfigService)

	// Core configuration
	app.setGlobalPrefix('api/v1', {
		exclude: [
			{ path: 'health', method: 0 },
			{ path: 'health/detailed', method: 0 },
			{ path: 'ping', method: 0 },
			{ path: '/', method: 0 }
		]
	})

	app.enableCors({
		origin: configService.get('CORS_ORIGINS', ['https://tenantflow.app']),
		credentials: true
	})

	// Use NestJS native validation pipe
	app.useGlobalPipes(new ValidationPipe())

	// Production security
	await app.register(helmet)

	// Liveness probe independent of downstream deps
	const fastify = app.getHttpAdapter().getInstance()
	fastify.get('/ping', async (_req: unknown, reply: { code: (code: number) => { send: (data: unknown) => void } }) => {
		reply.code(200).send({ status: 'ok' })
	})

	app.enableShutdownHooks()

	// Start server
	const port = configService.get('PORT', 3001)
	const logger = new Logger('Bootstrap')

	try {
		await app.listen(port, '0.0.0.0')
		logger.log(`🚀 Server successfully started on 0.0.0.0:${port}`)
		logger.log(
			`✅ Health check endpoint available at: http://127.0.0.1:${port}/health`
		)
		logger.log(
			`✅ API endpoints available at: http://127.0.0.1:${port}/api/v1/`
		)
	} catch (error) {
		logger.error(`❌ Failed to start server on port ${port}:`, error)
		process.exit(1)
	}
}

bootstrap().catch(err => {
	const logger = new Logger('Bootstrap')
	logger.error('❌ Bootstrap failed with error:', err)
	logger.error('❌ Stack trace:', err.stack)
	logger.error('❌ Environment:', {
		NODE_ENV: process.env.NODE_ENV,
		PORT: process.env.PORT,
		hasDatabase: !!process.env.DATABASE_URL,
		hasSupabase: !!process.env.SUPABASE_URL
	})
	process.exit(1)
})