import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()
import { NestFactory } from '@nestjs/core'
import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import {
	FastifyAdapter,
	type NestFastifyApplication
} from '@nestjs/platform-fastify'
import helmet from '@fastify/helmet'
import { createCorsOptions } from './config/cors.options'

async function bootstrap() {
	const logger = new Logger('Bootstrap')
	
	logger.log('=== TENANTFLOW BACKEND STARTUP ===')
	logger.log(`Node.js version: ${process.version}`)
	logger.log(`Environment: ${process.env.NODE_ENV}`)
	logger.log(`Docker Container: ${process.env.DOCKER_CONTAINER || 'false'}`)
	logger.log(`Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'none'}`)
	logger.log(`Target Port: ${process.env.PORT || 4600}`)
	
	logger.log('Creating NestJS application...')
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter({ trustProxy: true, bodyLimit: 10485760 })
	)
	logger.log('NestJS application created successfully')

	const configService = app.get(ConfigService)

	logger.log('Configuring application middleware...')
	
	// Core configuration
	logger.log('Setting global prefix: api/v1')
	app.setGlobalPrefix('api/v1', {
		exclude: [
			{ path: 'health', method: 0 },
			{ path: 'health/ping', method: 0 },
			{ path: 'health/ready', method: 0 },
			{ path: 'health/debug', method: 0 },
			{ path: '/', method: 0 }
		]
	})

	// Configure CORS using centralized configuration
	logger.log('Configuring CORS...')
	const corsOptions = createCorsOptions()
	app.enableCors(corsOptions)
	logger.log('CORS enabled')

	// Use NestJS native validation pipe with better configuration
	logger.log('Setting up validation pipes...')
	app.useGlobalPipes(new ValidationPipe({
		whitelist: true, // Strip properties not in DTO
		forbidNonWhitelisted: true, // Throw error if non-whitelisted properties
		transform: true, // Auto-transform payloads to DTO instances
		transformOptions: {
			enableImplicitConversion: true // Allow implicit type conversion
		}
	}))

	// Production security
	logger.log('Registering security middleware (helmet)...')
	await app.register(helmet)
	logger.log('Security middleware registered')

	// Liveness probe handled by HealthController
	logger.log('Enabling graceful shutdown hooks...')
	app.enableShutdownHooks()

	// Start server
	const port = configService.get('PORT', 4600)
	logger.log(`Preparing to start server on port ${port}...`)

	try {
		logger.log(`Binding to 0.0.0.0:${port}...`)
		await app.listen(port, '0.0.0.0')
		
		logger.log('=== SERVER STARTUP SUCCESSFUL ===')
		logger.log(`🚀 Server listening on 0.0.0.0:${port}`)
		logger.log(`🌍 Environment: ${process.env.NODE_ENV}`)
		logger.log(`📦 Docker Container: ${process.env.DOCKER_CONTAINER || 'false'}`)
		logger.log(`🚄 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'none'}`)
		logger.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`)
		logger.log(`⏱️  Startup time: ${process.uptime()}s`)
		
		// Health check endpoints
		logger.log('=== HEALTH CHECK ENDPOINTS ===')
		logger.log(`✅ Ping (bulletproof): http://localhost:${port}/health/ping`)
		logger.log(`🔍 Full health check: http://localhost:${port}/health`)
		logger.log(`📊 Debug info: http://localhost:${port}/health/debug`)
		logger.log(`🚀 Readiness probe: http://localhost:${port}/health/ready`)
		
		// External URLs (if not local)
		if (process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL_ENV) {
			logger.log('=== EXTERNAL ENDPOINTS ===')
			logger.log(`🌐 External health: https://api.tenantflow.app/health/ping`)
			logger.log(`🌐 External API: https://api.tenantflow.app/api/v1/`)
		}
		
		logger.log('=== READY FOR TRAFFIC ===')
	} catch (error: unknown) {
		logger.error('=== SERVER STARTUP FAILED ===')
		logger.error(`❌ Failed to start server on port ${port}`)
		logger.error(`Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`)
		logger.error(`Error message: ${error instanceof Error ? error.message : String(error)}`)
		logger.error(`Error code: ${(error instanceof Error && 'code' in error) ? (error as Error & { code: string }).code : 'unknown'}`)
		logger.error(`Stack trace: ${error instanceof Error ? error.stack : 'No stack'}`)
		
		// Additional debugging info
		logger.error('=== ENVIRONMENT DEBUG ===')
		logger.error(`NODE_ENV: ${process.env.NODE_ENV}`)
		logger.error(`PORT: ${process.env.PORT}`)
		logger.error(`DOCKER_CONTAINER: ${process.env.DOCKER_CONTAINER}`)
		logger.error(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`)
		logger.error(`Process PID: ${process.pid}`)
		logger.error(`Process uptime: ${process.uptime()}s`)
		
		process.exit(1)
	}
}

bootstrap().catch(err => {
	const logger = new Logger('Bootstrap')
	
	logger.error('=== BOOTSTRAP CATASTROPHIC FAILURE ===')
	logger.error(`❌ Application failed to start`)
	logger.error(`Error type: ${err.constructor.name}`)
	logger.error(`Error message: ${err.message}`)
	logger.error(`Error code: ${err.code || 'unknown'}`)
	logger.error(`Stack trace:`, err.stack)
	
	logger.error('=== ENVIRONMENT AUDIT ===')
	logger.error(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`)
	logger.error(`PORT: ${process.env.PORT || 'undefined'}`)
	logger.error(`DOCKER_CONTAINER: ${process.env.DOCKER_CONTAINER || 'undefined'}`)
	logger.error(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'undefined'}`)
	logger.error(`Supabase URL: ${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`)
	logger.error(`Supabase Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}`)
	logger.error(`JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'MISSING'}`)
	
	logger.error('=== PROCESS INFO ===')
	logger.error(`Process PID: ${process.pid}`)
	logger.error(`Node version: ${process.version}`)
	logger.error(`Platform: ${process.platform}`)
	logger.error(`Architecture: ${process.arch}`)
	logger.error(`Uptime: ${process.uptime()}s`)
	logger.error(`Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`)
	
	logger.error('=== APPLICATION WILL EXIT ===')
	process.exit(1)
})
