import { Test } from '@nestjs/testing'
import { PrismaService } from '../src/prisma/prisma.service'
import { ConfigModule } from '@nestjs/config'
import type { PrismaClient } from '@repo/database'
import { vi, type MockedFunction } from 'vitest'
import type { ModuleMetadata } from '@nestjs/common'

// Mock Prisma Client
export interface Context {
  prisma: PrismaService
}

export interface MockContext {
  prisma: MockedPrismaClient
}

// Define mocked Prisma client type
export type MockedPrismaClient = {
  [K in keyof PrismaClient]: PrismaClient[K] extends (...args: unknown[]) => unknown
    ? MockedFunction<PrismaClient[K]>
    : PrismaClient[K] extends Record<string, unknown>
    ? {
        [M in keyof PrismaClient[K]]: MockedFunction<PrismaClient[K][M]>
      }
    : PrismaClient[K]
}

// Create a mock Prisma client with all methods auto-mocked
const createPrismaMock = (): MockedPrismaClient => {
  const mockClient = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    property: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    unit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    lease: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    maintenanceRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  } as unknown as MockedPrismaClient
  
  return mockClient
}

export const createMockContext = (): MockContext => {
  return {
    prisma: createPrismaMock(),
  }
}

let mockContext: MockContext

beforeEach(() => {
  mockContext = createMockContext()
  // Reset all mocks
  vi.clearAllMocks()
})

// Test module metadata interface
interface TestModuleMetadata {
  imports?: NonNullable<ModuleMetadata['imports']>;
  controllers?: NonNullable<ModuleMetadata['controllers']>;
  providers?: NonNullable<ModuleMetadata['providers']>;
}

// Global test utilities
export const createTestingModule = async (metadata: TestModuleMetadata) => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      ...(metadata.imports || []),
    ],
    controllers: metadata.controllers || [],
    providers: [
      {
        provide: PrismaService,
        useValue: mockContext.prisma,
      },
      ...(metadata.providers || []),
    ],
  }).compile()

  return module
}

// Test data builders
export const testDataBuilders = {
  user: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'OWNER',
    organizationId: 'test-org-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  property: (overrides = {}) => ({
    id: 'test-property-id',
    name: 'Test Property',
    address: '123 Test St',
    city: 'Test City',
    state: 'TX',
    zipCode: '12345',
    ownerId: 'test-user-id',
    propertyType: 'SINGLE_FAMILY',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  unit: (overrides = {}) => ({
    id: 'test-unit-id',
    unitNumber: '101',
    propertyId: 'test-property-id',
    bedrooms: 2,
    bathrooms: 1,
    rent: 1500,
    status: 'VACANT',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  tenant: (overrides = {}) => ({
    id: 'test-tenant-id',
    email: 'tenant@example.com',
    firstName: 'Test',
    lastName: 'Tenant',
    phone: '555-1234',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  lease: (overrides = {}) => ({
    id: 'test-lease-id',
    unitId: 'test-unit-id',
    tenantId: 'test-tenant-id',
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    rentAmount: 1500,
    securityDeposit: 1500,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
}

// Common test assertions
export const expectError = (fn: () => unknown, errorType: new (...args: unknown[]) => Error, message?: string) => {
  expect(fn).toThrow(errorType)
  if (message) {
    expect(fn).toThrow(message)
  }
}

// Database transaction mock helper
export const mockTransaction = (prisma: MockedPrismaClient) => {
  const transactionMock = {
    property: prisma.property,
    unit: prisma.unit,
    tenant: prisma.tenant,
    lease: prisma.lease,
    user: prisma.user,
    maintenanceRequest: prisma.maintenanceRequest,
    subscription: prisma.subscription,
  }
  
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof transactionMock) => Promise<unknown>) => {
    return fn(transactionMock)
  })
  
  return transactionMock
}

// JWT mock helper
export const mockJwtUser = (overrides = {}) => ({
  sub: 'test-user-id',
  email: 'test@example.com',
  role: 'OWNER',
  organizationId: 'test-org-id',
  iat: Date.now(),
  exp: Date.now() + 3600,
  ...overrides,
})

// Request mock helper
export const mockRequest = (overrides = {}) => ({
  user: mockJwtUser(),
  headers: {
    authorization: 'Bearer test-token',
  },
  ...overrides,
})

// Export mock context for use in tests
export { mockContext }