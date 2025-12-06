/**
 * SupabaseService Tests - Following Official Supabase Testing Guidelines
 *
 * Based on: https://supabase.com/docs/guides/local-development/testing/overview
 *
 * - NO ABSTRACTIONS: Use Supabase client directly
 * - KISS: Simplest possible test patterns
 * - DRY: Only abstract when reused 2+ places
 * - Tests mirror production usage patterns exactly
 */

import { InternalServerErrorException, Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AppConfigService } from '../config/app-config.service'
import { SilentLogger } from '../__test__/silent-logger'
import { AppLogger } from '../logger/app-logger.service'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import { SupabaseService } from './supabase.service'

describe('SupabaseService', () => {
  let service: SupabaseService
  let mockAdminClient: SupabaseClient<Database>
  let mockAppLogger: any

  beforeEach(async () => {
    // Set up environment variables that SupabaseService actually uses
    process.env.SUPABASE_URL = 'https://test-project.supabase.co'
    // Use new SB_SECRET_KEY format (fall back still supported via SERVICE_ROLE)
    process.env.SB_SECRET_KEY = 'sb_secret_test-service-key'
    process.env.SUPABASE_PUBLISHABLE_KEY =
      'sb_publishable_test-publishable-key'

    // Create mock logger
    mockAppLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn()
    }

    mockAdminClient = {
      rpc: jest.fn(),
      from: jest.fn(),
      auth: {
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        getSession: jest.fn()
      },
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(),
          download: jest.fn(),
          remove: jest.fn()
        }))
      }
    } as unknown as SupabaseClient<Database>

    const mockAppConfigService = {
      getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
      getSupabaseUrl: jest.fn().mockReturnValue('https://test-project.supabase.co'),
      getSupabasePublishableKey: jest.fn().mockReturnValue('test-publishable-key')
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: SUPABASE_ADMIN_CLIENT,
          useValue: mockAdminClient
        },
        {
          provide: AppConfigService,
          useValue: mockAppConfigService
        },
        {
          provide: AppLogger,
          useValue: mockAppLogger
        }
      ]
    })
      .setLogger(new SilentLogger())
      .compile()

    service = module.get<SupabaseService>(SupabaseService)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should initialize admin client with correct configuration', () => {
      // Service should initialize successfully with environment variables
      expect(service).toBeDefined()
      expect(service.getAdminClient()).toBeDefined()
      expect(service.getAdminClient()).toBe(mockAdminClient)

      // Check that logger was called with expected message
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'SupabaseService initialized with injected admin client'
      )
    })

    it('should handle missing environment variables correctly', () => {
      const mockAppConfigService = {
        getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
        getSupabaseUrl: jest.fn().mockReturnValue('https://test-project.supabase.co'),
        getSupabasePublishableKey: jest.fn().mockReturnValue(undefined)
      }

      const testService = new SupabaseService(mockAdminClient as any, mockAppLogger, mockAppConfigService as any)

      // The service should be created but getUserClient should throw when called with missing publishable key
      expect(testService).toBeDefined()
      expect(() => testService.getUserClient('test-token')).toThrow(InternalServerErrorException)
    })
  })

  describe('Client Access Methods', () => {
    it('should return admin client', () => {
      const adminClient = service.getAdminClient()

      expect(adminClient).toBeDefined()
      expect(typeof adminClient.from).toBe('function')
      expect(typeof adminClient.auth).toBe('object')
      expect(typeof adminClient.storage).toBe('object')
    })

    it('should create user client with token', () => {
      const userToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-user-token'

      // Mock environment variables for user client
      process.env.SUPABASE_URL = 'https://test-project.supabase.co'
      process.env.SUPABASE_PUBLISHABLE_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-publishable-key'

      const userClient = service.getUserClient(userToken)

      expect(userClient).toBeDefined()
      expect(typeof userClient.from).toBe('function')
      expect(typeof userClient.auth).toBe('object')
    })

    it('should throw error when creating user client without SUPABASE_URL', () => {
      const mockAppConfigService = {
        getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
        getSupabaseUrl: jest.fn().mockReturnValue(undefined),
        getSupabasePublishableKey: jest.fn().mockReturnValue('test-publishable-key')
      }

      const testService = new SupabaseService(mockAdminClient as any, mockAppLogger, mockAppConfigService as any)

      expect(() => testService.getUserClient('test-token')).toThrow(
        InternalServerErrorException
      )
    })

    it('should throw error when creating user client without SUPABASE_PUBLISHABLE_KEY', () => {
      const mockAppConfigService = {
        getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
        getSupabaseUrl: jest.fn().mockReturnValue('https://test-project.supabase.co'),
        getSupabasePublishableKey: jest.fn().mockReturnValue(undefined)
      }

      const testService = new SupabaseService(mockAdminClient as any, mockAppLogger, mockAppConfigService as any)

      expect(() => testService.getUserClient('test-token')).toThrow(
        InternalServerErrorException
      )
    })
  })

  describe('Connection Health Check', () => {
    it('should have checkConnection method for production health checks', async () => {
      // Verify the method exists and returns structured response
      expect(typeof service.checkConnection).toBe('function')

      const result = await service.checkConnection()

      // Should always return an object with status property
      expect(result).toHaveProperty('status')
      expect(['healthy', 'unhealthy']).toContain(result.status)

      // If unhealthy, should have message
      if (result.status === 'unhealthy') {
        expect(result).toHaveProperty('message')
        expect(typeof result.message).toBe('string')
      }
    })

    it('should return healthy with method=rpc when RPC health check succeeds', async () => {
      // Mock successful RPC health check
      mockAdminClient.rpc = jest.fn().mockResolvedValue({
        data: { ok: true, timestamp: '2024-01-01T00:00:00Z', version: '1.0.0' },
        error: null
      })

      const result = await service.checkConnection()

      expect(result).toEqual({
        status: 'healthy',
        method: 'rpc'
      })
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ fn: 'health_check', version: '1.0.0' }),
        'Supabase RPC health ok'
      )
    })

    it('should fall back to table ping when RPC function does not exist', async () => {
      // Mock RPC function not found error
      mockAdminClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('function health_check() does not exist')
      })

      // Mock successful table ping
      mockAdminClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          error: null
        })
      })

      const result = await service.checkConnection()

      expect(result).toEqual({
        status: 'healthy',
        method: 'table_ping'
      })

      // Verify DEBUG level logging for missing RPC (not error level)
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ fn: 'health_check' }),
        'RPC health_check function not available, using table ping fallback'
      )
      expect(mockAppLogger.error).not.toHaveBeenCalled()
    })

    it('should return healthy with method=table_ping when table ping succeeds', async () => {
      // Mock RPC throwing error (not available)
      mockAdminClient.rpc = jest.fn().mockRejectedValue(
        new Error('RPC not available')
      )

      // Mock successful table ping
      mockAdminClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          error: null
        })
      })

      const result = await service.checkConnection()

      expect(result).toEqual({
        status: 'healthy',
        method: 'table_ping'
      })
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ table: 'users' }),
        'Supabase table ping ok'
      )
    })

    it('should return unhealthy when table ping fails', async () => {
      // Mock RPC not available
      mockAdminClient.rpc = jest.fn().mockRejectedValue(
        new Error('RPC not available')
      )

      // Mock failed table ping
      const tableError = {
        message: 'Connection refused',
        code: 'ECONNREFUSED',
        details: 'Could not connect to database'
      }
      mockAdminClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          error: tableError
        })
      })

      const result = await service.checkConnection()

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'Connection refused',
        method: 'table_ping'
      })

      // Verify ERROR level logging for actual failures
      expect(mockAppLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'users',
          errorCode: 'SUP-005'
        }),
        '[SUP-005] Supabase table ping failed'
      )
    })

    it('should use DEBUG level for missing RPC function', async () => {
      // Mock RPC function not found
      mockAdminClient.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('function health_check() does not exist')
      })

      // Mock successful table ping
      mockAdminClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          error: null
        })
      })

      await service.checkConnection()

      // Verify only DEBUG logging, no ERROR logging
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ fn: 'health_check' }),
        'RPC health_check function not available, using table ping fallback'
      )
      expect(mockAppLogger.error).not.toHaveBeenCalled()
      expect(mockAppLogger.warn).not.toHaveBeenCalled()
    })

    it('should use ERROR level for actual database failures', async () => {
      // Mock RPC not available
      mockAdminClient.rpc = jest.fn().mockRejectedValue(
        new Error('RPC not available')
      )

      // Mock table ping failure
      const dbError = {
        message: 'Database connection failed',
        code: 'PGRST301',
        details: 'Could not connect to PostgreSQL'
      }
      mockAdminClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          error: dbError
        })
      })

      await service.checkConnection()

      // Verify ERROR level logging with SUP-005 code
      expect(mockAppLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'users',
          errorCode: 'SUP-005',
          error: expect.stringContaining('Database connection failed')
        }),
        '[SUP-005] Supabase table ping failed'
      )
    })

    it('should handle RPC throwing exception and fall back to table ping', async () => {
      // Mock RPC throwing exception
      mockAdminClient.rpc = jest.fn().mockRejectedValue(
        new Error('function health_check() does not exist')
      )

      // Mock successful table ping
      mockAdminClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          error: null
        })
      })

      const result = await service.checkConnection()

      expect(result).toEqual({
        status: 'healthy',
        method: 'table_ping'
      })

      // Verify DEBUG level logging for missing RPC
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ fn: 'health_check' }),
        'RPC health_check function not available, using table ping fallback'
      )
    })

    it('should handle unexpected errors gracefully', async () => {
      // Mock RPC throwing unexpected error
      mockAdminClient.rpc = jest.fn().mockRejectedValue(
        new Error('Unexpected error')
      )

      // Mock table ping also throwing
      mockAdminClient.from = jest.fn().mockImplementation(() => {
        throw new Error('Critical database error')
      })

      const result = await service.checkConnection()

      expect(result).toEqual({
        status: 'unhealthy',
        message: 'Critical database error'
      })

      // Verify ERROR level logging
      expect(mockAppLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Critical database error',
          errorCode: 'SUP-005'
        }),
        '[SUP-005] Supabase connectivity check threw'
      )
    })
  })

  describe('Production Pattern Validation', () => {
    it('should provide admin client with required methods', () => {
      const adminClient = service.getAdminClient()

      // Verify client has all required production methods
      expect(adminClient).toBeDefined()
      expect(typeof adminClient.from).toBe('function')
      expect(typeof adminClient.rpc).toBe('function')
      expect(adminClient.auth).toBeDefined()
      expect(adminClient.storage).toBeDefined()
    })

    it('should provide user client with required methods', () => {
      // Set required environment variables for user client
      process.env.SUPABASE_URL = 'https://test-project.supabase.co'
      process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key'

      const userClient = service.getUserClient('test-token')

      // Verify user client has all required production methods
      expect(userClient).toBeDefined()
      expect(typeof userClient.from).toBe('function')
      expect(typeof userClient.rpc).toBe('function')
      expect(userClient.auth).toBeDefined()
    })

    it('should handle missing environment variables correctly', () => {
      const mockAppConfigService = {
        getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
        getSupabaseUrl: jest.fn().mockReturnValue(undefined),
        getSupabasePublishableKey: jest.fn().mockReturnValue(undefined)
      }

      const mockLogger = {
        debug: jest.fn(),
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        verbose: jest.fn()
      }

      const testService = new SupabaseService(mockAdminClient as any, mockLogger as any, mockAppConfigService as any)

      expect(() => testService.getUserClient('test-token')).toThrow()
    })
  })

  describe('Logger Integration', () => {
    it('should handle logger service correctly', () => {
      // Test that logger is properly injected and works
      expect(service.getAdminClient()).toBeDefined()
      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'SupabaseService initialized with injected admin client'
      )
    })
  })
})
