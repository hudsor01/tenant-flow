import { mockPrismaClient } from './setup'
import { vi, type MockedFunction } from 'vitest'

/**
 * Test utilities for BaseCrudService validation
 * Provides common test patterns and expectations for CRUD operations
 */

// Test data generators
export const createMockEntity = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'test-id-123',
  name: 'Test Entity',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ownerId: 'owner-123',
  ...overrides
})

export const createMockOwner = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'owner-123',
  email: 'owner@test.com',
  name: 'Test Owner',
  role: 'OWNER',
  organizationId: 'org-123',
  ...overrides
})

// Standard test scenarios for CRUD operations
export const crudTestScenarios = {
  // Create operation test scenarios
  create: {
    success: {
      name: 'should create entity successfully',
      input: { name: 'New Entity', ownerId: 'owner-123' },
      mockResult: createMockEntity({ name: 'New Entity' }),
      expectation: 'creates entity with correct data'
    },
    validationError: {
      name: 'should throw validation error for invalid input',
      input: { name: '', ownerId: 'owner-123' },
      error: new Error('Validation failed'),
      expectation: 'throws validation error'
    },
    ownershipRequired: {
      name: 'should require ownerId for creation',
      input: { name: 'New Entity' },
      error: new Error('Owner ID is required'),
      expectation: 'throws error when ownerId missing'
    },
    conflictError: {
      name: 'should handle unique constraint violations',
      input: { name: 'Duplicate Entity', ownerId: 'owner-123' },
      error: { code: 'P2002', meta: { target: ['name', 'ownerId'] } },
      expectation: 'throws conflict error for duplicates'
    }
  },

  // Read operation test scenarios
  findById: {
    success: {
      name: 'should find entity by ID and owner',
      input: { id: 'test-id-123', ownerId: 'owner-123' },
      mockResult: createMockEntity(),
      expectation: 'returns entity when found'
    },
    notFound: {
      name: 'should throw not found error when entity does not exist',
      input: { id: 'nonexistent-123', ownerId: 'owner-123' },
      mockResult: null,
      expectation: 'throws NotFoundException'
    },
    ownershipViolation: {
      name: 'should not return entity for different owner',
      input: { id: 'test-id-123', ownerId: 'other-owner-123' },
      mockResult: null,
      expectation: 'returns null for ownership violation'
    }
  },

  findMany: {
    success: {
      name: 'should return list of entities for owner',
      input: { ownerId: 'owner-123' },
      mockResult: [createMockEntity(), createMockEntity({ id: 'test-id-456' })],
      expectation: 'returns array of entities'
    },
    empty: {
      name: 'should return empty array when no entities found',
      input: { ownerId: 'owner-123' },
      mockResult: [],
      expectation: 'returns empty array'
    },
    pagination: {
      name: 'should handle pagination correctly',
      input: { ownerId: 'owner-123', limit: 10, offset: 20 },
      mockResult: [createMockEntity()],
      expectation: 'applies limit and offset correctly'
    }
  },

  // Update operation test scenarios
  update: {
    success: {
      name: 'should update entity successfully',
      input: { id: 'test-id-123', ownerId: 'owner-123', data: { name: 'Updated Entity' } },
      mockExistsResult: true,
      mockResult: createMockEntity({ name: 'Updated Entity' }),
      expectation: 'updates entity with new data'
    },
    notFound: {
      name: 'should throw not found error when entity does not exist',
      input: { id: 'nonexistent-123', ownerId: 'owner-123', data: { name: 'Updated' } },
      mockExistsResult: false,
      expectation: 'throws NotFoundException'
    },
    ownershipValidation: {
      name: 'should validate ownership before update',
      input: { id: 'test-id-123', ownerId: 'other-owner-123', data: { name: 'Updated' } },
      mockExistsResult: false,
      expectation: 'validates ownership via exists check'
    },
    partialUpdate: {
      name: 'should handle partial updates correctly',
      input: { id: 'test-id-123', ownerId: 'owner-123', data: { name: 'Partial Update' } },
      mockExistsResult: true,
      mockResult: createMockEntity({ name: 'Partial Update' }),
      expectation: 'applies only provided fields'
    }
  },

  // Delete operation test scenarios
  delete: {
    success: {
      name: 'should delete entity successfully',
      input: { id: 'test-id-123', ownerId: 'owner-123' },
      mockExistsResult: true,
      mockResult: createMockEntity(),
      expectation: 'deletes entity and returns it'
    },
    notFound: {
      name: 'should throw not found error when entity does not exist',
      input: { id: 'nonexistent-123', ownerId: 'owner-123' },
      mockExistsResult: false,
      expectation: 'throws NotFoundException'
    },
    ownershipValidation: {
      name: 'should validate ownership before deletion',
      input: { id: 'test-id-123', ownerId: 'other-owner-123' },
      mockExistsResult: false,
      expectation: 'validates ownership via exists check'
    },
    cascadeHandling: {
      name: 'should handle cascade constraints appropriately',
      input: { id: 'test-id-123', ownerId: 'owner-123' },
      mockExistsResult: true,
      error: { code: 'P2003', meta: { field_name: 'dependent_records' } },
      expectation: 'handles foreign key constraints gracefully'
    }
  }
}

