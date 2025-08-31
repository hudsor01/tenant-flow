import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()

import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import cors from '@fastify/cors'
import { FASTIFY_OPTIONS, registerCorePlugins } from './config/fastify.config'

async function bootstrap() {
	const startTime = Date.now()
	const port = parseInt(process.env.PORT ?? '4600', 10)
	
	// Create Fastify adapter
	const fastifyAdapter = new FastifyAdapter(FASTIFY_OPTIONS)
	
	// Create NestJS application
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		fastifyAdapter,
		{
			rawBody: true,
			bufferLogs: true
		}
	)

	// Use Pino logger
	app.useLogger(app.get(Logger))
	
	// Set global prefix
	app.setGlobalPrefix('api/v1', {
		exclude: ['/health', '/health/ping', '/health/ready', '/health/debug']
	})

	// Enable CORS
	await app.register(cors, {
		origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
	})

	// Register Fastify plugins
	await registerCorePlugins(app)

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			transformOptions: { enableImplicitConversion: true },
			whitelist: true,
			forbidNonWhitelisted: true,
			disableErrorMessages: process.env.NODE_ENV === 'production',
			validationError: { target: false, value: false }
		})
	)

	// Enable graceful shutdown
	app.enableShutdownHooks()

	// Start server
	await app.listen(port, '0.0.0.0')
	
	// Log startup info
	const logger = app.get(Logger)
	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	logger.log(`🚀 Server listening on http://0.0.0.0:${port}`)
	logger.log(`⏱️  Startup time: ${startupTime}s`)
	logger.log(`🌍 Environment: ${process.env.NODE_ENV}`)
}

// Handle errors
bootstrap().catch(err => {
	console.error('❌ Failed to start server:', err)
	process.exit(1)
})

// Graceful shutdown handlers
process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down gracefully...')
})

process.on('SIGINT', () => {
	console.log('SIGINT received, shutting down gracefully...')
})