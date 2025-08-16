import { Test, type TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import type { Job } from 'bull'
import type { FastifyInstance, FastifyRequest } from 'fastify'

/**
 * Shared Test Utilities - DRY Principle
 * Single responsibility functions for common test operations
 */

// Mock Logger that captures logs for testing
export class MockLogger extends Logger {
  public logs: { level: string; message: string; context?: string | Record<string, unknown> }[] = []
  
  override log(message: string, context?: string | Record<string, unknown>) {
    this.logs.push({ level: 'log', message, context })
  }
  
  override error(message: string, context?: string | Record<string, unknown>) {
    this.logs.push({ level: 'error', message, context })
  }
  
  override warn(message: string, context?: string | Record<string, unknown>) {
    this.logs.push({ level: 'warn', message, context })
  }
  
  override debug(message: string, context?: string | Record<string, unknown>) {
    this.logs.push({ level: 'debug', message, context })
  }
  
  clearLogs() {
    this.logs = []
  }
  
  getLogsByLevel(level: string) {
    return this.logs.filter(log => log.level === level)
  }
}

// Mock ConfigService with Railway environment support
export class MockConfigService extends ConfigService {
  private mockConfig: Record<string, unknown> = {}
  
  constructor(config: Record<string, unknown> = {}) {
    super()
    this.mockConfig = config
  }
  
  override get<T = unknown>(key: string, defaultValue?: T): T {
    return this.mockConfig[key] ?? defaultValue
  }
  
  setConfig(key: string, value: unknown) {
    this.mockConfig[key] = value
  }
  
  clearConfig() {
    this.mockConfig = {}
  }
  
  setRailwayConfig(environment: 'production' | 'staging' | 'development' = 'production') {
    this.mockConfig.RAILWAY_ENVIRONMENT = environment
    this.mockConfig.RAILWAY_SERVICE_NAME = 'tenantflow-backend'
    this.mockConfig.RAILWAY_PROJECT_ID = 'test-project-123'
    this.mockConfig.RAILWAY_PUBLIC_DOMAIN = 'tenantflow-backend-production.up.railway.app'
    this.mockConfig.RAILWAY_STATIC_URL = 'https://tenantflow-backend-production.up.railway.app'
  }
  
  setProductionConfig() {
    this.mockConfig.NODE_ENV = 'production'
    this.mockConfig.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
    this.mockConfig.JWT_SECRET = 'valid-jwt-secret-minimum-32-characters-for-security'
    this.mockConfig.SUPABASE_URL = 'https://valid.supabase.co'
    this.mockConfig.SUPABASE_ANON_KEY = 'valid-anon-key-for-supabase-integration'
    this.mockConfig.SUPABASE_SERVICE_ROLE_KEY = 'valid-service-role-key-for-supabase-admin'
    this.mockConfig.SUPABASE_JWT_SECRET = 'valid-supabase-jwt-secret-32-chars-minimum'
    this.mockConfig.CORS_ORIGINS = 'https://tenantflow.app,https://app.tenantflow.app'
  }
}

// Mock Bull Job Factory
export function createMockJob<T>(data: T, options: Partial<Job<T>> = {}): Job<T> {
  const mockJob = {
    id: '123',
    data,
    attemptsMade: 0,
    progress: jest.fn().mockResolvedValue(undefined),
    ...options
  } as unknown as Job<T>
  
  return mockJob
}

// Mock Fastify Instance for CORS testing
export function createMockFastifyInstance(): Partial<FastifyInstance> {
  const registeredPlugins: { plugin: unknown; options: unknown }[] = []
  const hooks: { type: string; handler: (...args: unknown[]) => unknown }[] = []
  const decorators: { type: string; name: string; value: unknown }[] = []
  
  return {
    register: jest.fn().mockImplementation((plugin, options) => {
      registeredPlugins.push({ plugin, options })
      return Promise.resolve()
    }),
    addHook: jest.fn().mockImplementation((type, handler) => {
      hooks.push({ type, handler })
      return Promise.resolve()
    }),
    decorateReply: jest.fn().mockImplementation((name, value) => {
      decorators.push({ type: 'reply', name, value })
    }),
    // Test helpers
    getRegisteredPlugins: () => registeredPlugins,
    getHooks: () => hooks,
    getDecorators: () => decorators
  }
}

// Mock Fastify Request for CORS testing
export function createMockFastifyRequest(options: {
  origin?: string
  method?: string
  headers?: Record<string, string>
  ip?: string
} = {}): Partial<FastifyRequest> {
  return {
    method: options.method || 'GET',
    headers: {
      origin: options.origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
      'user-agent': 'test-agent',
      ...options.headers
    },
    ip: options.ip || '127.0.0.1'
  }
}

// Mock Queue for Bull testing
export class MockQueue {
  public addedJobs: { name: string; data: unknown; options?: unknown }[] = []
  public bulkJobs: { name: string; data: unknown; opts?: unknown }[] = []
  private paused = false
  private counts = {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0
  }
  
  async add(name: string, data: unknown, options?: unknown) {
    this.addedJobs.push({ name, data, options })
    this.counts.waiting++
    return createMockJob(data, { id: `job-${this.addedJobs.length}` })
  }
  
  async addBulk(jobs: { name: string; data: unknown; opts?: unknown }[]) {
    this.bulkJobs.push(...jobs)
    return jobs.map((job, index) => createMockJob(job.data, { id: `bulk-job-${index}` }))
  }
  
  async pause() {
    this.paused = true
  }
  
  async resume() {
    this.paused = false
  }
  
  async clean(_grace: number, _type: string) {
    // Mock cleaning
  }
  
  async getWaitingCount() { return this.counts.waiting }
  async getActiveCount() { return this.counts.active }
  async getCompletedCount() { return this.counts.completed }
  async getFailedCount() { return this.counts.failed }
  async getDelayedCount() { return this.counts.delayed }
  
  // Test helpers
  getAddedJobs() { return this.addedJobs }
  getBulkJobs() { return this.bulkJobs }
  isPaused() { return this.paused }
  setCounts(counts: Partial<typeof this.counts>) {
    Object.assign(this.counts, counts)
  }
}

// Performance timing utilities
export class TestTimer {
  private startTime = 0
  
  start() {
    this.startTime = performance.now()
  }
  
  end(): number {
    return performance.now() - this.startTime
  }
  
  expectWithinRange(minMs: number, maxMs: number) {
    const elapsed = this.end()
    expect(elapsed).toBeGreaterThanOrEqual(minMs)
    expect(elapsed).toBeLessThanOrEqual(maxMs)
    return elapsed
  }
}

// Validation error matchers
interface ValidationResult {
  success: boolean
  error?: {
    issues?: {
      path?: string[]
      message: string
    }[]
  }
  data?: unknown
}

export const ValidationMatchers = {
  expectValidationError: (result: ValidationResult, field?: string, message?: string) => {
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    if (field && result.error?.issues) {
      const fieldError = result.error.issues.find((e) => e.path?.includes(field))
      expect(fieldError).toBeDefined()
      if (message) {
        expect(fieldError.message).toContain(message)
      }
    }
  },
  
  expectNoValidationErrors: (result: ValidationResult) => {
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
  }
}

// Railway environment test fixtures
export const RailwayFixtures = {
  productionEnv: {
    RAILWAY_ENVIRONMENT: 'production',
    RAILWAY_SERVICE_NAME: 'tenantflow-backend',
    RAILWAY_PROJECT_ID: 'abcd1234-5678-90ef-ghij-klmnopqrstuv',
    RAILWAY_PUBLIC_DOMAIN: 'tenantflow-backend-production.up.railway.app',
    RAILWAY_STATIC_URL: 'https://tenantflow-backend-production.up.railway.app',
    RAILWAY_GIT_COMMIT_SHA: 'abc123def456',
    RAILWAY_GIT_BRANCH: 'main'
  },
  
  stagingEnv: {
    RAILWAY_ENVIRONMENT: 'staging',
    RAILWAY_SERVICE_NAME: 'tenantflow-backend-staging',
    RAILWAY_PROJECT_ID: 'staging-1234-5678-90ef-ghij',
    RAILWAY_PUBLIC_DOMAIN: 'tenantflow-backend-staging.up.railway.app'
  },
  
  invalidEnv: {
    RAILWAY_PUBLIC_DOMAIN: 'invalid-domain.com',
    RAILWAY_STATIC_URL: 'not-a-url'
  }
}

// CORS test fixtures
export const CorsFixtures = {
  allowedOrigins: [
    'https://tenantflow.app',
    'https://app.tenantflow.app',
    'https://tenantflow-frontend.vercel.app'
  ],
  
  railwayOrigins: [
    'https://tenantflow-backend-production.up.railway.app',
    'https://web-production-abc123.up.railway.app',
    'https://backend-production-def456.up.railway.app'
  ],
  
  vercelOrigins: [
    'https://tenantflow-git-main.vercel.app',
    'https://tenant-flow-abc123.vercel.app',
    'https://tenantflow-preview-123.vercel.app'
  ],
  
  blockedOrigins: [
    'https://malicious-site.com',
    'http://localhost:3000', // HTTP in production
    'https://example.com'
  ]
}

// Module builder for consistent test modules
type Provider = object | { provide: unknown; useValue: unknown }
type Module = object

export class TestModuleBuilder {
  private providers: Provider[] = []
  private imports: Module[] = []
  
  addProvider(provider: Provider) {
    this.providers.push(provider)
    return this
  }
  
  addMockProvider(token: unknown, mockValue: unknown) {
    this.providers.push({ provide: token, useValue: mockValue })
    return this
  }
  
  addImport(module: Module) {
    this.imports.push(module)
    return this
  }
  
  async build(): Promise<TestingModule> {
    return Test.createTestingModule({
      providers: this.providers,
      imports: this.imports
    }).compile()
  }
}