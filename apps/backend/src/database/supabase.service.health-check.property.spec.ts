import { Test } from '@nestjs/testing'
import * as fc from 'fast-check'
import { SupabaseService } from './supabase.service'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import { SupabaseRpcService } from './supabase-rpc.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'
import { SupabaseHealthService } from './supabase-health.service'
import { AppLogger } from '../logger/app-logger.service'
import { AppConfigService } from '../config/app-config.service'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('SupabaseService.checkConnection() - Property-Based Tests', () => {
  let service: SupabaseService
  let mockAdminClient: SupabaseClient<Database>
  let mockLogger: jest.Mocked<Pick<AppLogger, 'debug' | 'error' | 'warn' | 'log'>>
  let mockConfig: jest.Mocked<
    Pick<
      AppConfigService,
      | 'getSupabaseProjectRef'
      | 'getSupabaseUrl'
      | 'getSupabasePublishableKey'
      | 'getSupabaseSecretKey'
    >
  >

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
      getSupabasePublishableKey: jest.fn().mockReturnValue('eyJtest-publishable-key'),
      getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
    }

    mockAdminClient = {
      rpc: jest.fn(),
      from: jest.fn(),
      auth: {
        getUser: jest.fn()
      }
    } as unknown as SupabaseClient<Database>

    const module = await Test.createTestingModule({
      providers: [
        SupabaseService,
        SupabaseHealthService,
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
          useValue: {
            rpcWithRetries: jest.fn(),
            rpcWithCache: jest.fn()
          }
        },
        {
          provide: SupabaseInstrumentationService,
          useValue: {
            instrumentClient: jest.fn((client: SupabaseClient<Database>) => client),
            trackQuery: jest.fn(),
            recordRpcCall: jest.fn(),
            recordRpcCacheHit: jest.fn(),
            recordRpcCacheMiss: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<SupabaseService>(SupabaseService)
  })

  /**
   * Property 2: Health check gracefully handles missing RPC
   * Validates: Requirements 2.2, 6.2, 6.3, 6.4
   */
  it('should gracefully handle missing RPC and fall back to table ping', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rpcExists: fc.boolean(),
          rpcThrows: fc.boolean(),
          rpcErrorType: fc.constantFrom(
            'function does not exist',
            'function health_check does not exist',
            'network error',
            'timeout'
          ),
          tablePingSucceeds: fc.boolean(),
          tablePingError: fc.constantFrom(
            'connection refused',
            'timeout',
            'permission denied',
            'table does not exist'
          )
        }),
        async ({ rpcExists, rpcThrows, rpcErrorType, tablePingSucceeds, tablePingError }) => {
          // Reset mocks
          jest.clearAllMocks()

          // Setup RPC behavior
          if (!rpcExists || rpcThrows) {
            if (rpcErrorType.includes('does not exist')) {
              // RPC function doesn't exist - return error in result
              mockAdminClient.rpc.mockResolvedValue({
                data: null,
                error: { message: rpcErrorType }
              })
            } else {
              // RPC throws an exception
              mockAdminClient.rpc.mockRejectedValue(new Error(rpcErrorType))
            }
          } else {
            // RPC exists and succeeds
            mockAdminClient.rpc.mockResolvedValue({
              data: { ok: true, timestamp: new Date().toISOString(), version: '1.0' },
              error: null
            })
          }

          // Setup table ping behavior
          const mockSelect = jest.fn()
          mockAdminClient.from.mockReturnValue({
            select: mockSelect
          })

          if (tablePingSucceeds) {
            mockSelect.mockResolvedValue({ error: null })
          } else {
            mockSelect.mockResolvedValue({
              error: { message: tablePingError }
            })
          }

          // Execute health check
          const result = await service.checkConnection()

          // Assertions based on scenario
          if (rpcExists && !rpcThrows) {
            // RPC succeeded - should return healthy with method='rpc'
            expect(result.status).toBe('healthy')
            expect(result.method).toBe('rpc')
            expect(mockLogger.debug).toHaveBeenCalledWith(
              expect.objectContaining({ fn: 'health_check' }),
              expect.stringContaining('Supabase RPC health ok')
            )
          } else {
            // RPC failed or doesn't exist - should fall back to table ping
            if (tablePingSucceeds) {
              expect(result.status).toBe('healthy')
              expect(result.method).toBe('table_ping')
              expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.objectContaining({ table: 'users' }),
                expect.stringContaining('Supabase table ping ok')
              )
            } else {
              expect(result.status).toBe('unhealthy')
              expect(result.method).toBe('table_ping')
              expect(result.message).toBe(tablePingError)
              expect(mockLogger.error).toHaveBeenCalledWith(
                expect.objectContaining({
                  table: 'users',
                  errorCode: 'SUP-005'
                }),
                expect.stringContaining('[SUP-005] Supabase table ping failed')
              )
            }

            // Verify missing RPC doesn't cause error-level logging
            if (rpcErrorType.includes('does not exist')) {
              // Should log at DEBUG level, not ERROR or WARN
              const errorCalls = mockLogger.error.mock.calls.filter((call: unknown[]) =>
                call.some((arg: unknown) =>
                  typeof arg === 'string' && arg.includes('RPC')
                )
              )
              const warnCalls = mockLogger.warn.mock.calls.filter((call: unknown[]) =>
                call.some((arg: unknown) =>
                  typeof arg === 'string' && arg.includes('RPC')
                )
              )
              expect(errorCalls.length).toBe(0)
              expect(warnCalls.length).toBe(0)

              // Should have DEBUG log about RPC not available
              expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.objectContaining({ fn: 'health_check' }),
                expect.stringMatching(/RPC health_check function not available|using table ping fallback/i)
              )
            }
          }

          // Verify table ping was called when RPC failed
          if (!rpcExists || rpcThrows) {
            expect(mockAdminClient.from).toHaveBeenCalledWith('users')
            expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true })
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Health check returns healthy when table ping succeeds regardless of RPC
   */
  it('should return healthy status when table ping succeeds even if RPC fails', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'function does not exist',
          'function health_check does not exist',
          'network error',
          'timeout',
          'permission denied'
        ),
        async (rpcError) => {
          // Reset mocks
          jest.clearAllMocks()

          // RPC fails with various errors
          mockAdminClient.rpc.mockResolvedValue({
            data: null,
            error: { message: rpcError }
          })

          // Table ping succeeds
          const mockSelect = jest.fn().mockResolvedValue({ error: null })
          mockAdminClient.from.mockReturnValue({
            select: mockSelect
          })

          // Execute health check
          const result = await service.checkConnection()

          // Should return healthy because table ping succeeded
          expect(result.status).toBe('healthy')
          expect(result.method).toBe('table_ping')

          // Verify table ping was called
          expect(mockAdminClient.from).toHaveBeenCalledWith('users')
          expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Missing RPC function doesn't cause error-level logging
   */
  it('should log missing RPC at DEBUG level, not ERROR or WARN', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'function does not exist',
          'function health_check does not exist',
          'function "health_check" does not exist'
        ),
        fc.boolean(), // tablePingSucceeds
        async (rpcError, tablePingSucceeds) => {
          // Reset mocks
          jest.clearAllMocks()

          // RPC function doesn't exist
          mockAdminClient.rpc.mockResolvedValue({
            data: null,
            error: { message: rpcError }
          })

          // Setup table ping
          const mockSelect = jest.fn().mockResolvedValue({
            error: tablePingSucceeds ? null : { message: 'table error' }
          })
          mockAdminClient.from.mockReturnValue({
            select: mockSelect
          })

          // Execute health check
          await service.checkConnection()

          // Verify no ERROR or WARN logs about missing RPC
          const errorCalls = mockLogger.error.mock.calls.filter((call: unknown[]) =>
            call.some((arg: unknown) =>
              typeof arg === 'string' &&
              (arg.includes('RPC') || arg.includes('health_check')) &&
              arg.includes('does not exist')
            )
          )
          const warnCalls = mockLogger.warn.mock.calls.filter((call: unknown[]) =>
            call.some((arg: unknown) =>
              typeof arg === 'string' &&
              (arg.includes('RPC') || arg.includes('health_check')) &&
              arg.includes('does not exist')
            )
          )

          expect(errorCalls.length).toBe(0)
          expect(warnCalls.length).toBe(0)

          // Should have DEBUG log about RPC not available
          expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.objectContaining({ fn: 'health_check' }),
            expect.stringMatching(/RPC health_check function not available|using table ping fallback/i)
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Health check is deterministic
   */
  it('should return consistent results for the same inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rpcSucceeds: fc.boolean(),
          tablePingSucceeds: fc.boolean()
        }),
        async ({ rpcSucceeds, tablePingSucceeds }) => {
          // Setup mocks
          if (rpcSucceeds) {
            mockAdminClient.rpc.mockResolvedValue({
              data: { ok: true, timestamp: new Date().toISOString(), version: '1.0' },
              error: null
            })
          } else {
            mockAdminClient.rpc.mockResolvedValue({
              data: null,
              error: { message: 'function does not exist' }
            })
          }

          const mockSelect = jest.fn().mockResolvedValue({
            error: tablePingSucceeds ? null : { message: 'connection error' }
          })
          mockAdminClient.from.mockReturnValue({
            select: mockSelect
          })

          // Run health check twice
          const result1 = await service.checkConnection()
          jest.clearAllMocks()

          // Reset mocks with same behavior
          if (rpcSucceeds) {
            mockAdminClient.rpc.mockResolvedValue({
              data: { ok: true, timestamp: new Date().toISOString(), version: '1.0' },
              error: null
            })
          } else {
            mockAdminClient.rpc.mockResolvedValue({
              data: null,
              error: { message: 'function does not exist' }
            })
          }
          mockAdminClient.from.mockReturnValue({
            select: mockSelect.mockResolvedValue({
              error: tablePingSucceeds ? null : { message: 'connection error' }
            })
          })

          const result2 = await service.checkConnection()

          // Results should be consistent
          expect(result1.status).toBe(result2.status)
          expect(result1.method).toBe(result2.method)
        }
      ),
      { numRuns: 100 }
    )
  })
})
