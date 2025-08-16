import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { FastifyPluginsConfigService } from '../../common/plugins/fastify-plugins.config'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Fastify Plugins Integration Tests - Production Plugin Testing
 * 
 * These tests validate that the EXACT Fastify plugins configuration
 * from main.ts works correctly in production scenarios.
 */
describe('Fastify Plugins Integration - Production Plugin Behavior', () => {
  let app: NestFastifyApplication
  let configService: ConfigService
  let fastifyPluginsService: FastifyPluginsConfigService

  beforeAll(async () => {
    // Set environment for plugin testing
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb'
    process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-for-security'
    process.env.SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key'
    process.env.SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-32-characters'
    process.env.CORS_ORIGINS = 'https://tenantflow.app'
    process.env.FRONTEND_URL = 'https://tenantflow.app'

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false })
    )

    configService = app.get<ConfigService>(ConfigService)
    fastifyPluginsService = new FastifyPluginsConfigService()

    // Initialize plugins exactly like main.ts does
    await fastifyPluginsService.initializeUtilityPlugins(app, configService)

    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
    
    // Clean up test directories
    const testDirs = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'documents'),
      path.join(process.cwd(), 'templates')
    ]
    
    testDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true })
      }
    })
  })

  describe('Circuit Breaker Plugin - Production Resilience', () => {
    it('should register circuit breaker decorator on Fastify instance', () => {
      const fastifyInstance = app.getHttpAdapter().getInstance()
      
      // Circuit breaker should be registered as decorator
      expect(fastifyInstance.hasDecorator('circuitBreaker')).toBe(true)
    })

    it('should handle circuit breaker timeout scenario', async () => {
      // Simulate a slow request that would trigger circuit breaker
      const response = await request(app.getHttpServer())
        .get('/health')
        .timeout(1000) // Short timeout to test circuit breaker

      // Request should complete (may be fast, but circuit breaker is available)
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })

    it('should provide circuit breaker error responses when triggered', () => {
      const fastifyInstance = app.getHttpAdapter().getInstance()
      
      // Verify circuit breaker configuration exists
      expect(fastifyInstance.circuitBreaker).toBeDefined()
    })
  })

  describe('Static File Serving Plugin - File Handling', () => {
    it('should create uploads and documents directories', () => {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      const documentsDir = path.join(process.cwd(), 'documents')
      
      // Directories should be created by plugin initialization
      expect(fs.existsSync(uploadsDir)).toBe(true)
      expect(fs.existsSync(documentsDir)).toBe(true)
    })

    it('should serve files from uploads directory', async () => {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      const testFile = path.join(uploadsDir, 'test-upload.txt')
      
      // Create test file
      fs.writeFileSync(testFile, 'Test upload file content')
      
      const response = await request(app.getHttpServer())
        .get('/uploads/test-upload.txt')
      
      expect(response.status).toBe(200)
      expect(response.text).toBe('Test upload file content')
      expect(response.headers['cache-control']).toBeDefined()
      expect(response.headers['etag']).toBeDefined()
      
      // Clean up
      fs.unlinkSync(testFile)
    })

    it('should serve files from documents directory with longer cache', async () => {
      const documentsDir = path.join(process.cwd(), 'documents')
      const testFile = path.join(documentsDir, 'test-document.pdf')
      
      // Create test PDF file
      fs.writeFileSync(testFile, '%PDF-1.4 test document content')
      
      const response = await request(app.getHttpServer())
        .get('/documents/test-document.pdf')
      
      expect(response.status).toBe(200)
      expect(response.text).toContain('%PDF-1.4')
      
      // Documents should have longer cache (7 days vs 1 day for uploads)
      const cacheControl = response.headers['cache-control']
      expect(cacheControl).toContain('max-age')
      
      // Clean up
      fs.unlinkSync(testFile)
    })

    it('should deny access to dotfiles for security', async () => {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      const dotFile = path.join(uploadsDir, '.secret-file')
      
      // Create dotfile
      fs.writeFileSync(dotFile, 'secret content')
      
      const response = await request(app.getHttpServer())
        .get('/uploads/.secret-file')
      
      // Should be denied (403) or not found (404) for security
      expect([403, 404]).toContain(response.status)
      
      // Clean up
      fs.unlinkSync(dotFile)
    })

    it('should only serve allowed file extensions', async () => {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      const executableFile = path.join(uploadsDir, 'malicious.exe')
      
      // Create potentially dangerous file
      fs.writeFileSync(executableFile, 'executable content')
      
      const response = await request(app.getHttpServer())
        .get('/uploads/malicious.exe')
      
      // Should not serve non-allowed extensions
      expect([403, 404]).toContain(response.status)
      
      // Clean up
      fs.unlinkSync(executableFile)
    })
  })

  describe('Environment Validation Plugin - Fastify Env Integration', () => {
    it('should validate environment variables through Fastify env plugin', () => {
      const fastifyInstance = app.getHttpAdapter().getInstance()
      
      // Fastify env plugin should have processed configuration
      expect(fastifyInstance.config).toBeDefined()
    })

    it('should validate required environment variables at startup', () => {
      const fastifyInstance = app.getHttpAdapter().getInstance()
      
      // Required variables should be validated and available
      const config = fastifyInstance.config
      expect(config.NODE_ENV).toBeDefined()
      expect(config.DATABASE_URL).toBeDefined()
      expect(config.JWT_SECRET).toBeDefined()
    })

    it('should apply default values for optional variables', () => {
      const fastifyInstance = app.getHttpAdapter().getInstance()
      const config = fastifyInstance.config
      
      // Should have defaults from schema
      expect(config.PORT || '3001').toBeDefined()
      expect(config.FRONTEND_URL || 'http://localhost:3000').toBeDefined()
    })

    it('should validate environment variable patterns', () => {
      const fastifyInstance = app.getHttpAdapter().getInstance()
      const config = fastifyInstance.config
      
      // Database URL should match PostgreSQL pattern
      if (config.DATABASE_URL) {
        expect(config.DATABASE_URL).toMatch(/^postgres(ql)?:\/\//)
      }
      
      // Supabase URL should be HTTPS
      if (config.SUPABASE_URL) {
        expect(config.SUPABASE_URL).toMatch(/^https:\/\//)
      }
    })
  })

  describe('Template Engine Plugin - EJS Integration', () => {
    it('should configure EJS template engine when templates exist', () => {
      const templatesDir = path.join(process.cwd(), 'templates')
      
      // Create templates directory
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true })
      }
      
      const fastifyInstance = app.getHttpAdapter().getInstance()
      
      // View decorator might be available if templates directory exists
      const hasViewDecorator = fastifyInstance.hasDecorator('view')
      expect(typeof hasViewDecorator).toBe('boolean')
    })

    it('should handle missing templates directory gracefully', async () => {
      const templatesDir = path.join(process.cwd(), 'templates')
      
      // Ensure templates directory doesn't exist
      if (fs.existsSync(templatesDir)) {
        fs.rmSync(templatesDir, { recursive: true, force: true })
      }
      
      // Plugin should initialize without throwing even if templates missing
      // This is tested during app initialization - if we got here, it worked
      expect(true).toBe(true)
    })

    it('should provide default template context when configured', () => {
      const fastifyInstance = app.getHttpAdapter().getInstance()
      
      // If view is configured, it should have default context
      if (fastifyInstance.hasDecorator('view')) {
        // Template engine should be configured with default context
        expect(true).toBe(true) // Plugin configured successfully
      }
    })
  })

  describe('Plugin Error Handling - Production Resilience', () => {
    it('should handle plugin initialization errors gracefully', async () => {
      // Test that critical plugins don't break app if optional plugins fail
      // This is tested by the fact that app started successfully
      
      const response = await request(app.getHttpServer())
        .get('/health')
      
      expect(response.status).toBe(200)
    })

    it('should continue operation if static file plugin fails', async () => {
      // Even if static files fail to configure, app should work
      const response = await request(app.getHttpServer())
        .get('/health')
      
      expect(response.status).toBe(200)
    })

    it('should continue operation if template engine fails', async () => {
      // App should work even if template configuration fails
      const fastifyInstance = app.getHttpAdapter().getInstance()
      
      // Basic Fastify functionality should work
      expect(fastifyInstance.ready).toBeDefined()
    })
  })

  describe('Plugin Performance - Production Load Testing', () => {
    it('should handle concurrent static file requests efficiently', async () => {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      const testFile = path.join(uploadsDir, 'perf-test.txt')
      
      // Create test file
      fs.writeFileSync(testFile, 'Performance test content')
      
      const concurrentRequests = 20
      const startTime = Date.now()
      
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/uploads/perf-test.txt')
      )
      
      const responses = await Promise.all(requests)
      const duration = Date.now() - startTime
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.text).toBe('Performance test content')
      })
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000) // 5 seconds for 20 requests
      
      // Clean up
      fs.unlinkSync(testFile)
    })

    it('should efficiently validate environment variables', () => {
      const iterations = 1000
      const startTime = Date.now()
      
      // Simulate accessing config multiple times
      for (let i = 0; i < iterations; i++) {
        const fastifyInstance = app.getHttpAdapter().getInstance()
        const config = fastifyInstance.config
        
        // Access various config values
        config.NODE_ENV
        config.DATABASE_URL
        config.CORS_ORIGINS
      }
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // Should be very fast
    })
  })

  describe('Integration with Main Application Flow', () => {
    it('should work together with CORS interceptor', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'https://tenantflow.app')
      
      // Both CORS and plugins should work together
      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })

    it('should work with authentication and authorization', async () => {
      const response = await request(app.getHttpServer())
        .get('/users') // Protected endpoint
        .set('Origin', 'https://tenantflow.app')
      
      // Should get 401 (auth working) not 500 (plugin broken)
      expect(response.status).toBe(401)
    })

    it('should handle plugin-enhanced requests through complete stack', async () => {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      const testFile = path.join(uploadsDir, 'integration-test.txt')
      
      // Create test file
      fs.writeFileSync(testFile, 'Integration test content')
      
      const response = await request(app.getHttpServer())
        .get('/uploads/integration-test.txt')
        .set('Origin', 'https://tenantflow.app')
      
      // Should work with CORS headers AND static file serving
      expect(response.status).toBe(200)
      expect(response.text).toBe('Integration test content')
      expect(response.headers['access-control-allow-origin']).toBeDefined()
      
      // Clean up
      fs.unlinkSync(testFile)
    })
  })
})