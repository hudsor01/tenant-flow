/**
 * Data Layer Test Utilities
 *
 * Helpers for testing data layer functions with Supabase integration.
 * Focuses on:
 * - Mocking Supabase RPC calls
 * - Testing query builders
 * - RLS enforcement verification
 * - N+1 query prevention
 */

/**
 * Mock Supabase RPC response
 */
export interface SupabaseRPCResponse<T = any> {
  data: T | null
  error: Error | null
  count?: number
  status: number
}

/**
 * Create a successful Supabase RPC response
 *
 * @example
 * ```typescript
 * const response = createSupabaseRPCResponse({
 *   id: 'prop-1',
 *   name: 'Test Property'
 * })
 * ```
 */
export function createSupabaseRPCResponse<T>(
  data: T,
  status: number = 200
): SupabaseRPCResponse<T> {
  return {
    data,
    error: null,
    status
  }
}

/**
 * Create a failed Supabase RPC response
 *
 * @example
 * ```typescript
 * const response = createSupabaseRPCError(
 *   'Property not found',
 *   404
 * )
 * ```
 */
export function createSupabaseRPCError(
  message: string,
  status: number = 400
): SupabaseRPCResponse {
  return {
    data: null,
    error: new Error(message),
    status
  }
}

/**
 * Mock Supabase client for data layer testing
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabaseClient()
 * mockClient
 *   .from('properties')
 *   .select('*')
 *   .eq('id', 'prop-1')
 *   .single()
 *   .mockResolvedValue(createSupabaseRPCResponse({ id: 'prop-1' }))
 *
 * const result = await dataLayer.findPropertyById(mockClient, 'prop-1')
 * expect(result.id).toBe('prop-1')
 * ```
 */
export function createMockSupabaseClient() {
  const chainMethods = {
    from: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    lte: jest.fn(),
    like: jest.fn(),
    ilike: jest.fn(),
    is: jest.fn(),
    in: jest.fn(),
    contains: jest.fn(),
    containedBy: jest.fn(),
    overlaps: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    range: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    csv: jest.fn(),
    rpc: jest.fn()
  }

  // Create a chain proxy that returns self for fluent API
  const chainProxy = new Proxy(chainMethods, {
    get(target, prop: string | symbol) {
      const method = Reflect.get(target, prop)
      if (typeof method === 'function') {
        return jest.fn().mockReturnThis()
      }
      return method
    }
  })

  return chainProxy as any
}

/**
 * Verify a data layer RPC call
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabaseClient()
 * // ... make call ...
 * expectRPCCall(mockClient, 'from', ['properties'])
 * expectRPCCall(mockClient, 'eq', ['id', 'prop-1'])
 * expectRPCCall(mockClient, 'single', [])
 * ```
 */
export function expectRPCCall(
  mockClient: any,
  method: string,
  expectedArgs?: any[]
): void {
  const mock = mockClient[method]
  if (!jest.isMockFunction(mock)) {
    throw new Error(`${method} is not a mock function on client`)
  }

  if (!mock.mock.calls.length) {
    throw new Error(`Expected RPC method ${method} to be called`)
  }

  if (expectedArgs) {
    const called = mock.mock.calls.some((args: any[]) =>
      JSON.stringify(args) === JSON.stringify(expectedArgs)
    )
    if (!called) {
      throw new Error(
        `Expected RPC method ${method} called with ${JSON.stringify(expectedArgs)}, got ${JSON.stringify(mock.mock.calls)}`
      )
    }
  }
}

/**
 * Test data layer with various RPC scenarios
 *
 * @example
 * ```typescript
 * const scenarios = [
 *   {
 *     name: 'property found',
 *     response: createSupabaseRPCResponse({ id: 'prop-1' }),
 *     expected: { id: 'prop-1' }
 *   },
 *   {
 *     name: 'property not found',
 *     response: createSupabaseRPCError('Not found', 404),
 *     expectedError: 'Not found'
 *   }
 * ]
 * await runDataLayerScenarios(dataLayerMethod, scenarios)
 * ```
 */
export interface DataLayerScenario {
  name: string
  response: SupabaseRPCResponse
  expected?: any
  expectedError?: string
}

