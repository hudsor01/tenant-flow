import * as dotenv from 'dotenv'
import 'reflect-metadata'
dotenv.config()

import cors from '@fastify/cors'
import { RequestMethod, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import {
	FastifyAdapter,
	type NestFastifyApplication
} from '@nestjs/platform-fastify'
import { getCORSConfig } from '@repo/shared'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { HEALTH_PATHS } from './shared/constants/routes'

// Extend FastifyRequest interface for timing
declare module 'fastify' {
	interface FastifyRequest {
		startTime?: number
	}
}

async function bootstrap() {
	const startTime = Date.now()
	const port = parseInt(process.env.PORT ?? '4600', 10)

	// Create Fastify adapter
	const fastifyAdapter = new FastifyAdapter({
		logger: false // Disable Fastify's internal logger, use NestJS Pino instead
	})

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
	const logger = app.get(Logger)

	// Set global prefix
	app.setGlobalPrefix('api/v1', {
		exclude: [
			...HEALTH_PATHS.map(path => ({ path, method: RequestMethod.ALL })),
			{ path: '/', method: RequestMethod.ALL }
		]
	})

	// Configure CORS using unified configuration (aligned with CSP)
	logger.log('Configuring CORS...')
	await app.register(cors, getCORSConfig())
	logger.log('CORS enabled with aligned configuration')

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
	const startupTime = ((Date.now() - startTime) / 1000).toFixed(2)
	logger.log(`SERVER: Listening on http://0.0.0.0:${port}`)
	logger.log(`STARTUP: Completed in ${startupTime}s`)
	logger.log(`ENVIRONMENT: ${process.env.NODE_ENV}`)
}

// Handle errors
bootstrap().catch(err => {
	console.error('ERROR: Failed to start server:', err)
	process.exit(1)
})

// Graceful shutdown handlers
process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down gracefully...')
})

process.on('SIGINT', () => {
	console.log('SIGINT received, shutting down gracefully...')
})
