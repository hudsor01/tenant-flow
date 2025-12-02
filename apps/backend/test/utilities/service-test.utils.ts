/**
 * Service Test Utilities
 *
 * Helpers for testing NestJS services with data layer integration.
 * Focuses on:
 * - Mocking data layer dependencies
 * - Testing business logic in isolation
 * - Verifying correct data layer calls
 */

import { createTestBed, type TestBedResult } from '../test-bed.utils'

/**
 * Mock implementation of a data layer method
 */
export interface MockDataLayerMethod {
  mockResolvedValue: (value: any) => MockDataLayerMethod
  mockRejectedValue: (error: any) => MockDataLayerMethod
  mockImplementation: (fn: (...args: any[]) => any) => MockDataLayerMethod
  mockReturnValue: (value: any) => MockDataLayerMethod
  toHaveBeenCalledWith: (...args: any[]) => boolean
}

/**
 * Create a service testbed for unit testing
 *
 * @example
 * ```typescript
 * describe('PropertiesService', () => {
 *   let serviceTest: ServiceTestBed<PropertiesService>
 *
 *   beforeEach(async () => {
 *     serviceTest = await createServiceTestBed(PropertiesService)
 *   })
 *
 *   it('creates property with valid data', async () => {
 *     const mockDataLayer = serviceTest.getMock('PropertyDataLayer')
 *     mockDataLayer.create.mockResolvedValue({ id: 'prop-1', name: 'Test' })
 *
 *     const result = await serviceTest.service.create(requestDto)
 *
 *     expect(result.id).toBe('prop-1')
 *     expect(mockDataLayer.create).toHaveBeenCalledWith(expect.any(Object))
 *   })
 * })
 * ```
 */
export interface ServiceTestBed<T> {
  service: T
  getMock: <D>(serviceName: new (...args: any[]) => D) => jest.Mocked<D>
  get: <D>(serviceName: new (...args: any[]) => D) => D
  verify: (
    service: any,
    method: string,
    expectedCalls?: number
  ) => { called: number; args: any[] }
}

/**
 * Create service testbed with automatic mocking
 */
export async function createServiceTestBed<T>(
  serviceClass: new (...args: any[]) => T
): Promise<ServiceTestBed<T>> {
  const testBed = await createTestBed(serviceClass)

  return {
    service: testBed.unit,
    getMock: <D>(
      serviceName: new (...args: any[]) => D
    ): jest.Mocked<D> => {
      return testBed.get(serviceName)
    },
    get: <D>(serviceName: new (...args: any[]) => D): D => {
      return testBed.get(serviceName)
    },
    verify: (service: any, method: string, expectedCalls?: number) => {
      const mock = service[method]
      if (!jest.isMockFunction(mock)) {
        throw new Error(`${method} is not a mock function`)
      }
      const called = mock.mock.calls.length
      if (expectedCalls !== undefined && called !== expectedCalls) {
        throw new Error(
          `Expected ${method} to be called ${expectedCalls} times, but was called ${called} times`
        )
      }
      return {
        called,
        args: mock.mock.calls
      }
    }
  }
}

/**
 * Create a mock data layer with Supabase client stub
 *
 * @example
 * ```typescript
 * const mockDataLayer = createMockDataLayer({
 *   from: jest.fn().mockReturnThis(),
 *   insert: jest.fn().mockReturnThis(),
 *   update: jest.fn().mockReturnThis(),
 *   delete: jest.fn().mockReturnThis(),
 *   select: jest.fn().mockReturnThis(),
 *   single: jest.fn().mockResolvedValue({ data: { id: 'test' }, error: null })
 * })
 * ```
 */
export function createMockDataLayer(
  chainMethods: Partial<{
    from: jest.Mock
    insert: jest.Mock
    update: jest.Mock
    delete: jest.Mock
    select: jest.Mock
    eq: jest.Mock
    single: jest.Mock
    range: jest.Mock
    order: jest.Mock
    limit: jest.Mock
  }> = {}
) {
  const baseMock = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...chainMethods
  }

  return baseMock
}

/**
 * Verify a data layer method was called with expected arguments
 *
 * @example
 * ```typescript
 * verifyDataLayerCall(mockDataLayer, 'from', ['properties'])
 * verifyDataLayerCall(mockDataLayer, 'eq', ['id', 'prop-123'])
 * ```
 */
export function verifyDataLayerCall(
  mockDataLayer: any,
  method: string,
  expectedArgs?: any[]
): void {
  const mock = mockDataLayer[method]
  if (!mock) {
    throw new Error(`Method ${method} not found in mock data layer`)
  }
  if (!jest.isMockFunction(mock)) {
    throw new Error(`${method} is not a mock function`)
  }

  if (expectedArgs) {
    const called = mock.mock.calls.some((args: any[]) =>
      JSON.stringify(args) === JSON.stringify(expectedArgs)
    )
    if (!called) {
      throw new Error(
        `Expected ${method} to be called with ${JSON.stringify(expectedArgs)}, but was called with ${JSON.stringify(mock.mock.calls)}`
      )
    }
  } else if (!mock.called) {
    throw new Error(`Expected ${method} to be called, but it wasn't`)
  }
}

