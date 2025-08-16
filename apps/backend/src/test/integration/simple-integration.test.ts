import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ConfigValidator } from '../../common/config/config.validator'
import { RuntimeTypeCheckerService } from '../../common/validation/runtime-type-checker.service'
import { ZodErrorMappingService } from '../../common/validation/zod-error-mapping.service'

/**
 * Simple Integration Tests - Core Functionality
 * 
 * These tests validate the exact core functionality that runs in production
 * without the complexity of the full AppModule dependency tree.
 */
describe('Simple Integration Tests - Core Production Functionality', () => {
  describe('Configuration Validation - Real Environment Variables', () => {
    let configValidator: ConfigValidator
    let configService: ConfigService

    beforeAll(async () => {
      // Set production-like environment variables
      process.env.NODE_ENV = 'test'
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'
      process.env.JWT_SECRET = 'integration-jwt-secret-minimum-32-characters-for-security-validation'
      process.env.SUPABASE_URL = 'https://test-project.supabase.co'
      process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key-40-chars'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key'
      process.env.SUPABASE_JWT_SECRET = 'integration-supabase-jwt-secret-32-characters-minimum'
      process.env.CORS_ORIGINS = 'https://tenantflow.app,https://app.tenantflow.app'

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test'
          })
        ],
        providers: [
          ConfigService,
          ZodErrorMappingService,
          RuntimeTypeCheckerService,
          ConfigValidator
        ]
      }).compile()

      configService = module.get<ConfigService>(ConfigService)
      configValidator = module.get<ConfigValidator>(ConfigValidator)
    })

    it('should read actual environment variables not mocked ones', () => {
      // Test that ConfigService reads from real process.env
      const nodeEnv = configService.get('NODE_ENV')
      const dbUrl = configService.get('DATABASE_URL')
      
      expect(nodeEnv).toBe(process.env.NODE_ENV)
      expect(dbUrl).toBe(process.env.DATABASE_URL)
      expect(nodeEnv).toBe('test')
    })

    it('should validate production configuration using real validator', () => {
      // Test the ACTUAL ConfigValidator with real environment variables
      const startupValidation = configValidator.validateStartupConfig()
      
      if (!startupValidation.isValid) {
        console.error('Startup validation errors:', startupValidation.errors)
      }
      
      expect(startupValidation.isValid).toBe(true)
      expect(startupValidation.errors).toHaveLength(0)
    })

    it('should detect missing critical configuration', () => {
      // Test what happens with missing DATABASE_URL
      const originalDbUrl = process.env.DATABASE_URL
      delete process.env.DATABASE_URL

      const validation = configValidator.validateStartupConfig()
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(error => 
        error.toLowerCase().includes('database')
      )).toBe(true)

      // Restore
      process.env.DATABASE_URL = originalDbUrl
    })

    it('should validate runtime configuration changes', () => {
      const runtimeConfig = {
        CORS_ORIGINS: 'https://new-domain.tenantflow.app',
        LOG_LEVEL: 'debug'
      }

      const result = configValidator.validateRuntimeConfig(runtimeConfig)
      expect(result.isValid).toBe(true)
    })

    it('should perform cross-validation checks', () => {
      const crossValidation = configValidator.performCrossValidation()
      expect(crossValidation.isValid).toBe(true)
      expect(Array.isArray(crossValidation.warnings)).toBe(true)
    })
  })


  describe('Error Scenarios - Production Failure Conditions', () => {
    it('should handle invalid JWT secret validation', () => {
      const originalJwt = process.env.JWT_SECRET
      process.env.JWT_SECRET = 'too-short'

      const module = Test.createTestingModule({
        imports: [ConfigModule.forRoot()],
        providers: [
          ConfigService,
          ZodErrorMappingService,
          RuntimeTypeCheckerService,
          ConfigValidator
        ]
      }).compile()

      return module.then(async (testModule) => {
        const validator = testModule.get<ConfigValidator>(ConfigValidator)
        const validation = validator.validateStartupConfig()

        expect(validation.isValid).toBe(false)
        expect(validation.errors.some(error => 
          error.toLowerCase().includes('jwt') ||
          error.toLowerCase().includes('secret') ||
          error.toLowerCase().includes('32')
        )).toBe(true)

        // Restore
        process.env.JWT_SECRET = originalJwt
      })
    })

    it('should handle malformed Supabase URL validation', () => {
      const originalUrl = process.env.SUPABASE_URL
      process.env.SUPABASE_URL = 'not-a-valid-url'

      const module = Test.createTestingModule({
        imports: [ConfigModule.forRoot()],
        providers: [
          ConfigService,
          ZodErrorMappingService,
          RuntimeTypeCheckerService,
          ConfigValidator
        ]
      }).compile()

      return module.then(async (testModule) => {
        const validator = testModule.get<ConfigValidator>(ConfigValidator)
        const validation = validator.validateStartupConfig()

        expect(validation.isValid).toBe(false)
        expect(validation.errors.some(error => 
          error.toLowerCase().includes('supabase') ||
          error.toLowerCase().includes('url') ||
          error.toLowerCase().includes('https')
        )).toBe(true)

        // Restore
        process.env.SUPABASE_URL = originalUrl
      })
    })
  })

  describe('Performance Testing - Production Load Characteristics', () => {
    let corsSecurityService: CorsSecurityService
    let configValidator: ConfigValidator

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot()],
        providers: [
          ConfigService,
          ZodErrorMappingService,
          RuntimeTypeCheckerService,
          ConfigValidator,
          CorsSecurityService
        ]
      }).compile()

      corsSecurityService = module.get<CorsSecurityService>(CorsSecurityService)
      configValidator = module.get<ConfigValidator>(ConfigValidator)
    })

    it('should validate CORS efficiently under load', () => {
      const iterations = 1000
      const origins = [
        'https://tenantflow.app',
        'https://app.tenantflow.app',
        'https://evil-site.com'
      ]

      const startTime = Date.now()

      for (let i = 0; i < iterations; i++) {
        const origin = origins[i % origins.length]
        corsSecurityService.validateOrigin(origin, 'Mozilla/5.0', '127.0.0.1')
      }

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // Should complete under 1 second
    })

    it('should complete configuration validation quickly', () => {
      const startTime = Date.now()

      for (let i = 0; i < 100; i++) {
        configValidator.validateStartupConfig()
      }

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(2000) // Should complete under 2 seconds
    })
  })
})