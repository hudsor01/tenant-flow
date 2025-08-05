import { Test } from '@nestjs/testing'
import { PrismaService } from '../src/prisma/prisma.service'
import { ConfigModule } from '@nestjs/config'
import type { PrismaClient } from '@repo/database'

// Mock Prisma Client
export interface Context {
  prisma: PrismaService
}

export interface MockContext {
  prisma: jest.Mocked<PrismaClient>
}

// Create a mock Prisma client with all methods auto-mocked
const createPrismaMock = (): jest.Mocked<PrismaClient> => {
  const mockClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    property: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    unit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    tenant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    lease: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    maintenanceRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    subscription: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as jest.Mocked<PrismaClient>
  
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
  jest.clearAllMocks()
})

// Test module metadata interface
interface TestModuleMetadata {
  imports?: unknown[];
  controllers?: unknown[];
  providers?: unknown[];
}

// Global test utilities
export const createTestingModule = async (metadata: TestModuleMetadata) => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      ...metadata.imports || [],
    ],
    controllers: metadata.controllers || [],
    providers: [
      {
        provide: PrismaService,
        useValue: mockContext.prisma,
      },
      ...metadata.providers || [],
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
export const mockTransaction = (prisma: jest.Mocked<PrismaClient>) => {
  const transactionMock = {
    property: prisma.property,
    unit: prisma.unit,
    tenant: prisma.tenant,
    lease: prisma.lease,
    user: prisma.user,
    maintenanceRequest: prisma.maintenanceRequest,
    subscription: prisma.subscription,
  }
  
  prisma.$transaction.mockImplementation(async (fn) => {
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