// Common expectations for CRUD services
export const crudExpectations = {
  // Error handling expectations
  errorHandling: {
    shouldUseErrorHandler: (mockErrorHandler: { handleErrorEnhanced: MockedFunction<(...args: unknown[]) => unknown> }, operation: string, resource: string) => {
      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation,
          resource,
          metadata: expect.any(Object)
        })
      )
    },
    
    shouldLogErrors: (mockLogger: { error: MockedFunction<(...args: unknown[]) => unknown> }, operation: string) => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(operation),
        expect.any(Error)
      )
    }
  },

  // Validation expectations
  validation: {
    shouldValidateRequiredFields: (requiredFields: string[]) => {
      return requiredFields.map(field => ({
        name: `should validate ${field} is required`,
        test: (service: Record<string, (...args: unknown[]) => unknown>, method: string) => {
          expect(() => service[method]({})).toThrow(`${field} is required`)
        }
      }))
    },

    shouldValidateOwnership: (mockRepository: { exists: MockedFunction<(...args: unknown[]) => unknown> }, entityId: string, ownerId: string) => {
      expect(mockRepository.exists).toHaveBeenCalledWith({
        id: entityId,
        ownerId
      })
    }
  },

  // Repository interaction expectations
  repository: {
    shouldCallRepositoryMethod: (mockRepository: Record<string, MockedFunction<(...args: unknown[]) => unknown>>, method: string, expectedArgs: unknown) => {
      expect(mockRepository[method]).toHaveBeenCalledWith(expectedArgs)
    },

    shouldFilterByOwner: (mockRepository: { findMany: MockedFunction<(...args: unknown[]) => unknown> }, ownerId: string) => {
      expect(mockRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId })
        })
      )
    }
  },

  // Performance expectations
  performance: {
    shouldMeasureOperationTime: (mockLogger: { log: MockedFunction<(...args: unknown[]) => unknown> }, operation: string) => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`${operation}.*in \\d+ms`))
      )
    }
  }
}

// Mock setup helpers
export const setupCrudServiceMocks = () => {
  const mockRepository = {
    findMany: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    count: vi.fn(),
    findManyByOwner: vi.fn(),
    findManyByOwnerPaginated: vi.fn(),
    prismaClient: mockPrismaClient
  }

  const resetMocks = () => {
    vi.clearAllMocks()
    Object.values(mockRepository).forEach(mock => {
      if (vi.isMockFunction(mock)) {
        mock.mockReset()
      }
    })
  }

  return { mockRepository, resetMocks }
}

