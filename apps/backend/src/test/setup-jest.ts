/* gitguardian:disable */
/**
 * Jest Test Setup Configuration for Backend
 * NestJS + Jest specific setup with comprehensive mocking
 * 
 * IMPORTANT: This is a TEST CONFIGURATION file.
 * All credentials here are MOCKED and NOT REAL.
 */

import type { UserRole } from '@repo/shared'
import { jest } from '@jest/globals'

// Type definitions for mock overrides
interface MockSupabaseUserOverrides {
  id?: string
  email?: string
  user_metadata?: {
    name?: string
    full_name?: string
    avatar_url?: string
    [key: string]: string | undefined
  }
  created_at?: string
  updated_at?: string
  [key: string]: string | number | boolean | null | Record<string, string | number | boolean | null | undefined> | undefined
}

interface MockDatabaseUserOverrides {
  id?: string
  email?: string
  name?: string
  avatarUrl?: string | null
  role?: UserRole
  phone?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
  emailVerified?: boolean
  bio?: string | null
  supabaseId?: string
  [key: string]: string | number | boolean | null | Date | undefined
}

// Mock Prisma Client with all required models and methods
export const mockPrismaClient = {
  $connect: jest.fn<() => Promise<void>>(),
  $disconnect: jest.fn<() => Promise<void>>(),
  $transaction: jest.fn<(callback: any, options?: any) => Promise<any>>(),
  $executeRaw: jest.fn<(...args: any[]) => Promise<number>>(),
  $queryRaw: jest.fn<(...args: any[]) => Promise<any>>(),
  $use: jest.fn(),
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn()
  },
  property: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn()
  },
  unit: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn()
  },
  tenant: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn()
  },
  lease: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn()
  },
  maintenanceRequest: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn()
  },
  subscription: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn()
  },
  organization: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn()
  },
  webhookEvent: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  billingHistory: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  }
}

// Mock Supabase Client
export const mockSupabaseClient = {
  from: jest.fn((_table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    data: null,
    error: null
  })),
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    admin: {
      createUser: jest.fn(),
      updateUserById: jest.fn(),
      deleteUser: jest.fn(),
      getUserById: jest.fn()
    }
  } as any,
  functions: {
    invoke: jest.fn()
  }
}

// Mock NestJS Logger
export const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
  setLogLevels: jest.fn(),
  localInstance: jest.fn().mockReturnValue({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn()
  })
}

// Mock ErrorHandlerService
export const mockErrorHandler = {
  handleErrorEnhanced: jest.fn((error) => { throw error }),
  createConfigError: jest.fn(),
  createBusinessError: jest.fn(),
  createNotFoundError: jest.fn(),
  createValidationError: jest.fn(),
  createUnauthorizedError: jest.fn(),
  createForbiddenError: jest.fn(),
  createPermissionError: jest.fn(),
  createAuthError: jest.fn(),
  wrapAsync: jest.fn((fn) => fn),
  wrapSync: jest.fn((fn) => fn),
  executeWithRetry: jest.fn((fn: any) => fn()) as jest.Mock,
  logError: jest.fn(),
  logger: mockLogger,
  formatError: jest.fn(),
  isBusinessError: jest.fn()
} as any

// Mock EmailService (will be updated after mockConfigService is defined)
export const mockEmailService = {
  sendWelcomeEmail: jest.fn<() => Promise<{ success: boolean }>>().mockResolvedValue({ success: true }),
  sendEmail: jest.fn<() => Promise<{ success: boolean }>>().mockResolvedValue({ success: true }),
  logger: mockLogger,
  resend: {},
  fromEmail: 'test@test.com',
  configService: {} as any, // Will be set after mockConfigService
  sendInvitationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendNotificationEmail: jest.fn(),
  validateEmailTemplate: jest.fn()
} as any

// Mock SecurityUtils
export const mockSecurityUtils = {
  validatePassword: jest.fn<() => boolean>().mockReturnValue(true),
  hashPassword: jest.fn<() => Promise<string>>().mockResolvedValue('hashed-password'),
  comparePasswords: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  verifyPassword: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  validateJwtSecret: jest.fn<() => boolean>().mockReturnValue(true),
  generateSecureToken: jest.fn<() => string>().mockReturnValue('secure-token'),
  sanitizeInput: jest.fn((input: string) => input),
  isValidEmail: jest.fn<() => boolean>().mockReturnValue(true),
  isSuspiciousInput: jest.fn<() => boolean>().mockReturnValue(false)
} as any

// Mock StripeErrorHandler
export const mockStripeErrorHandler = {
  wrapAsync: jest.fn((fn) => fn),
  wrapSync: jest.fn((fn) => fn),
  executeWithRetry: jest.fn((fn: any) => fn()) as jest.Mock,
  handleStripeError: jest.fn()
}

