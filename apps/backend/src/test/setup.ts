import { vi } from 'vitest'
import type { User, UserRole } from '@tenantflow/shared'

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

// Mock Prisma Client
export const mockPrismaClient = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  property: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
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
    single: vi.fn()
  })),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn()
  }
}

// Mock NestJS Logger
export const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  verbose: vi.fn()
}

// Mock ConfigService
export const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      'DATABASE_URL': 'postgresql://test:test@localhost:5432/test',
      'SUPABASE_URL': 'https://test.supabase.co',
      'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key'
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

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'

// Global test setup
beforeEach(() => {
  vi.clearAllMocks()
})