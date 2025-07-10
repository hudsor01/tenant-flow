import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { join } from 'path'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: false, // Disable default body parser
	})
	const configService = app.get(ConfigService)
	const logger = new Logger('Bootstrap')
	
	// Configure body parsing with raw body support for Stripe webhooks
	app.use((req: any, res: any, next: any) => {
		if (req.url === '/api/v1/stripe/webhook') {
			// For Stripe webhooks, we need the raw body
			let data = ''
			req.setEncoding('utf8')
			req.on('data', (chunk: string) => {
				data += chunk
			})
			req.on('end', () => {
				req.rawBody = Buffer.from(data)
				req.body = data
				next()
			})
		} else {
			// For all other routes, use JSON parsing
			const express = require('express')
			express.json()(req, res, next)
		}
	})

	// Serve static files for uploads
	app.useStaticAssets(join(__dirname, '..', 'uploads'), {
		prefix: '/uploads/'
	})

	// Security middleware
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'"],
					imgSrc: ["'self'", 'data:', 'https:']
				}
			},
			crossOriginEmbedderPolicy: false
		})
	)

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			transformOptions: {
				enableImplicitConversion: true
			}
		})
	)

	// CORS configuration
	const corsOrigins = configService
		.get<string>('CORS_ORIGINS')
		?.split(',') || [
		'https://tenantflow.app',
		'https://www.tenantflow.app',
		'https://api.tenantflow.app'
	]

	app.enableCors({
		origin: corsOrigins,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: [
			'Origin',
			'X-Requested-With',
			'Content-Type',
			'Accept',
			'Authorization',
			'Cache-Control'
		]
	})

	// Global prefix for API routes
	app.setGlobalPrefix('api/v1')

	const port = configService.get<number>('PORT') || 3001

	try {
		await app.listen(port, '0.0.0.0')
		
		const environment = configService.get<string>('NODE_ENV') || 'development'

		if (environment === 'production') {
			// Production: Only log essential connection status
			logger.log(`TenantFlow API Server connected on port ${port}`)
		} else {
			// Development: Detailed logging
			const baseUrl = `http://localhost:${port}`
			logger.log(`🚀 TenantFlow API Server running on ${baseUrl}`)
			logger.log(`📚 API Documentation: ${baseUrl}/api/v1`)
			logger.log(`🔐 Authentication: Supabase Hybrid Mode`)
			logger.log(`🌍 Environment: ${environment}`)
			logger.log(`🔗 CORS Origins: ${corsOrigins.join(', ')}`)
		}
	} catch (error) {
		logger.error(`❌ Failed to start server on port ${port}:`, error)
		throw error
	}
}

bootstrap().catch(error => {
	console.error('❌ Failed to start server:', error)
	process.exit(1)
})
