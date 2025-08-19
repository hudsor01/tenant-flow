import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyConfigService } from './common/fastify/fastify-config.service'
import { setupSwagger } from './config/swagger.config'
import helmet from '@fastify/helmet'
import { EnvValidator } from './config/env-validator'
import { ZodValidationPipe } from './common/validation/zod-validation.pipe'

EnvValidator.validate()

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({ trustProxy: true, bodyLimit: 10485760 })
	)
	
	const configService = app.get(ConfigService)
	const isProduction = configService.get('NODE_ENV') === 'production'
	
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
		origin: configService.get('CORS_ORIGINS', ['http://localhost:3000']),
		credentials: true
	})
	
	// Use NestJS native validation pipe (replaces Zod)
	app.useGlobalPipes(new ZodValidationPipe())
	
	// Optional configurations
	if (isProduction) {await app.register(helmet)}
	if (!isProduction) {await setupSwagger(app)}
	
	// Fastify plugins
	const fastifyConfig = new FastifyConfigService()
	await fastifyConfig.configureFastifyPlugins(app)
	
	app.enableShutdownHooks()
	
	// Start server
	const port = configService.get('PORT', 3001)
	await app.listen(port, '0.0.0.0')
	const logger = new Logger('Bootstrap')
	logger.log(`🚀 Server running on port ${port}`)
}

bootstrap().catch(err => {
	const logger = new Logger('Bootstrap')
	logger.error('Bootstrap failed:', err)
	process.exit(1)
})