// Test data factory functions
export const testDataFactory = {
  property: (overrides: Record<string, unknown> = {}) => ({
    id: 'prop-123',
    name: 'Test Property',
    address: '123 Test St',
    city: 'Test City',
    state: 'TX',
    zipCode: '12345',
    propertyType: 'SINGLE_FAMILY',
    ownerId: 'owner-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }),

  lease: (overrides: Record<string, unknown> = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    unitId: '661e8511-f30c-41d4-a716-557788990000',
    tenantId: '772f9622-g41d-52e5-b827-668899101111',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    monthlyRent: 1500,
    status: 'ACTIVE',
    ownerId: '883f0733-h52e-63f6-c938-779900212222',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }),

  tenant: (overrides: Record<string, unknown> = {}) => ({
    id: 'tenant-123',
    email: 'tenant@test.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-0123',
    ownerId: 'owner-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  }),

  maintenanceRequest: (overrides: Record<string, unknown> = {}) => ({
    id: 'maintenance-123',
    title: 'Test Maintenance Request',
    description: 'Test description',
    priority: 'MEDIUM',
    status: 'OPEN',
    unitId: 'unit-123',
    tenantId: 'tenant-123',
    ownerId: 'owner-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  })
}

// Edge case test scenarios
export const edgeCaseScenarios = {
  invalidIds: [
    { name: 'empty string', value: '' },
    { name: 'null', value: null },
    { name: 'undefined', value: undefined },
    { name: 'non-UUID format', value: 'invalid-id' },
    { name: 'SQL injection attempt', value: "'; DROP TABLE users; --" }
  ],

  invalidPagination: [
    { name: 'negative limit', limit: -1, expectError: true },
    { name: 'negative offset', offset: -1, expectError: true },
    { name: 'excessive limit', limit: 10000, expectError: true },
    { name: 'string limit', limit: 'abc', expectError: true },
    { name: 'string offset', offset: 'xyz', expectError: true }
  ],

  concurrencyScenarios: [
    {
      name: 'concurrent reads',
      operation: 'findMany',
      concurrent: 10,
      expectSuccess: true
    },
    {
      name: 'concurrent creates',
      operation: 'create',
      concurrent: 5,
      expectPartialFailure: true // Some may fail due to uniqueness
    },
    {
      name: 'concurrent updates',
      operation: 'update',
      concurrent: 3,
      expectOptimisticLocking: true
    }
  ]
}

// Performance test thresholds
export const performanceThresholds = {
  create: 100, // ms
  findById: 50,
  findMany: 200,
  update: 100,
  delete: 75,
  complexQuery: 500
}

// Test utilities for async operations
export const asyncTestUtils = {
  waitForOperation: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  measureExecutionTime: async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = Date.now()
    const result = await operation()
    const duration = Date.now() - start
    return { result, duration }
  },

  runConcurrently: async <T>(operations: (() => Promise<T>)[]): Promise<T[]> => {
    return Promise.all(operations.map(op => op()))
  }
}

// Assertion helpers
export const assertionHelpers = {
  hasValidTimestamps: (entity: Record<string, unknown>) => {
    expect(entity).toHaveProperty('createdAt')
    expect(entity).toHaveProperty('updatedAt')
    expect(entity.createdAt).toBeInstanceOf(Date)
    expect(entity.updatedAt).toBeInstanceOf(Date)
  },

  hasOwnershipFields: (entity: Record<string, unknown>, ownerId: string) => {
    expect(entity).toHaveProperty('ownerId', ownerId)
  },

  isValidUUID: (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(id).toMatch(uuidRegex)
  },

  hasValidPaginationResponse: (response: Record<string, unknown>) => {
    expect(response).toHaveProperty('items')
    expect(response).toHaveProperty('total')
    expect(response).toHaveProperty('page')
    expect(response).toHaveProperty('pageSize')
    expect(response).toHaveProperty('totalPages')
    expect(Array.isArray(response.items)).toBe(true)
    expect(typeof response.total).toBe('number')
    expect(typeof response.page).toBe('number')
    expect(typeof response.pageSize).toBe('number')
    expect(typeof response.totalPages).toBe('number')
  }
}