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
import type { Database } from '@repo/shared/types/supabase-generated'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AppConfigService } from '../config/app-config.service'
import { SilentLogger } from '../__test__/silent-logger'
import { SUPABASE_ADMIN_CLIENT } from './supabase.constants'
import { SupabaseService } from './supabase.service'

describe('SupabaseService', () => {
	let service: SupabaseService
	let loggerSpy: jest.SpyInstance
	let mockAdminClient: SupabaseClient<Database>

	beforeEach(async () => {
		// Set up environment variables that SupabaseService actually uses
		process.env.SUPABASE_URL = 'https://test-project.supabase.co'
		process.env.SUPABASE_SECRET_KEY =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key'
		process.env.SUPABASE_PUBLISHABLE_KEY =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-publishable-key'

		// Spy on Logger before creating the service (logs happen in constructor)
		const mockLoggerDebug = jest.fn()
		jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLoggerDebug)
		loggerSpy = mockLoggerDebug

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
			expect(loggerSpy).toHaveBeenCalledWith(
				'SupabaseService initialized with injected admin client'
			)
		})

		it('should handle missing environment variables correctly', () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest.fn().mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest.fn().mockReturnValue(undefined)
			}

			const testService = new SupabaseService(mockAdminClient as any, mockAppConfigService as any)

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

			const testService = new SupabaseService(mockAdminClient as any, mockAppConfigService as any)

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

			const testService = new SupabaseService(mockAdminClient as any, mockAppConfigService as any)

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
			}

			const testService = new SupabaseService(mockAdminClient as any, mockAppConfigService as any)

			expect(() => testService.getUserClient('test-token')).toThrow()
		})
	})

	describe('Logger Integration', () => {
		it('should handle logger service correctly', () => {
			// Test that logger is properly injected and works
			expect(service.getAdminClient()).toBeDefined()
			expect(loggerSpy).toHaveBeenCalledWith(
				'SupabaseService initialized with injected admin client'
			)
		})
	})
})
