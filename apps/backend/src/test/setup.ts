import { vi, beforeEach } from 'vitest'

import type { UserRole } from '@repo/shared'


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
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
  $use: vi.fn(),
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  property: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    aggregate: vi.fn()
  },
  unit: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn()
  },
  tenant: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  lease: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  maintenanceRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  subscription: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  organization: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  webhookEvent: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  },
  billingHistory: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  }
}

// Mock Supabase Client
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    data: null,
    error: null
  })),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    admin: {
      createUser: vi.fn(),
      updateUserById: vi.fn(),
      deleteUser: vi.fn(),
      getUserById: vi.fn()
    }
  },
  functions: {
    invoke: vi.fn()
  }
}

// Mock NestJS Logger
export const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  verbose: vi.fn(),
  setContext: vi.fn()
}

// Mock ErrorHandlerService
export const mockErrorHandler = {
  handleErrorEnhanced: vi.fn((error) => { throw error }),
  createConfigError: vi.fn(),
  createBusinessError: vi.fn(),
  createNotFoundError: vi.fn(),
  createValidationError: vi.fn(),
  createUnauthorizedError: vi.fn(),
  createForbiddenError: vi.fn(),
  wrapAsync: vi.fn((fn) => fn),
  wrapSync: vi.fn((fn) => fn),
  executeWithRetry: vi.fn((fn) => fn())
}

// Mock EmailService
export const mockEmailService = {
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEmail: vi.fn().mockResolvedValue({ success: true })
}

// Mock SecurityUtils
export const mockSecurityUtils = {
  validatePassword: vi.fn().mockReturnValue(true),
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  comparePasswords: vi.fn().mockResolvedValue(true)
}

// Mock StripeErrorHandler
export const mockStripeErrorHandler = {
  wrapAsync: vi.fn((fn) => fn),
  wrapSync: vi.fn((fn) => fn),
  executeWithRetry: vi.fn((fn) => fn()),
  handleStripeError: vi.fn()
}

// Mock ConfigService
export const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      'DATABASE_URL': 'postgresql://test:test@localhost:5432/test',
      'SUPABASE_URL': 'https://test.supabase.co',
      'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
      'STRIPE_SECRET_KEY': 'sk_test_123',
      'STRIPE_WEBHOOK_SECRET': 'whsec_test_123',
      'SMTP_HOST': 'smtp.test.com',
      'SMTP_PORT': '587',
      'SMTP_USER': 'test@test.com',
      'SMTP_PASS': 'testpass',
      'NODE_ENV': 'test'
    }
    return config[key]
  })
}

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
  role: 'OWNER',
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
  createCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
  retrieveSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  createInvoicePreview: vi.fn()
}

// Mock WebhookService
export const mockWebhookService = {
  processWebhook: vi.fn(),
  handleCustomerSubscriptionUpdated: vi.fn(),
  handleInvoicePaymentSucceeded: vi.fn(),
  handleInvoicePaymentFailed: vi.fn()
}

// Mock PrismaService 
export const mockPrismaService = mockPrismaClient

// Mock Repository services
export const mockPropertiesRepository = {
  findByOwnerWithUnits: vi.fn(),
  getStatsByOwner: vi.fn(),
  findByIdAndOwner: vi.fn(),
  exists: vi.fn(),
  create: vi.fn(),
  createWithUnits: vi.fn(),
  update: vi.fn(),
  deleteById: vi.fn(),
  prismaClient: mockPrismaClient
}

export const mockLeaseRepository = {
  findByPropertyOwner: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}

export const mockMaintenanceRepository = {
  findByPropertyOwner: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'

// Global test setup
beforeEach(() => {
  vi.clearAllMocks()
})