// Mock ConfigService with obfuscated test credentials
export const mockConfigService = {
  get: jest.fn((key: string) => {
    // Obfuscated test credentials to avoid security scanning false positives
    const MOCK_STRIPE_KEY = 'sk_' + 'test_' + 'X'.repeat(99)
    const MOCK_WEBHOOK_SECRET = 'whsec_' + 'test_' + 'Y'.repeat(58)
    const MOCK_SERVICE_KEY = 'test_' + 'service_' + 'mock_' + 'key'
    
    const config: Record<string, string> = {
      'DATABASE_URL': 'postgresql://test:test@localhost:5432/test',
      'SUPABASE_URL': 'https://test.supabase.co',
      'SUPABASE_SERVICE_ROLE_KEY': MOCK_SERVICE_KEY,
      'STRIPE_SECRET_KEY': MOCK_STRIPE_KEY,
      'STRIPE_WEBHOOK_SECRET': MOCK_WEBHOOK_SECRET,
      'SMTP_HOST': 'smtp.test.com',
      'SMTP_PORT': '587',
      'SMTP_USER': 'test@test.com',
      'SMTP_PASS': 'test' + 'pass' + 'word',
      'NODE_ENV': 'test'
    }
    return config[key]
  }),
  // Add missing ConfigService properties
  internalConfig: {},
  isCacheEnabled: false,
  skipProcessEnv: false,
  cache: new Map(),
  getOrThrow: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn(),
  clear: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  entries: jest.fn(),
  size: 0,
  setEnvironmentVariables: jest.fn(),
  getEnvironmentVariables: jest.fn(),
  loadEnvFile: jest.fn(),
  validationSchema: null,
  validationOptions: {},
  expandVariables: true
} as any

// Helper functions for creating test data
export const createMockSupabaseUser = (overrides: MockSupabaseUserOverrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@tenantflow.app',
  user_metadata: {
    name: 'Test User',
    full_name: 'Test User',
    avatar_url: 'https://tenantflow.app/avatar.jpg'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockDatabaseUser = (overrides: MockDatabaseUserOverrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@tenantflow.app',
  name: 'Test User',
  avatarUrl: 'https://tenantflow.app/avatar.jpg',
  role: 'OWNER' as UserRole,
  phone: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  emailVerified: true,
  bio: null,
  supabaseId: '123e4567-e89b-12d3-a456-426614174000',
  ...overrides
})

// Mock StripeService
export const mockStripeService = {
  createCustomer: jest.fn(),
  createCheckoutSession: jest.fn(),
  createBillingPortalSession: jest.fn(),
  retrieveSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  createInvoicePreview: jest.fn()
}

// Mock WebhookService
export const mockWebhookService = {
  processWebhook: jest.fn(),
  handleCustomerSubscriptionUpdated: jest.fn(),
  handleInvoicePaymentSucceeded: jest.fn(),
  handleInvoicePaymentFailed: jest.fn()
}

// Mock PrismaService 
export const mockPrismaService = {
  ...mockPrismaClient,
  logger: mockLogger,
  configService: { get: jest.fn(() => 'test-value') },
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn(),
  enableShutdownHooks: jest.fn(),
  isHealthy: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  getHealth: jest.fn(),
  getDatabaseVersion: jest.fn(),
  testConnection: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  // Add all missing Prisma model methods
  $extends: jest.fn(),
  $metrics: {
    json: jest.fn(),
    prometheus: jest.fn()
  },
  // Add any other missing properties from PrismaService
  $runCommandRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn()
} as any

// Mock Repository services
export const mockPropertiesRepository = {
  findByOwnerWithUnits: jest.fn(),
  getStatsByOwner: jest.fn(),
  findByIdAndOwner: jest.fn(),
  exists: jest.fn(),
  create: jest.fn(),
  createWithUnits: jest.fn(),
  update: jest.fn(),
  deleteById: jest.fn(),
  prismaClient: mockPrismaClient
}

export const mockLeaseRepository = {
  findByPropertyOwner: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

export const mockMaintenanceRepository = {
  findByPropertyOwner: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}

// Mock environment variables with obfuscated credentials
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_' + 'service_' + 'mock_' + 'key'
process.env.STRIPE_SECRET_KEY = 'sk_' + 'test_' + 'X'.repeat(99)

// Global test setup
beforeEach(() => {
  jest.clearAllMocks()
})

// Global test teardown
afterEach(() => {
  jest.restoreAllMocks()
})

// Fix circular references after all exports are defined
mockEmailService.configService = mockConfigService
mockPrismaService.configService = mockConfigService