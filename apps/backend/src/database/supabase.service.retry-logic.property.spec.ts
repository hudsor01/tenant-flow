/**
 * SupabaseService Retry Logic Property-Based Tests
 *
 * Property-based tests using fast-check to verify retry logic
 * handles transient errors correctly with exponential backoff.
 *
 * Feature: fix-supabase-connectivity
 * Property 4: Transient errors trigger retry logic
 * Validates: Requirements 7.1, 7.2, 7.3
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
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('SupabaseService.rpcWithRetries() - Property-Based Tests', () => {
  let service: SupabaseService
  let mockAdminClient: SupabaseClient<Database>
  let mockLogger: jest.Mocked<Pick<AppLogger, 'debug' | 'error' | 'warn' | 'log'>>
  let mockConfig: jest.Mocked<
    Pick<AppConfigService, 'getSupabaseProjectRef' | 'getSupabaseUrl' | 'getSupabasePublishableKey'>
  >
  let mockCacheService: jest.Mocked<SupabaseCacheService>
  let mockInstrumentation: jest.Mocked<SupabaseInstrumentationService>
  let mockHealthService: jest.Mocked<SupabaseHealthService>

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn()
    }

    mockConfig = {
      getSupabaseProjectRef: jest.fn().mockReturnValue('test-project-ref'),
      getSupabaseUrl: jest.fn().mockReturnValue('https://test.supabase.co'),
      getSupabasePublishableKey: jest.fn().mockReturnValue('eyJtest-publishable-key')
    }

    mockAdminClient = {
      rpc: jest.fn(),
      from: jest.fn(),
      auth: {
        getUser: jest.fn()
      }
    } as unknown as SupabaseClient<Database>

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

    const rpcService = new SupabaseRpcService(
      mockLogger as unknown as AppLogger,
      mockCacheService as unknown as SupabaseCacheService,
      mockInstrumentation as unknown as SupabaseInstrumentationService
    )

    const module = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: SUPABASE_ADMIN_CLIENT,
          useValue: mockAdminClient
        },
        {
          provide: AppLogger,
          useValue: mockLogger
        },
        {
          provide: AppConfigService,
          useValue: mockConfig
        },
        {
          provide: SupabaseRpcService,
          useValue: rpcService
        },
        {
          provide: SupabaseInstrumentationService,
          useValue: mockInstrumentation
        },
        {
          provide: SupabaseHealthService,
          useValue: mockHealthService
        }
      ]
    }).compile()

    service = module.get<SupabaseService>(SupabaseService)
  })

  const buildModule = async (client: SupabaseClient<Database>) => {
    const rpcService = new SupabaseRpcService(
      mockLogger as unknown as AppLogger,
      mockCacheService as unknown as SupabaseCacheService,
      mockInstrumentation as unknown as SupabaseInstrumentationService
    )

    return Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: SUPABASE_ADMIN_CLIENT,
          useValue: client
        },
        {
          provide: AppLogger,
          useValue: mockLogger
        },
        {
          provide: AppConfigService,
          useValue: mockConfig
        },
        {
          provide: SupabaseRpcService,
          useValue: rpcService
        },
        {
          provide: SupabaseInstrumentationService,
          useValue: mockInstrumentation
        },
        {
          provide: SupabaseHealthService,
          useValue: mockHealthService
        }
      ]
    }).compile()
  }

  /**
   * Property 4: Transient errors trigger retry logic
   * Validates: Requirements 7.1, 7.2, 7.3
   *
   * For any transient error type and number of failures before success,
   * the retry logic SHALL:
   * 1. Retry the operation with exponential backoff
   * 2. Eventually succeed after transient failures
   * 3. Log retry attempts at DEBUG level
   */
  it('should retry transient errors with exponential backoff and eventually succeed', async () => {
    // Generator for transient error types
    const transientErrorArbitrary = fc.constantFrom(
      'network error',
      'network timeout',
      'timeout exceeded',
      'temporary failure',
      'service unavailable',
      'try again later',
      'rate limit exceeded',
      '429 Too Many Requests',
      '503 Service Unavailable',
      'connection reset by peer',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT'
    )

    // Generator for number of failures before success (0-2)
    const failuresBeforeSuccessArbitrary = fc.integer({ min: 0, max: 2 })

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorType: transientErrorArbitrary,
          failuresBeforeSuccess: failuresBeforeSuccessArbitrary,
          errorFormat: fc.constantFrom('thrown', 'returned') // Error can be thrown or returned in result
        }),
        async ({ errorType, failuresBeforeSuccess, errorFormat }) => {
          // Reset mocks
          jest.clearAllMocks()

          let attemptCount = 0
          const successData = { ok: true, result: 'success' }

          // Setup mock RPC behavior
          mockAdminClient.rpc.mockImplementation(() => {
            attemptCount++

            if (attemptCount <= failuresBeforeSuccess) {
              // Fail with transient error
              if (errorFormat === 'thrown') {
                return Promise.reject(new Error(errorType))
              } else {
                return Promise.resolve({
                  data: null,
                  error: { message: errorType }
                })
              }
            }

            // Succeed after failures
            return Promise.resolve({
              data: successData,
              error: null
            })
          })

          // Execute RPC with retries (use very short backoff for faster tests)
          const startTime = Date.now()
          const result = await service.rpcWithRetries(
            'test_function',
            { arg: 'value' },
            5, // max attempts
            5, // Very short backoff (5ms instead of default 100ms)
            100 // timeout
          )
          const duration = Date.now() - startTime

          // Property 1: Should retry the correct number of times
          expect(attemptCount).toBe(failuresBeforeSuccess + 1)

          // Property 2: Should eventually succeed
          expect(result.data).toEqual(successData)
          expect(result.error).toBeNull()

          // Property 3: Should log retry attempts at DEBUG level
          if (failuresBeforeSuccess > 0) {
            expect(mockLogger.debug).toHaveBeenCalled()

            // Verify debug logs mention the function name and error
            const debugCalls = mockLogger.debug.mock.calls
            const retryLogs = debugCalls.filter((call: unknown[]) =>
              call.some((arg: unknown) =>
                typeof arg === 'string' &&
                (arg.includes('test_function') || arg.includes('attempt'))
              )
            )
            expect(retryLogs.length).toBeGreaterThan(0)
          }

          // Property 4: Should use exponential backoff
          // With very short backoff (5ms), duration should still show some delay for retries
          if (failuresBeforeSuccess === 1) {
            expect(duration).toBeGreaterThanOrEqual(3) // At least some delay
          } else if (failuresBeforeSuccess === 2) {
            expect(duration).toBeGreaterThanOrEqual(10) // More delay for more retries
          }

          // Property 5: RPC should be called with correct arguments each time
          expect(mockAdminClient.rpc).toHaveBeenCalledWith('test_function', { arg: 'value' })
        }
      ),
      { numRuns: 30, timeout: 15000 } // Reduced runs for faster execution
    )
  }, 10000) // Jest timeout for the entire test

  /**
   * Property: Retry logic respects max attempts
   *
   * If all retry attempts fail with transient errors, the operation
   * should return the last error after exhausting retries.
   */
  it('should exhaust retries and return last error for persistent transient failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'network timeout',
          'connection reset',
          'ECONNRESET',
          'service unavailable'
        ),
        async (errorType) => {
          let attemptCount = 0
          const maxAttempts = 3

          // Create a fresh mock for this test run
          const freshMockClient = {
            rpc: jest.fn().mockImplementation(() => {
              attemptCount++
              return Promise.reject(new Error(errorType))
            }),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          }

          // Create a new service instance with the fresh mock
          const module = await buildModule(freshMockClient)

          const testService = module.get<SupabaseService>(SupabaseService)

          // Execute RPC with retries (limited attempts)
          const result = await testService.rpcWithRetries(
            'test_function',
            { arg: 'value' },
            maxAttempts,
            5, // Very short backoff for faster test
            50 // Short timeout
          )

          // Property 1: Should attempt exactly maxAttempts times
          expect(attemptCount).toBe(maxAttempts)

          // Property 2: Should return error result
          expect(result.data).toBeNull()
          expect(result.error).toBeDefined()
          expect(result.error?.message).toContain(errorType)

          // Property 3: Should include attempt count in result
          expect(result.attempts).toBe(maxAttempts)
        }
      ),
      { numRuns: 20 } // Reduced runs for faster execution
    )
  }, 10000) // Jest timeout

  /**
   * Property: Different transient error patterns are recognized
   *
   * All transient error patterns should trigger retry logic.
   */
  it('should recognize all transient error patterns', async () => {
    const transientPatterns = [
      'network error',
      'timeout',
      'temporary',
      'unavailable',
      'try again',
      'rate limit',
      '429',
      '503',
      'connection reset',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ]

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...transientPatterns),
        fc.string({ minLength: 0, maxLength: 50 }), // Additional context in error message
        async (pattern, context) => {
          let attemptCount = 0
          const errorMessage = context ? `${pattern} - ${context}` : pattern

          // Create a fresh mock for this test run
          const freshMockClient = {
            rpc: jest.fn().mockImplementation(() => {
              attemptCount++
              if (attemptCount === 1) {
                return Promise.reject(new Error(errorMessage))
              }
              return Promise.resolve({ data: { ok: true }, error: null })
            }),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          }

          // Create a new service instance
          const module = await buildModule(freshMockClient)

          const testService = module.get<SupabaseService>(SupabaseService)

          // Execute RPC with retries
          const result = await testService.rpcWithRetries(
            'test_function',
            {},
            3,
            5, // Very short backoff
            100
          )

          // Property: Should retry and eventually succeed
          expect(attemptCount).toBe(2) // 1 failure + 1 success
          expect(result.data).toEqual({ ok: true })
          expect(result.error).toBeNull()
        }
      ),
      { numRuns: 30 } // Reduced runs for faster execution
    )
  }, 10000) // Jest timeout

  /**
   * Property: Exponential backoff timing is correct
   *
   * Verify that retry delays follow exponential backoff pattern.
   */
  it('should use exponential backoff with jitter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // Number of failures (reduced to avoid timeout)
        async (failures) => {
          let attemptCount = 0
          const attemptTimes: number[] = []

          // Create a fresh mock for this test run
          const freshMockClient = {
            rpc: jest.fn().mockImplementation(() => {
              attemptTimes.push(Date.now())
              attemptCount++

              if (attemptCount <= failures) {
                return Promise.reject(new Error('network timeout'))
              }
              return Promise.resolve({ data: { ok: true }, error: null })
            }),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          }

          // Create a new service instance
          const module = await buildModule(freshMockClient)

          const testService = module.get<SupabaseService>(SupabaseService)

          const baseBackoff = 30 // Use shorter backoff for faster tests
          await testService.rpcWithRetries('test_function', {}, 5, baseBackoff, 1000)

          // Property: Should have correct number of attempts
          expect(attemptCount).toBe(failures + 1)

          // Property: Delays should increase exponentially (with generous tolerance for timing)
          for (let i = 1; i < attemptTimes.length; i++) {
            const delay = attemptTimes[i] - attemptTimes[i - 1]
            const expectedMinDelay = baseBackoff * Math.pow(2, i - 1)

            // Delay should be at least the expected backoff (with generous tolerance)
            expect(delay).toBeGreaterThanOrEqual(expectedMinDelay * 0.5)

            // Delay should not be excessively long (backoff + max jitter + generous tolerance)
            const maxJitter = Math.min(1000, expectedMinDelay)
            expect(delay).toBeLessThan(expectedMinDelay + maxJitter + 200)
          }
        }
      ),
      { numRuns: 30 } // Fewer runs since this test involves timing and service creation
    )
  }, 8000) // Jest timeout

  /**
   * Property: Successful first attempt doesn't trigger retries
   *
   * If the operation succeeds on the first attempt, no retries should occur.
   */
  it('should not retry when operation succeeds immediately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          data: fc.anything(),
          functionName: fc.string({ minLength: 1, maxLength: 50 }),
          args: fc.dictionary(fc.string(), fc.anything())
        }),
        async ({ data, functionName, args }) => {
          // Reset mocks
          jest.clearAllMocks()

          let attemptCount = 0

          // Always succeed immediately
          mockAdminClient.rpc.mockImplementation(() => {
            attemptCount++
            return Promise.resolve({ data, error: null })
          })

          // Execute RPC with retries
          const result = await service.rpcWithRetries(functionName, args)

          // Property 1: Should only attempt once
          expect(attemptCount).toBe(1)

          // Property 2: Should return success data
          // Note: Supabase normalizes undefined to null, so we accept both
          if (data === undefined) {
            expect(result.data === null || result.data === undefined).toBe(true)
          } else {
            expect(result.data).toEqual(data)
          }
          expect(result.error).toBeNull()

          // Property 3: Should not log retry attempts
          const debugCalls = mockLogger.debug.mock.calls
          const retryLogs = debugCalls.filter((call: unknown[]) =>
            call.some((arg: unknown) =>
              typeof arg === 'string' && arg.includes('attempt')
            )
          )
          expect(retryLogs.length).toBe(0)
        }
      ),
      { numRuns: 30 } // Reduced runs for faster execution
    )
  })

  /**
   * Property: Retry logic is deterministic for same inputs
   *
   * Running the same scenario multiple times should produce consistent results.
   */
  it('should produce consistent results for the same error scenario', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorType: fc.constantFrom('network timeout', 'ECONNRESET', 'rate limit'),
          failures: fc.integer({ min: 0, max: 2 })
        }),
        async ({ errorType, failures }) => {
          // Run the same scenario twice with fresh service instances
          const results: unknown[] = []

          for (let run = 0; run < 2; run++) {
            let attemptCount = 0

            // Create a fresh mock for each run
            const freshMockClient = {
              rpc: jest.fn().mockImplementation(() => {
                attemptCount++
                if (attemptCount <= failures) {
                  return Promise.reject(new Error(errorType))
                }
                return Promise.resolve({ data: { ok: true }, error: null })
              }),
              from: jest.fn(),
              auth: { getUser: jest.fn() }
            }

            // Create a new service instance
            const module = await buildModule(freshMockClient)

            const testService = module.get<SupabaseService>(SupabaseService)

            const result = await testService.rpcWithRetries(
              'test_function',
              {},
              5,
              5, // Very short backoff
              100
            )

            results.push({
              attemptCount,
              data: result.data,
              hasError: !!result.error
            })
          }

          // Property: Both runs should have same number of attempts
          expect(results[0].attemptCount).toBe(results[1].attemptCount)

          // Property: Both runs should have same success/failure outcome
          expect(results[0].hasError).toBe(results[1].hasError)
          expect(results[0].data).toEqual(results[1].data)
        }
      ),
      { numRuns: 50 } // Reduced runs since we're creating service instances
    )
  }, 10000) // Jest timeout

  /**
   * Property: Abort signal works correctly
   *
   * If the RPC supports abort signals, timeouts should work.
   * Note: This test verifies the abort signal mechanism is set up correctly,
   * but actual timeout behavior depends on the Supabase client implementation.
   */
  it('should handle abort signals for timeouts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 20, max: 80 }), // Timeout in ms
        async (timeoutMs) => {
          // Mock RPC that supports abort signal
          const mockRpcBuilder = {
            abortSignal: jest.fn().mockImplementation(async (signal: AbortSignal) => {
              // Simulate a long-running operation
              return new Promise((resolve) => {
                const timer = setTimeout(() => {
                  resolve({ data: { ok: true }, error: null })
                }, timeoutMs * 3) // Takes much longer than timeout

                signal.addEventListener('abort', () => {
                  clearTimeout(timer)
                  // Resolve with error when aborted
                  resolve({ data: null, error: { message: 'AbortError' } })
                })
              })
            })
          }

          // Create a fresh mock
          const freshMockClient = {
            rpc: jest.fn().mockReturnValue(mockRpcBuilder),
            from: jest.fn(),
            auth: { getUser: jest.fn() }
          }

          // Create a new service instance
          const module = await buildModule(freshMockClient)

          const testService = module.get<SupabaseService>(SupabaseService)

          // Execute with short timeout
          const result = await testService.rpcWithRetries(
            'test_function',
            {},
            2, // Max 2 attempts
            5, // Very short backoff
            timeoutMs // Use the generated timeout
          )

          // Property: Should call abortSignal if it exists
          // The abort signal should be used when available
          expect(mockRpcBuilder.abortSignal).toHaveBeenCalled()

          // Property: Should handle timeout by returning error or retrying
          // Since operation takes longer than timeout, should get error or retry
          if (result.error) {
            expect(result.error.message).toBeTruthy()
          }
        }
      ),
      { numRuns: 30 } // Fewer runs since this involves timing and service creation
    )
  }, 8000) // Jest timeout
})