/**
 * Create a stub for testing service error handling
 *
 * @example
 * ```typescript
 * const mockDataLayer = createMockDataLayer()
 * mockDataLayer.from.mockReturnValue(
 *   createSupabaseErrorStub('Database connection failed')
 * )
 *
 * await expect(service.create(dto)).rejects.toThrow('Database connection failed')
 * ```
 */
export function createSupabaseErrorStub(errorMessage: string) {
  return {
    single: jest.fn().mockResolvedValue({
      data: null,
      error: new Error(errorMessage)
    })
  }
}

/**
 * Test service method with various data layer responses
 *
 * @example
 * ```typescript
 * const scenarios = await runServiceScenarios(service, 'create', [
 *   {
 *     name: 'successful creation',
 *     dataLayerResponse: { id: 'prop-1', name: 'Test' },
 *     expected: { success: true, data: { id: 'prop-1' } }
 *   },
 *   {
 *     name: 'database error',
 *     dataLayerResponse: null,
 *     dataLayerError: 'Connection failed',
 *     expectedError: 'Connection failed'
 *   }
 * ])
 * ```
 */
export interface ServiceScenario {
  name: string
  dataLayerResponse?: any
  dataLayerError?: string
  expected?: any
  expectedError?: string
}

export async function runServiceScenarios(
  service: any,
  methodName: string,
  scenarios: ServiceScenario[],
  methodArgs: any[] = []
): Promise<void> {
  for (const scenario of scenarios) {
    try {
      const result = await service[methodName](...methodArgs)

      if (scenario.expectedError) {
        throw new Error(
          `Scenario "${scenario.name}" expected an error but got: ${JSON.stringify(result)}`
        )
      }

      if (scenario.expected) {
        Object.entries(scenario.expected).forEach(([key, value]) => {
          if (JSON.stringify(result[key]) !== JSON.stringify(value)) {
            throw new Error(
              `Scenario "${scenario.name}" expected ${key}=${JSON.stringify(value)}, got ${JSON.stringify(result[key])}`
            )
          }
        })
      }
    } catch (error: any) {
      if (!scenario.expectedError) {
        throw error
      }

      if (!error.message.includes(scenario.expectedError)) {
        throw new Error(
          `Scenario "${scenario.name}" expected error "${scenario.expectedError}", got "${error.message}"`
        )
      }
    }
  }
}

/**
 * Create a mock request context for testing
 * Used for services that need AuthenticatedRequest
 *
 * @example
 * ```typescript
 * const req = createMockRequest({
 *   userId: 'user-123',
 *   email: 'user@example.com'
 * })
 *
 * const result = await service.create(req, dto)
 * ```
 */
export function createMockRequest(overrides: Partial<any> = {}) {
  return {
    user: {
      id: 'user-123',
      email: 'user@example.com',
      aud: 'authenticated',
      ...overrides.user
    },
    headers: {
      authorization: 'Bearer test-token',
      ...overrides.headers
    },
    cookies: overrides.cookies || {},
    ...overrides
  }
}

/**
 * Verify service called a dependency correctly
 *
 * @example
 * ```typescript
 * const supabaseService = serviceTest.getMock(SupabaseService)
 * await service.create(req, dto)
 * expectServiceCall(supabaseService, 'getUserClient', [req.user.id])
 * ```
 */
export function expectServiceCall(
  mock: jest.Mocked<any>,
  methodName: string,
  expectedArgs?: any[]
): void {
  const method = mock[methodName]
  if (!jest.isMockFunction(method)) {
    throw new Error(`${methodName} is not a mock function`)
  }

  if (!method.mock.calls.length) {
    throw new Error(
      `Expected ${methodName} to be called, but it wasn't called`
    )
  }

  if (expectedArgs) {
    const called = method.mock.calls.some((args: any[]) =>
      expectedArgs.every((expectedArg, index) =>
        JSON.stringify(args[index]) === JSON.stringify(expectedArg)
      )
    )

    if (!called) {
      throw new Error(
        `Expected ${methodName} to be called with expected args, but was called with ${JSON.stringify(method.mock.calls)}`
      )
    }
  }
}

/**
 * Create a service test helper that automatically sets up common mocks
 */
export function createServiceTestHelper<T>(serviceClass: new (...args: any[]) => T) {
  return {
    create: async () => createServiceTestBed(serviceClass),
    mockRequest: (overrides?: Partial<any>) => createMockRequest(overrides),
    mockDataLayer: (methods?: any) => createMockDataLayer(methods),
    verifyCall: (mock: jest.Mocked<any>, method: string, args?: any[]) =>
      expectServiceCall(mock, method, args),
    verifyDataLayerCall: (mock: any, method: string, args?: any[]) =>
      verifyDataLayerCall(mock, method, args)
  }
}
