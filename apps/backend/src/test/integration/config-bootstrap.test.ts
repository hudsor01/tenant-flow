import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from '../../app.module'
import { ConfigValidator } from '../../common/config/config.validator'
import { EnhancedConfigModule } from '../../common/config/enhanced-config.module'

/**
 * Configuration Bootstrap Integration Tests
 * 
 * These tests validate the EXACT configuration validation that happens
 * during application startup in production. They test real environment
 * variable reading and the complete bootstrap process.
 */
describe('Configuration Bootstrap - Production Startup Flow', () => {
  describe('Successful Bootstrap Scenarios', () => {
    it('should successfully bootstrap with complete production configuration', async () => {
      // Set complete production-like environment
      const testEnv = {
        NODE_ENV: 'test',
        PORT: '3001',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        JWT_SECRET: 'production-grade-jwt-secret-minimum-32-characters-required',
        SUPABASE_URL: 'https://test-project.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-40-chars-min',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key',
        SUPABASE_JWT_SECRET: 'supabase-jwt-secret-32-characters-minimum-length',
        CORS_ORIGINS: 'https://tenantflow.app,https://app.tenantflow.app',
        STRIPE_SECRET_KEY: 'sk_test_valid_stripe_secret_key_for_testing_environment',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_valid_webhook_secret_for_stripe_integration',
        FRONTEND_URL: 'https://tenantflow.app',
        RESEND_API_KEY: 'test-resend-api-key-for-email-integration'
      }

      // Apply environment variables
      Object.entries(testEnv).forEach(([key, value]) => {
        process.env[key] = value
      })

      // Attempt to bootstrap the EXACT same way as production
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule], // Complete production module
      }).compile()

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      // This should succeed if configuration is valid
      await expect(app.init()).resolves.not.toThrow()
      
      // Verify services are properly configured
      const configService = app.get<ConfigService>(ConfigService)
      const configValidator = app.get<ConfigValidator>(ConfigValidator)

      // Test actual configuration reading
      expect(configService.get('NODE_ENV')).toBe('test')
      expect(configService.get('DATABASE_URL')).toContain('postgresql://')
      
      // Test startup validation that actually ran
      const validation = configValidator.validateStartupConfig()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      await app.close()
    })

    it('should handle Railway production environment correctly', async () => {
      // Set Railway environment variables
      const railwayEnv = {
        NODE_ENV: 'production',
        RAILWAY_ENVIRONMENT: 'production',
        RAILWAY_SERVICE_NAME: 'tenantflow-backend',
        RAILWAY_STATIC_URL: 'https://tenantflow-backend-production.up.railway.app',
        DATABASE_URL: 'postgresql://postgres:password@railway.internal:5432/railway',
        JWT_SECRET: 'railway-production-jwt-secret-minimum-32-characters',
        SUPABASE_URL: 'https://production-project.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.production-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.production-service-key',
        SUPABASE_JWT_SECRET: 'production-supabase-jwt-secret-32-characters',
        CORS_ORIGINS: 'https://tenantflow.app,https://app.tenantflow.app',
        STRIPE_SECRET_KEY: 'sk_live_production_stripe_secret_key_for_payments',
        STRIPE_WEBHOOK_SECRET: 'whsec_production_webhook_secret_for_stripe_events'
      }

      Object.entries(railwayEnv).forEach(([key, value]) => {
        process.env[key] = value
      })

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      await expect(app.init()).resolves.not.toThrow()

      const configValidator = app.get<ConfigValidator>(ConfigValidator)
      
      // Test Railway-specific validation
      const crossValidation = configValidator.performCrossValidation()
      expect(crossValidation.isValid).toBe(true)
      
      // Should detect Railway environment
      const validation = configValidator.validateStartupConfig()
      expect(validation.isValid).toBe(true)

      await app.close()
    })
  })

  describe('Bootstrap Failure Scenarios - Production Error Conditions', () => {
    it('should fail to bootstrap with missing critical environment variables', async () => {
      // Clear critical environment variables
      const criticalVars = ['DATABASE_URL', 'JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']
      const originalValues: Record<string, string | undefined> = {}

      criticalVars.forEach(varName => {
        originalValues[varName] = process.env[varName]
        delete process.env[varName]
      })

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      // Validate that configuration fails
      const configValidator = app.get<ConfigValidator>(ConfigValidator)
      const validation = configValidator.validateStartupConfig()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      
      // Restore environment variables
      Object.entries(originalValues).forEach(([key, value]) => {
        if (value) {
          process.env[key] = value
        }
      })

      await app.close()
    })

    it('should fail with invalid database URL format', async () => {
      const originalDbUrl = process.env.DATABASE_URL
      
      // Set invalid database URL
      process.env.DATABASE_URL = 'invalid-database-url-format'

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      const configValidator = app.get<ConfigValidator>(ConfigValidator)
      const validation = configValidator.validateStartupConfig()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.toLowerCase().includes('database') || 
        error.toLowerCase().includes('url')
      )).toBe(true)

      // Restore
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl
      }

      await app.close()
    })

    it('should fail with weak JWT secret', async () => {
      const originalJwtSecret = process.env.JWT_SECRET
      
      // Set weak JWT secret
      process.env.JWT_SECRET = 'weak123'

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      const configValidator = app.get<ConfigValidator>(ConfigValidator)
      const validation = configValidator.validateStartupConfig()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.toLowerCase().includes('jwt') || 
        error.toLowerCase().includes('secret') ||
        error.toLowerCase().includes('32')
      )).toBe(true)

      // Restore
      if (originalJwtSecret) {
        process.env.JWT_SECRET = originalJwtSecret
      }

      await app.close()
    })

    it('should fail with invalid Supabase configuration', async () => {
      const originalSupabaseUrl = process.env.SUPABASE_URL
      
      // Set invalid Supabase URL
      process.env.SUPABASE_URL = 'http://not-supabase.com'

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      const configValidator = app.get<ConfigValidator>(ConfigValidator)
      const validation = configValidator.validateStartupConfig()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.toLowerCase().includes('supabase') || 
        error.toLowerCase().includes('https')
      )).toBe(true)

      // Restore
      if (originalSupabaseUrl) {
        process.env.SUPABASE_URL = originalSupabaseUrl
      }

      await app.close()
    })
  })

  describe('EnhancedConfigModule Integration - Real Module Loading', () => {
    it('should load EnhancedConfigModule.forRoot() exactly as production does', async () => {
      // Test the actual module loading process
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [EnhancedConfigModule.forRoot()], // Direct module test
      }).compile()

      // Should provide ConfigValidator
      const configValidator = moduleFixture.get<ConfigValidator>(ConfigValidator)
      expect(configValidator).toBeDefined()
      expect(typeof configValidator.validateStartupConfig).toBe('function')
    })

    it('should integrate with ConfigService exactly as production does', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const configService = moduleFixture.get<ConfigService>(ConfigService)
      const configValidator = moduleFixture.get<ConfigValidator>(ConfigValidator)

      // Test that ConfigValidator actually uses ConfigService
      const envVar = configService.get('NODE_ENV')
      expect(envVar).toBeDefined()
      
      // ConfigValidator should use the same ConfigService
      const validation = configValidator.validateStartupConfig()
      expect(validation).toBeDefined()
      expect(typeof validation.isValid).toBe('boolean')
    })
  })

  describe('Runtime Configuration Changes - Production Behavior', () => {
    let app: NestFastifyApplication
    let configValidator: ConfigValidator

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      configValidator = app.get<ConfigValidator>(ConfigValidator)

      await app.init()
    })

    afterAll(async () => {
      await app.close()
    })

    it('should validate runtime configuration changes', () => {
      const runtimeConfig = {
        CORS_ORIGINS: 'https://new-domain.tenantflow.app',
        API_RATE_LIMIT: '200',
        LOG_LEVEL: 'debug'
      }

      const result = configValidator.validateRuntimeConfig(runtimeConfig)
      expect(result.isValid).toBe(true)
    })

    it('should reject invalid runtime configuration', () => {
      const invalidConfig = {
        CORS_ORIGINS: 'invalid-url-format',
        API_RATE_LIMIT: 'not-a-number',
        JWT_SECRET: 'too-short'
      }

      const result = configValidator.validateRuntimeConfig(invalidConfig)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle partial configuration validation gracefully', () => {
      const partialConfig = {
        LOG_LEVEL: 'info'
        // Missing other config values
      }

      const result = configValidator.validateRuntimeConfig(partialConfig)
      // Runtime validation should be more lenient than startup validation
      expect(result.isValid).toBe(true)
    })
  })

  describe('Real Environment Variable Reading - No Mocks', () => {
    it('should read from actual process.env not mocked values', () => {
      // Set a test value in real process.env
      const testKey = 'TEST_CONFIG_VALIDATION_KEY'
      const testValue = 'test-value-12345'
      process.env[testKey] = testValue

      // Bootstrap app and verify it reads real environment
      return Test.createTestingModule({
        imports: [AppModule],
      }).compile().then(async (moduleFixture) => {
        const configService = moduleFixture.get<ConfigService>(ConfigService)
        
        // Should read from real process.env
        const value = configService.get(testKey)
        expect(value).toBe(testValue)
        
        // Clean up
        delete process.env[testKey]
      })
    })

    it('should validate against actual environment constraints', async () => {
      // Use actual current environment variables
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const configValidator = moduleFixture.get<ConfigValidator>(ConfigValidator)
      
      // This validates the ACTUAL configuration that would be used in production
      const validation = configValidator.validateStartupConfig()
      
      if (!validation.isValid) {
        console.error('Current environment configuration is invalid:')
        console.error('Errors:', validation.errors)
        console.error('Warnings:', validation.warnings)
      }
      
      // Should pass with current test environment
      expect(validation.isValid).toBe(true)
    })
  })

  describe('Performance Testing - Bootstrap Speed', () => {
    it('should complete configuration validation within performance threshold', async () => {
      const startTime = Date.now()

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile()

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ logger: false })
      )

      await app.init()

      const configValidator = app.get<ConfigValidator>(ConfigValidator)
      configValidator.validateStartupConfig()

      const duration = Date.now() - startTime
      
      // Bootstrap should complete quickly (production requirement)
      expect(duration).toBeLessThan(5000) // 5 seconds max

      await app.close()
    })
  })
})