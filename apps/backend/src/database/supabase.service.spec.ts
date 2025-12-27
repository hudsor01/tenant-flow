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
import { SupabaseRpcService } from './supabase-rpc.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'
import { SupabaseHealthService } from './supabase-health.service'
import { SupabaseService } from './supabase.service'

describe('SupabaseService', () => {
  let service: SupabaseService
  let mockAdminClient: SupabaseClient<Database>
  let mockAppLogger: jest.Mocked<
    Pick<AppLogger, 'debug' | 'log' | 'error' | 'warn' | 'verbose'>
  >
  let mockRpcService: jest.Mocked<SupabaseRpcService>
  let mockInstrumentation: jest.Mocked<SupabaseInstrumentationService>
  let mockHealthService: jest.Mocked<SupabaseHealthService>

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
    } as unknown as AppConfigService

    mockRpcService = {
      rpcWithRetries: jest.fn(),
      rpcWithCache: jest.fn()
    } as unknown as jest.Mocked<SupabaseRpcService>

    mockInstrumentation = {
      instrumentClient: jest.fn((client: SupabaseClient<Database>) => client),
      trackQuery: jest.fn(),
      recordRpcCall: jest.fn(),
      recordRpcCacheHit: jest.fn(),
      recordRpcCacheMiss: jest.fn()
    } as unknown as jest.Mocked<SupabaseInstrumentationService>

    mockHealthService = {
      checkConnection: jest.fn().mockResolvedValue({ status: 'healthy', method: 'rpc' })
    } as unknown as jest.Mocked<SupabaseHealthService>

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
        },
        {
          provide: SupabaseRpcService,
          useValue: mockRpcService
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

      const testService = new SupabaseService(
        mockAdminClient,
        mockAppLogger,
        mockAppConfigService,
        mockRpcService,
        mockInstrumentation,
        mockHealthService
      )

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
      } as unknown as AppConfigService

      const testService = new SupabaseService(
        mockAdminClient,
        mockAppLogger,
        mockAppConfigService,
        mockRpcService,
        mockInstrumentation,
        mockHealthService
      )

      expect(() => testService.getUserClient('test-token')).toThrow(
        InternalServerErrorException
      )
    })

    it('should throw error when creating user client without SUPABASE_PUBLISHABLE_KEY', () => {
      const mockAppConfigService = {
        getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
        getSupabaseUrl: jest.fn().mockReturnValue('https://test-project.supabase.co'),
        getSupabasePublishableKey: jest.fn().mockReturnValue(undefined)
      } as unknown as AppConfigService

      const testService = new SupabaseService(
        mockAdminClient,
        mockAppLogger,
        mockAppConfigService,
        mockRpcService,
        mockInstrumentation,
        mockHealthService
      )

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
      } as unknown as AppConfigService

      const mockLogger = {
        debug: jest.fn(),
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        verbose: jest.fn()
      } as jest.Mocked<
        Pick<AppLogger, 'debug' | 'log' | 'error' | 'warn' | 'verbose'>
      >

      const testService = new SupabaseService(
        mockAdminClient,
        mockLogger,
        mockAppConfigService
      )

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