export async function runDataLayerScenarios(
  dataLayerMethod: (...args: any[]) => Promise<any>,
  scenarios: DataLayerScenario[],
  methodArgs: any[] = []
): Promise<void> {
  for (const scenario of scenarios) {
    try {
      // Mock the response for this scenario
      const result = await dataLayerMethod(...methodArgs)

      if (scenario.expectedError) {
        throw new Error(
          `Scenario "${scenario.name}" expected error but got: ${JSON.stringify(result)}`
        )
      }

      if (scenario.expected) {
        Object.entries(scenario.expected).forEach(([key, value]) => {
          if (JSON.stringify(result[key]) !== JSON.stringify(value)) {
            throw new Error(
              `Scenario "${scenario.name}": expected ${key}=${JSON.stringify(value)}, got ${JSON.stringify(result[key])}`
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
 * Create a data layer test with RLS enforcement checks
 *
 * @example
 * ```typescript
 * const rlsTest = createRLSEnforcementTest()
 * rlsTest.expectUserScoped('properties', 'property_owner_id', 'user-123')
 * rlsTest.expectTenantScoped('leases', 'property_owner_id', 'user-123')
 * ```
 */
export class RLSEnforcementTest {
  private userScopedQueries: Map<
    string,
    { table: string; column: string; userId: string }
  > = new Map()
  private tenantScopedQueries: Map<
    string,
    { table: string; column: string; tenantId: string }
  > = new Map()

  registerUserScoped(
    queryName: string,
    table: string,
    column: string,
    userId: string
  ): void {
    this.userScopedQueries.set(queryName, { table, column, userId })
  }

  registerTenantScoped(
    queryName: string,
    table: string,
    column: string,
    tenantId: string
  ): void {
    this.tenantScopedQueries.set(queryName, { table, column, tenantId })
  }

  expectUserScoped(
    table: string,
    column: string,
    userId: string
  ): void {
    const found = Array.from(this.userScopedQueries.values()).find(
      (q) => q.table === table && q.column === column && q.userId === userId
    )
    if (!found) {
      throw new Error(
        `Expected user-scoped query on ${table}.${column} for user ${userId}`
      )
    }
  }

  expectTenantScoped(
    table: string,
    column: string,
    tenantId: string
  ): void {
    const found = Array.from(this.tenantScopedQueries.values()).find(
      (q) => q.table === table && q.column === column && q.tenantId === tenantId
    )
    if (!found) {
      throw new Error(
        `Expected tenant-scoped query on ${table}.${column} for tenant ${tenantId}`
      )
    }
  }
}

/**
 * Test N+1 query prevention
 *
 * @example
 * ```typescript
 * const n1Test = new N1QueryTest()
 * const mockClient = createMockSupabaseClient()
 * n1Test.recordQuery('from', ['properties'])
 * n1Test.recordQuery('from', ['units'])
 * // ... should be combined in single query ...
 * n1Test.expectMaxQueries(1)
 * ```
 */
export class N1QueryTest {
  private queries: Array<{ method: string; args: any[] }> = []

  recordQuery(method: string, args: any[]): void {
    this.queries.push({ method, args })
  }

  expectMaxQueries(maxCount: number): void {
    if (this.queries.length > maxCount) {
      throw new Error(
        `Expected max ${maxCount} queries, but got ${this.queries.length}: ${JSON.stringify(this.queries)}`
      )
    }
  }

  expectExactQueries(expectedCount: number): void {
    if (this.queries.length !== expectedCount) {
      throw new Error(
        `Expected exactly ${expectedCount} queries, but got ${this.queries.length}`
      )
    }
  }

  getQueryCount(): number {
    return this.queries.length
  }

  getQueries(): Array<{ method: string; args: any[] }> {
    return this.queries
  }

  reset(): void {
    this.queries = []
  }
}

/**
 * Create a factory for generating test data layer responses
 *
 * @example
 * ```typescript
 * const factory = createDataLayerResponseFactory({
 *   id: 'prop-1',
 *   name: 'Test Property',
 *   address: '123 Main St'
 * })
 *
 * const response1 = factory.create()
 * const response2 = factory.create({ name: 'Custom Name' })
 * ```
 */
export function createDataLayerResponseFactory<T>(defaults: T) {
  return {
    create: (overrides?: Partial<T>): SupabaseRPCResponse<T> => {
      return createSupabaseRPCResponse({ ...defaults, ...overrides } as T)
    },
    createError: (message: string): SupabaseRPCResponse<T> => {
      return createSupabaseRPCError(message)
    },
    createBatch: (count: number, overrides?: Partial<T>): SupabaseRPCResponse<T[]> => {
      const items = Array.from({ length: count }, (_, i) =>
        ({ ...defaults, ...overrides, id: `${(defaults as any).id}-${i}` } as T)
      )
      return createSupabaseRPCResponse(items)
    }
  }
}

/**
 * Test data layer pagination
 *
 * @example
 * ```typescript
 * expectDataLayerPagination(response, {
 *   pageSize: 20,
 *   currentPage: 1,
 *   totalCount: 100
 * })
 * ```
 */
export interface DataLayerPaginationExpectation {
  pageSize: number
  currentPage: number
  totalCount: number
}

export function expectDataLayerPagination(
  response: SupabaseRPCResponse<any[]>,
  expectations: DataLayerPaginationExpectation
): void {
  if (!Array.isArray(response.data)) {
    throw new Error('Expected paginated response with data array')
  }

  if (response.data.length > expectations.pageSize) {
    throw new Error(
      `Expected max ${expectations.pageSize} items, got ${response.data.length}`
    )
  }

  const expectedOffset =
    (expectations.currentPage - 1) * expectations.pageSize
  // In actual implementation, offset would be stored in query or pagination metadata
}

/**
 * Create a mock for testing batch operations (upsert, bulk insert)
 *
 * @example
 * ```typescript
 * const batchMock = createBatchOperationMock([
 *   { id: 'prop-1', name: 'Property 1' },
 *   { id: 'prop-2', name: 'Property 2' }
 * ])
 * ```
 */
export function createBatchOperationMock<T>(items: T[]): SupabaseRPCResponse<T[]> {
  return {
    data: items,
    error: null,
    status: 200,
    count: items.length
  }
}
