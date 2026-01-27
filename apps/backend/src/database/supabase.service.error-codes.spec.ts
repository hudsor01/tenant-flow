/**
 * SupabaseService Error Code Tests
 *
 * Tests for standardized error codes (SUP-001 through SUP-005)
 * Requirements: 4.1, 4.2, 4.3
 */

import { InternalServerErrorException } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AppConfigService } from '../config/app-config.service'
import { AppLogger } from '../logger/app-logger.service'
import { SUPABASE_ERROR_CODES } from './supabase.constants'
import { SupabaseHealthService } from './supabase-health.service'
import { SupabaseInstrumentationService } from './supabase-instrumentation.service'
import { SupabaseRpcService } from './supabase-rpc.service'
import { SupabaseService } from './supabase.service'

describe('SupabaseService - Error Codes', () => {
	let mockAppLogger: jest.Mocked<
		Pick<AppLogger, 'debug' | 'log' | 'error' | 'warn' | 'verbose'>
	>
	let mockAdminClient: SupabaseClient<Database>
	let mockRpcService: jest.Mocked<SupabaseRpcService>
	let mockInstrumentation: jest.Mocked<SupabaseInstrumentationService>

	beforeEach(() => {
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

		mockRpcService = {
			rpc: jest.fn()
			
		} as unknown as jest.Mocked<SupabaseRpcService>

		mockInstrumentation = {
			instrumentClient: jest.fn((client: SupabaseClient<Database>) => client),
			trackQuery: jest.fn(),
			recordRpcCall: jest.fn(),
			recordRpcCacheHit: jest.fn(),
			recordRpcCacheMiss: jest.fn()
		} as unknown as jest.Mocked<SupabaseInstrumentationService>
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	describe('SUP-001: Admin Client Not Initialized', () => {
		it('should throw with SUP-001 when admin client is not initialized', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest
					.fn()
					.mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest
					.fn()
					.mockReturnValue('test-publishable-key'),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			} as unknown as AppConfigService

			// Create service with null admin client
			const service = new SupabaseService(
				null as unknown as SupabaseClient<Database>,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					null as unknown as SupabaseClient<Database>,
					mockAppLogger,
					mockAppConfigService
				)
			)

			// Attempt to get admin client should throw
			expect(() => service.getAdminClient()).toThrow(
				InternalServerErrorException
			)
			expect(() => service.getAdminClient()).toThrow(
				`Database service unavailable [${SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE}]`
			)

			// Verify error logging includes SUP-001 code
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.stringContaining(SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE),
				expect.objectContaining({
					errorCode: SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE,
					context: 'getAdminClient'
				})
			)
		})

		it('should log error when admin client is not initialized', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest
					.fn()
					.mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest
					.fn()
					.mockReturnValue('test-publishable-key'),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			}

			const service = new SupabaseService(
				null as unknown as SupabaseClient<Database>,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					null as unknown as SupabaseClient<Database>,
					mockAppLogger,
					mockAppConfigService as unknown as AppConfigService
				)
			)

			try {
				service.getAdminClient()
			} catch (error) {
				// Expected to throw
			}

			// Verify error is logged without URL (URL check was redundant)
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					errorCode: SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE,
					context: 'getAdminClient'
				})
			)
		})
	})

	describe('SUP-002: User Client Pool Initialization Failed', () => {
		it('should throw with SUP-002 when SUPABASE_URL is missing', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest.fn().mockReturnValue(undefined),
				getSupabasePublishableKey: jest
					.fn()
					.mockReturnValue('test-publishable-key'),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			}

			const service = new SupabaseService(
				mockAdminClient,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					mockAdminClient,
					mockAppLogger,
					mockAppConfigService as unknown as AppConfigService
				)
			)

			// Attempt to get user client should throw
			expect(() => service.getUserClient('test-token')).toThrow(
				InternalServerErrorException
			)
			expect(() => service.getUserClient('test-token')).toThrow(
				`Authentication service unavailable [${SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE}]`
			)

			// Verify error logging includes SUP-002 code
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.stringContaining(SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE),
				expect.objectContaining({
					errorCode: SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE,
					context: 'getUserClientPool',
					hasPublishableKey: true
				})
			)
		})

		it('should throw with SUP-002 when SUPABASE_PUBLISHABLE_KEY is missing', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest
					.fn()
					.mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest.fn().mockReturnValue(undefined),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			}

			const service = new SupabaseService(
				mockAdminClient,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					mockAdminClient,
					mockAppLogger,
					mockAppConfigService as unknown as AppConfigService
				)
			)

			// Attempt to get user client should throw
			expect(() => service.getUserClient('test-token')).toThrow(
				InternalServerErrorException
			)
			expect(() => service.getUserClient('test-token')).toThrow(
				`Authentication service unavailable [${SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE}]`
			)

			// Verify error logging includes SUP-002 code
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.stringContaining(SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE),
				expect.objectContaining({
					errorCode: SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE,
					context: 'getUserClientPool',
					hasPublishableKey: false
				})
			)
		})

		it('should log URL prefix when user client pool initialization fails', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest
					.fn()
					.mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest.fn().mockReturnValue(undefined),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			}

			const service = new SupabaseService(
				mockAdminClient,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					mockAdminClient,
					mockAppLogger,
					mockAppConfigService as unknown as AppConfigService
				)
			)

			try {
				service.getUserClient('test-token')
			} catch (error) {
				// Expected to throw
			}

			// Verify URL prefix is logged (first 35 chars)
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					url: 'https://test-project.supabase.co'.substring(0, 35)
				})
			)
		})
	})

	describe('SUP-003: Configuration Validation Failed', () => {
		it('should be used for configuration validation failures', () => {
			// This test verifies the error code constant exists and has the correct value
			expect(SUPABASE_ERROR_CODES.CONFIG_VALIDATION_FAILED).toBe('SUP-003')
		})

		// Note: SUP-003 is used in the module initialization (supabase.module.ts)
		// and configuration validator (supabase-config.validator.ts)
		// Integration tests for this are in task 3.1
	})

	describe('SUP-004: Startup Verification Failed', () => {
		it('should be used for startup connectivity verification failures', () => {
			// This test verifies the error code constant exists and has the correct value
			expect(SUPABASE_ERROR_CODES.STARTUP_VERIFICATION_FAILED).toBe('SUP-004')
		})

		// Note: SUP-004 is used in the module initialization (supabase.module.ts)
		// when VERIFY_DB_ON_STARTUP=true and connection fails
		// Integration tests for this are in task 3.1
	})

	describe('SUP-005: Health Check Failed', () => {
		it('should return SUP-005 when table ping fails', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest
					.fn()
					.mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest
					.fn()
					.mockReturnValue('test-publishable-key'),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			}

			const service = new SupabaseService(
				mockAdminClient,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					mockAdminClient,
					mockAppLogger,
					mockAppConfigService as unknown as AppConfigService
				)
			)

			// Mock RPC not available
			mockAdminClient.rpc = jest
				.fn()
				.mockRejectedValue(new Error('RPC not available'))

			// Mock table ping failure
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

			expect(result.status).toBe('unhealthy')
			expect(result.message).toBe('Connection refused')

			// Verify error logging includes SUP-005 code
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					errorCode: 'SUP-005',
					table: 'users'
				}),
				expect.stringContaining('[SUP-005]')
			)
		})

		it('should return SUP-005 when health check throws unexpected error', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest
					.fn()
					.mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest
					.fn()
					.mockReturnValue('test-publishable-key'),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			}

			const service = new SupabaseService(
				mockAdminClient,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					mockAdminClient,
					mockAppLogger,
					mockAppConfigService as unknown as AppConfigService
				)
			)

			// Mock RPC throwing
			mockAdminClient.rpc = jest
				.fn()
				.mockRejectedValue(new Error('Unexpected error'))

			// Mock table ping throwing
			mockAdminClient.from = jest.fn().mockImplementation(() => {
				throw new Error('Critical database error')
			})

			const result = await service.checkConnection()

			expect(result.status).toBe('unhealthy')
			expect(result.message).toBe('Critical database error')

			// Verify error logging includes SUP-005 code
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					errorCode: 'SUP-005',
					error: 'Critical database error'
				}),
				expect.stringContaining('[SUP-005]')
			)
		})

		it('should include error context in SUP-005 logs', async () => {
			const mockAppConfigService = {
				getSupabaseProjectRef: jest.fn().mockReturnValue('test-project'),
				getSupabaseUrl: jest
					.fn()
					.mockReturnValue('https://test-project.supabase.co'),
				getSupabasePublishableKey: jest
					.fn()
					.mockReturnValue('test-publishable-key'),
				getSupabaseSecretKey: jest.fn().mockReturnValue('sb-secret-test-key')
			}

			const service = new SupabaseService(
				mockAdminClient,
				mockAppLogger,
				mockAppConfigService,
				mockRpcService,
				mockInstrumentation,
				new SupabaseHealthService(
					mockAdminClient,
					mockAppLogger,
					mockAppConfigService as unknown as AppConfigService
				)
			)

			// Mock RPC not available
			mockAdminClient.rpc = jest
				.fn()
				.mockRejectedValue(new Error('RPC not available'))

			// Mock table ping failure with detailed error
			const detailedError = {
				message: 'Database connection timeout',
				code: 'PGRST301',
				details: 'Connection pool exhausted',
				hint: 'Increase max_connections'
			}
			mockAdminClient.from = jest.fn().mockReturnValue({
				select: jest.fn().mockResolvedValue({
					error: detailedError
				})
			})

			await service.checkConnection()

			// Verify error context includes table name and error code
			expect(mockAppLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					errorCode: 'SUP-005',
					table: 'users',
					error: expect.stringContaining('Database connection timeout')
				}),
				'[SUP-005] Supabase table ping failed'
			)
		})
	})

	describe('Error Code Constants', () => {
		it('should have all required error codes defined', () => {
			expect(SUPABASE_ERROR_CODES.ADMIN_CLIENT_UNAVAILABLE).toBe('SUP-001')
			expect(SUPABASE_ERROR_CODES.USER_CLIENT_UNAVAILABLE).toBe('SUP-002')
			expect(SUPABASE_ERROR_CODES.CONFIG_VALIDATION_FAILED).toBe('SUP-003')
			expect(SUPABASE_ERROR_CODES.STARTUP_VERIFICATION_FAILED).toBe('SUP-004')
			expect(SUPABASE_ERROR_CODES.HEALTH_CHECK_FAILED).toBe('SUP-005')
		})

		it('should have unique error codes', () => {
			const codes = Object.values(SUPABASE_ERROR_CODES)
			const uniqueCodes = new Set(codes)
			expect(codes.length).toBe(uniqueCodes.size)
		})

		it('should follow SUP-XXX naming convention', () => {
			const codes = Object.values(SUPABASE_ERROR_CODES)
			codes.forEach(code => {
				expect(code).toMatch(/^SUP-\d{3}$/)
			})
		})
	})
})
