/**
 * SupabaseService Non-Transient Error Handling Property-Based Tests
 *
 * Property-based tests using fast-check to verify non-transient errors
 * fail immediately without retry attempts.
 *
 * Feature: fix-supabase-connectivity
 * Property 5: Non-transient errors fail immediately
 * Validates: Requirement 7.4
 */

import { Test } from '@nestjs/testing'
import * as fc from 'fast-check'
import { SupabaseService } from './supabase.service'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import { AppLogger } from '../logger/app-logger.service'
import { AppConfigService } from '../config/app-config.service'
import { SupabaseRpcService } from './supabase-rpc.service'
import { SupabaseCacheService } from './supabase-cache.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'
import { SupabaseHealthService } from './supabase-health.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'

describe('SupabaseService.rpcWithRetries() - Non-Transient Error Handling', () => {
  let mockLogger: jest.Mocked<Pick<AppLogger, 'debug' | 'error' | 'warn' | 'log'>>
  let mockConfig: jest.Mocked<
    Pick<AppConfigService, 'getSupabaseProjectRef' | 'getSupabaseUrl' | 'getSupabasePublishableKey'>
  >
  let mockCacheService: jest.Mocked<SupabaseCacheService>
  let mockInstrumentation: jest.Mocked<SupabaseInstrumentationService>
  let mockHealthService: jest.Mocked<SupabaseHealthService>

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    }

    mockConfig = {
      getSupabaseProjectRef: jest.fn().mockReturnValue('test-project-ref'),
      getSupabaseUrl: jest.fn().mockReturnValue('https://test.supabase.co'),
      getSupabasePublishableKey: jest
        .fn()
        .mockReturnValue('eyJtest-publishable-key')
    }

    mockCacheService = {
      isEnabled: jest.fn().mockReturnValue(false),
      buildRpcCacheKey: jest.fn(),
      get: jest.fn(),
      set: jest.fn()
    } as unknown as jest.Mocked<SupabaseCacheService>

    mockInstrumentation = {
      instrumentClient: jest.fn((client: SupabaseClient<Database>) => client),
      trackQuery: jest.fn(),
      recordRpcCall: jest.fn(),
      recordRpcCacheHit: jest.fn(),
      recordRpcCacheMiss: jest.fn()
    } as unknown as jest.Mocked<SupabaseInstrumentationService>

    mockHealthService = {
      checkConnection: jest.fn()
    } as unknown as jest.Mocked<SupabaseHealthService>
  })

  const createModule = async (client: SupabaseClient<Database>) => {
    const rpcService = new SupabaseRpcService(
      mockLogger as unknown as AppLogger,
      mockCacheService as unknown as SupabaseCacheService,
      mockInstrumentation as unknown as SupabaseInstrumentationService
    )

    return Test.createTestingModule({
      providers: [
        SupabaseService,
        { provide: SUPABASE_ADMIN_CLIENT, useValue: client },
        { provide: AppLogger, useValue: mockLogger },
        { provide: AppConfigService, useValue: mockConfig },
        { provide: SupabaseRpcService, useValue: rpcService },
        { provide: SupabaseInstrumentationService, useValue: mockInstrumentation },
        { provide: SupabaseHealthService, useValue: mockHealthService }
      ]
    }).compile()
  }

  /**
   * Property 5: Non-transient errors fail immediately
   * Validates: Requirement 7.4
   *
   * For any non-transient error type (auth, permission, invalid query, etc.),
   * the retry logic SHALL:
   * 1. NOT retry the operation
   * 2. Return the error immediately
   * 3. Only attempt the operation once
   */
  it('should fail immediately for non-transient errors without retrying', async () => {
    // Generator for non-transient error types
    // These are errors that indicate a problem that won't be fixed by retrying
    const nonTransientErrorArbitrary = fc.constantFrom(
      'authentication failed',
      'invalid credentials',
      'permission denied',
      'access denied',
      'unauthorized',
      'forbidden',
      'invalid query',
      'syntax error',
      'column does not exist',
      'table does not exist',
      'function does not exist',
      'invalid input',
      'constraint violation',
      'unique constraint',
      'foreign key violation',
      'not found',
      '404 Not Found',
      '400 Bad Request',
      '401 Unauthorized',
      '403 Forbidden',
      'bad request',
      'invalid parameter',
      'missing required field'
    )

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorType: nonTransientErrorArbitrary,
          errorFormat: fc.constantFrom('thrown', 'returned'),
          additionalContext: fc.string({ minLength: 0, maxLength: 30 })
        }),
        async ({ errorType, errorFormat, additionalContext }) => {
          let attemptCount = 0
          const errorMessage = additionalContext
            ? `${errorType}: ${additionalContext}`
            : errorType

          // Create a fresh mock for this test run
          const freshMockClient = {
            rpc: jest.fn().mockImplementation(() => {
              attemptCount++

              // Always fail with non-transient error
              if (errorFormat === 'thrown') {
                return Promise.reject(new Error(errorMessage))
              } else {
                return Promise.resolve({
                  data: null,
                  error: { message: errorMessage }
                })
              }
            }),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          } as unknown as SupabaseClient<Database>

          // Create a new service instance
          const module = await createModule(freshMockClient)

          const testService = module.get<SupabaseService>(SupabaseService)

          // Execute RPC with retries (allow up to 5 attempts, but should only try once)
          const startTime = Date.now()
          const result = await testService.rpcWithRetries(
            'test_function',
            { arg: 'value' },
            5, // max attempts (should not reach this)
            10, // backoff (should not be used)
            100 // timeout
          )
          const duration = Date.now() - startTime

          // Property 1: Should only attempt once (no retries)
          expect(attemptCount).toBe(1)

          // Property 2: Should return error immediately
          expect(result.data).toBeNull()
          expect(result.error).toBeDefined()
          expect(result.error?.message).toContain(errorType)

          // Property 3: Should complete quickly (no backoff delays)
          // Non-transient errors should fail in under 50ms (no retry delays)
          expect(duration).toBeLessThan(50)

          // Property 4: Should not log retry attempts
          const debugCalls = mockLogger.debug.mock.calls
          const retryLogs = debugCalls.filter((call: unknown[]) =>
            call.some(
              (arg: unknown) =>
                typeof arg === 'string' &&
                (arg.includes('retry') || arg.includes('attempt 2'))
            )
          )
          expect(retryLogs.length).toBe(0)
        }
      ),
      { numRuns: 100, timeout: 20000 }
    )
  }, 25000) // Jest timeout

  /**
   * Property: Different non-transient error patterns are recognized
   *
   * All non-transient error patterns should fail immediately without retry.
   */
  it('should recognize all non-transient error patterns and fail immediately', async () => {
    const nonTransientPatterns = [
      'auth',
      'permission',
      'forbidden',
      'unauthorized',
      'invalid',
      'syntax',
      'constraint',
      'not found',
      '400',
      '401',
      '403',
      '404'
    ]

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonTransientPatterns),
        fc.string({ minLength: 0, maxLength: 50 }),
        async (pattern, context) => {
          let attemptCount = 0
          const errorMessage = context
            ? `${pattern} error - ${context}`
            : `${pattern} error`

          // Create a fresh mock
          const freshMockClient = {
            rpc: jest.fn().mockImplementation(() => {
              attemptCount++
              return Promise.reject(new Error(errorMessage))
            }),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          } as unknown as SupabaseClient<Database>

          // Create a new service instance
          const module = await createModule(freshMockClient)

          const testService = module.get<SupabaseService>(SupabaseService)

          // Execute RPC with retries
          const result = await testService.rpcWithRetries(
            'test_function',
            {},
            5,
            10,
            100
          )

          // Property: Should only attempt once
          expect(attemptCount).toBe(1)

          // Property: Should return error
          expect(result.data).toBeNull()
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 100, timeout: 20000 }
    )
  }, 25000) // Jest timeout

  /**
   * Property: Non-transient errors are distinguishable from transient errors
   *
   * Verify that errors classified as non-transient don't match transient patterns.
   */
  it('should distinguish non-transient from transient error patterns', async () => {
    // Transient patterns that SHOULD trigger retries
    const transientPatterns = [
      'network',
      'timeout',
      'temporary',
      'unavailable',
      'try again',
      'rate limit',
      '429',
      '503',
      'connection reset',
      'ECONNRESET'
    ]

    // Non-transient patterns that should NOT trigger retries
    const nonTransientPatterns = [
      'authentication',
      'permission',
      'invalid',
      'forbidden',
      'unauthorized',
      'not found',
      '400',
      '401',
      '403',
      '404'
    ]

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transientError: fc.constantFrom(...transientPatterns),
          nonTransientError: fc.constantFrom(...nonTransientPatterns)
        }),
        async ({ transientError, nonTransientError }) => {
          // Test 1: Transient error should retry
          let transientAttempts = 0
          const transientMockClient = {
            rpc: jest.fn().mockImplementation(() => {
              transientAttempts++
              if (transientAttempts === 1) {
                return Promise.reject(new Error(transientError))
              }
              return Promise.resolve({ data: { ok: true }, error: null })
            }),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          } as unknown as SupabaseClient<Database>

          const transientModule = await createModule(transientMockClient)

          const transientService =
            transientModule.get<SupabaseService>(SupabaseService)
          const transientResult = await transientService.rpcWithRetries(
            'test_function',
            {},
            3,
            5,
            100
          )

          // Test 2: Non-transient error should NOT retry
          let nonTransientAttempts = 0
          const nonTransientMockClient = {
            rpc: jest.fn().mockImplementation(() => {
              nonTransientAttempts++
              return Promise.reject(new Error(nonTransientError))
            }),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          } as unknown as SupabaseClient<Database>

          const nonTransientModule = await createModule(nonTransientMockClient)

          const nonTransientService =
            nonTransientModule.get<SupabaseService>(SupabaseService)
          const nonTransientResult = await nonTransientService.rpcWithRetries(
            'test_function',
            {},
            3,
            5,
            100
          )

          // Property 1: Transient error should retry and succeed
          expect(transientAttempts).toBe(2) // 1 failure + 1 success
          expect(transientResult.data).toEqual({ ok: true })

          // Property 2: Non-transient error should NOT retry
          expect(nonTransientAttempts).toBe(1) // Only 1 attempt
          expect(nonTransientResult.error).toBeDefined()
        }
      ),
      { numRuns: 50, timeout: 20000 } // Fewer runs since we create multiple service instances
    )
  }, 25000) // Jest timeout

  /**
   * Property: Error response format is consistent
   *
   * Non-transient errors should return consistent error format.
   */
  it('should return consistent error format for non-transient errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
          functionName: fc.string({ minLength: 1, maxLength: 50 }),
          args: fc.dictionary(fc.string(), fc.anything())
        }),
        async ({ errorMessage, functionName, args }) => {
          // Create a fresh mock
          const freshMockClient = {
            rpc: jest.fn().mockRejectedValue(new Error(errorMessage)),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          } as unknown as SupabaseClient<Database>

          // Create a new service instance
          const module = await createModule(freshMockClient)

          const testService = module.get<SupabaseService>(SupabaseService)

          // Execute RPC
          const result = await testService.rpcWithRetries(
            functionName,
            args,
            3,
            10,
            100
          )

          // Property 1: Should have null data
          expect(result.data).toBeNull()

          // Property 2: Should have error object with message
          expect(result.error).toBeDefined()
          expect(result.error?.message).toBeTruthy()
          expect(typeof result.error?.message).toBe('string')

          // Property 3: Error message should contain original error
          expect(result.error?.message).toContain(errorMessage)
        }
      ),
      { numRuns: 100, timeout: 20000 }
    )
  }, 25000) // Jest timeout
})
