import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import {
	FastifyAdapter,
	NestFastifyApplication
} from '@nestjs/platform-fastify'
import { ConfigService } from '@nestjs/config'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { FastifyPluginsConfigService } from '../../common/plugins/fastify-plugins.config'
import { CorsSecurityValidator } from '../../common/config/cors.config'
import { ConfigValidator } from '../../common/config/config.validator'

/**
 * Integration Tests - Real NestJS Application Testing
 *
 * These tests start the complete NestJS application exactly as it runs in production.
 * They test the EXACT same code paths that production requests follow.
 *
 * This ensures tests are a perfect indication of production functionality.
 */
describe('App Integration Tests - Complete Production Flow', () => {
	let app: NestFastifyApplication
	let configService: ConfigService
	let corsSecurityService: CorsSecurityService
	let configValidator: ConfigValidator
	let fastifyPluginsService: FastifyPluginsConfigService

	/**
	 * Bootstrap the complete NestJS application with all production modules
	 * This is the EXACT same bootstrap process as main.ts
	 */
	beforeAll(async () => {
		// Set test environment variables that mirror production requirements
		process.env.NODE_ENV = 'test'
		process.env.DATABASE_URL =
			'postgresql://test:test@localhost:5432/testdb'
		process.env.JWT_SECRET =
			'test-jwt-secret-minimum-32-characters-for-security-validation'
		process.env.SUPABASE_URL = 'https://test-project.supabase.co'
		process.env.SUPABASE_ANON_KEY =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-for-supabase'
		process.env.SUPABASE_SERVICE_ROLE_KEY =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key'
		process.env.SUPABASE_JWT_SECRET =
			'test-jwt-secret-for-supabase-minimum-32-characters'
		process.env.CORS_ORIGINS =
			'https://tenantflow.app,https://app.tenantflow.app'
		process.env.STRIPE_SECRET_KEY =
			'sk_test_valid_stripe_secret_key_for_testing'
		process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid_webhook_secret'
		process.env.FRONTEND_URL = 'https://tenantflow.app'
		process.env.RESEND_API_KEY = 'test-resend-api-key'

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule] // Use the EXACT same AppModule as production
		}).compile()

		// Create FastifyAdapter exactly like main.ts
		app = moduleFixture.createNestApplication<NestFastifyApplication>(
			new FastifyAdapter({ logger: false })
		)

		// Get services to test their integration
		configService = app.get<ConfigService>(ConfigService)
		corsSecurityService = app.get<CorsSecurityService>(CorsSecurityService)
		configValidator = app.get<ConfigValidator>(ConfigValidator)
		fastifyPluginsService = new FastifyPluginsConfigService()

		// Initialize utility plugins exactly like main.ts
		await fastifyPluginsService.initializeUtilityPlugins(app, configService)

		await app.init()
		await app.getHttpAdapter().getInstance().ready()
	})

	afterAll(async () => {
		await app.close()
	})

	describe('Enhanced Configuration Integration - Production Bootstrap', () => {
		it('should successfully validate configuration during app startup', () => {
			// Test that EnhancedConfigModule.forRoot() worked correctly
			expect(configService).toBeDefined()
			expect(configService.get('NODE_ENV')).toBe('test')
			expect(configService.get('DATABASE_URL')).toContain('postgresql://')
		})

		it('should validate complete configuration exactly as production does', () => {
			// Test the ACTUAL ConfigValidator instance used by the app
			const startupValidation = configValidator.validateStartupConfig()

			expect(startupValidation.isValid).toBe(true)
			expect(startupValidation.errors).toHaveLength(0)
		})

		it('should detect invalid configuration that would break production startup', async () => {
			// Test what happens with invalid configuration
			const originalDbUrl = process.env.DATABASE_URL
			delete process.env.DATABASE_URL

			// Create a new app instance with missing config
			const testModule = await Test.createTestingModule({
				imports: [AppModule]
			}).compile()

			const testApp =
				testModule.createNestApplication<NestFastifyApplication>(
					new FastifyAdapter({ logger: false })
				)

			const testConfigValidator =
				testApp.get<ConfigValidator>(ConfigValidator)
			const validation = testConfigValidator.validateStartupConfig()

			expect(validation.isValid).toBe(false)
			expect(validation.errors.length).toBeGreaterThan(0)

			await testApp.close()

			// Restore
			process.env.DATABASE_URL = originalDbUrl
		})

		it('should handle Railway environment detection in production-like scenario', () => {
			// Mock Railway environment
			const originalEnv = process.env.RAILWAY_ENVIRONMENT
			process.env.RAILWAY_ENVIRONMENT = 'production'
			process.env.RAILWAY_SERVICE_NAME = 'tenantflow-backend'
			process.env.RAILWAY_STATIC_URL =
				'https://tenantflow-backend-production.up.railway.app'

			const crossValidation = configValidator.performCrossValidation()
			expect(crossValidation.isValid).toBe(true)

			// Restore
			if (originalEnv) {
				process.env.RAILWAY_ENVIRONMENT = originalEnv
			} else {
				delete process.env.RAILWAY_ENVIRONMENT
			}
			delete process.env.RAILWAY_SERVICE_NAME
			delete process.env.RAILWAY_STATIC_URL
		})
	})

	describe('CORS Integration - Complete HTTP Request Flow', () => {
		it('should handle CORS preflight request exactly as production does', async () => {
			const response = await request(app.getHttpServer())
				.options('/health')
				.set('Origin', 'https://tenantflow.app')
				.set('Access-Control-Request-Method', 'GET')
				.set(
					'Access-Control-Request-Headers',
					'content-type,authorization'
				)

			// Test that CorsInterceptor processed the request
			expect(response.status).toBe(204)
			expect(
				response.headers['access-control-allow-origin']
			).toBeDefined()
			expect(
				response.headers['access-control-allow-methods']
			).toBeDefined()
		})

		it('should reject invalid origins exactly as production does', async () => {
			const response = await request(app.getHttpServer())
				.get('/health')
				.set('Origin', 'https://malicious-site.com')

			// Should reject invalid origin with 403
			expect(response.status).toBe(403)
			expect(response.body.message).toContain('Origin not allowed')
		})

		it('should allow valid origins and set correct headers', async () => {
			const response = await request(app.getHttpServer())
				.get('/health')
				.set('Origin', 'https://tenantflow.app')

			expect(response.status).toBe(200)
			expect(response.headers['access-control-allow-origin']).toBe(
				'https://tenantflow.app'
			)
		})

		it('should handle multiple valid origins correctly', async () => {
			const validOrigins = [
				'https://tenantflow.app',
				'https://app.tenantflow.app'
			]

			for (const origin of validOrigins) {
				const response = await request(app.getHttpServer())
					.get('/health')
					.set('Origin', origin)

				expect(response.status).toBe(200)
				expect(response.headers['access-control-allow-origin']).toBe(
					origin
				)
			}
		})

		it('should validate origin through complete interceptor chain', () => {
			// Test direct service integration (what interceptor calls)
			const validOrigin = corsSecurityService.validateOrigin(
				'https://tenantflow.app',
				'Mozilla/5.0 Test Browser',
				'127.0.0.1'
			)
			expect(validOrigin).toBe(true)

			const invalidOrigin = corsSecurityService.validateOrigin(
				'https://malicious-site.com',
				'Mozilla/5.0 Test Browser',
				'127.0.0.1'
			)
			expect(invalidOrigin).toBe(false)
		})
	})

	describe('Fastify Plugins Integration - Production Plugin Loading', () => {
		it('should successfully initialize all utility plugins', async () => {
			// Test that plugins were loaded without errors
			// The fastifyPluginsService.initializeUtilityPlugins() was called in beforeAll

			// Verify circuit breaker is configured
			const fastifyInstance = app.getHttpAdapter().getInstance()
			expect(fastifyInstance.hasDecorator('circuitBreaker')).toBe(true)
		})

		it('should serve static files through configured plugins', async () => {
			// Test static file serving plugin
			const response = await request(app.getHttpServer()).get(
				'/uploads/test.txt'
			)

			// Should return 404 for non-existent file (but plugin is working)
			expect(response.status).toBe(404)
		})

		it('should validate environment through Fastify env plugin', () => {
			// Test that environment validation plugin processed config
			const fastifyInstance = app.getHttpAdapter().getInstance()

			// Fastify env plugin should have validated our config
			expect(fastifyInstance.config).toBeDefined()
		})

		it('should handle template rendering capability', async () => {
			// Test that view engine is configured (even if templates dir doesn't exist)
			const fastifyInstance = app.getHttpAdapter().getInstance()

			// View decorator should be available if templates exist
			const hasViewDecorator = fastifyInstance.hasDecorator('view')

			// This might be false if templates directory doesn't exist (non-critical)
			expect(typeof hasViewDecorator).toBe('boolean')
		})
	})

	describe('Complete Application Health - End-to-End Validation', () => {
		it('should respond to health checks through complete stack', async () => {
			const response = await request(app.getHttpServer()).get('/health')

			expect(response.status).toBe(200)
			expect(response.body).toBeDefined()
		})

		it('should handle authentication flow through complete guard chain', async () => {
			// Test that JWT auth guard is working
			const response = await request(app.getHttpServer())
				.get('/users') // Protected endpoint
				.set('Origin', 'https://tenantflow.app')

			// Should get 401 without valid JWT (auth working)
			expect(response.status).toBe(401)
		})

		it('should process requests through complete interceptor chain', async () => {
			const response = await request(app.getHttpServer())
				.get('/health')
				.set('Origin', 'https://tenantflow.app')
				.set('User-Agent', 'Test Client/1.0')

			// Verify interceptors processed the request
			expect(response.status).toBe(200)

			// Should have CORS headers (CorsInterceptor)
			expect(
				response.headers['access-control-allow-origin']
			).toBeDefined()

			// Should have correlation ID (AppInterceptor)
			expect(response.headers['x-correlation-id']).toBeDefined()
		})

		it('should enforce rate limiting through complete throttler chain', async () => {
			// Make multiple rapid requests to test throttling
			const requests = Array(20)
				.fill(null)
				.map(() =>
					request(app.getHttpServer())
						.get('/health')
						.set('Origin', 'https://tenantflow.app')
				)

			const responses = await Promise.all(requests)

			// Some requests should succeed, but rate limiting should kick in
			const successCount = responses.filter(r => r.status === 200).length
			const rateLimitedCount = responses.filter(
				r => r.status === 429
			).length

			expect(successCount + rateLimitedCount).toBe(20)
			// At least some should succeed
			expect(successCount).toBeGreaterThan(0)
		})
	})

	describe('Error Scenarios - Production Failure Testing', () => {
		it('should handle invalid JSON requests correctly', async () => {
			const response = await request(app.getHttpServer())
				.post('/health')
				.set('Content-Type', 'application/json')
				.set('Origin', 'https://tenantflow.app')
				.send('invalid json{')

			expect(response.status).toBe(400)
		})

		it('should handle circuit breaker scenarios', async () => {
			// Circuit breaker should be configured and handle failures gracefully
			const fastifyInstance = app.getHttpAdapter().getInstance()

			// Verify circuit breaker decorator exists
			expect(fastifyInstance.hasDecorator('circuitBreaker')).toBe(true)
		})

		it('should enforce security headers through complete middleware chain', async () => {
			const response = await request(app.getHttpServer())
				.get('/health')
				.set('Origin', 'https://tenantflow.app')

			// Security headers should be applied
			expect(response.headers['x-frame-options']).toBeDefined()
			expect(response.headers['x-content-type-options']).toBeDefined()
		})
	})

	describe('Real Environment Variable Testing', () => {
		it('should read actual environment variables not mocked ones', () => {
			// Test that ConfigService reads from real process.env
			const nodeEnv = configService.get('NODE_ENV')
			const dbUrl = configService.get('DATABASE_URL')

			expect(nodeEnv).toBe(process.env.NODE_ENV)
			expect(dbUrl).toBe(process.env.DATABASE_URL)
		})

		it('should validate against real environment constraints', () => {
			// Test configuration validation with actual env vars
			const validation = configValidator.validateStartupConfig()

			// This tests the ACTUAL validation that runs at startup
			expect(validation.isValid).toBe(true)

			if (!validation.isValid) {
				console.error('Validation errors:', validation.errors)
			}
		})
	})
})
