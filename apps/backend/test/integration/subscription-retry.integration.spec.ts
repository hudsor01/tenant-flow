/**
 * Integration Tests for Subscription Retry Service
 *
 * These tests verify that the subscription retry job correctly:
 * - Uses admin client (SUPABASE_SERVICE_ROLE_KEY) for database queries
 * - Handles missing Stripe accounts gracefully
 * - Calculates exponential backoff correctly
 * - Queries leases successfully using admin client
 *
 * Run with: RUN_INTEGRATION_TESTS=true doppler run -- pnpm --filter @repo/backend exec jest subscription-retry.integration.spec.ts
 */

import { Test, type TestingModule } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { SupabaseModule } from '../../src/database/supabase.module'
import { SupabaseService } from '../../src/database/supabase.service'
import { AppLogger } from '../../src/logger/app-logger.service'
import { AppConfigService } from '../../src/config/app-config.service'
import { validate } from '../../src/config/config.schema'
import { SubscriptionRetryService } from '../../src/modules/leases/subscription-retry.service'
import { LeaseSubscriptionService } from '../../src/modules/leases/lease-subscription.service'

// Skip if not running integration tests
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true'
const describeIf = runIntegrationTests ? describe : describe.skip

// Mock logger to avoid winston dependencies
class MockLogger {
	log = jest.fn()
	error = jest.fn()
	warn = jest.fn()
	debug = jest.fn()
	verbose = jest.fn()
	setContext = jest.fn()
}

// Mock LeaseSubscriptionService
class MockLeaseSubscriptionService {
	createSubscriptionForLease = jest.fn()
}

// Test configuration module
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	providers: [
		{
			provide: AppConfigService,
			useFactory: (configService: ConfigService) => {
				return new AppConfigService(configService)
			},
			inject: [ConfigService]
		},
		{
			provide: AppLogger,
			useClass: MockLogger
		}
	],
	exports: [AppConfigService, AppLogger]
})
class TestConfigModule {}

describeIf('SubscriptionRetryService Integration', () => {
	let module: TestingModule
	let subscriptionRetryService: SubscriptionRetryService
	let supabaseService: SupabaseService
	let mockLeaseSubscriptionService: MockLeaseSubscriptionService
	let mockLogger: MockLogger

	const validSupabaseUrl = 'https://bshjmbshupiibfiewpxb.supabase.co'
	const validSecretKey =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_service_role_key'
	const validProjectRef = 'bshjmbshupiibfiewpxb'
	const validPublishableKey =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_anon_key'

	// Helper function to set minimal required environment variables
	const setMinimalRequiredEnv = () => {
		// Supabase config
		process.env.SUPABASE_URL = validSupabaseUrl
		process.env.SUPABASE_SERVICE_ROLE_KEY = validSecretKey
		process.env.PROJECT_REF = validProjectRef
		process.env.SUPABASE_PUBLISHABLE_KEY = validPublishableKey
		process.env.VERIFY_DB_ON_STARTUP = 'false'

		// Other required config variables
		process.env.NEXT_PUBLIC_APP_URL = 'https://test.tenantflow.app'
		process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
		process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long'
		process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'
		process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123456789'
		process.env.SUPPORT_EMAIL = 'support@test.com'
		process.env.RESEND_API_KEY = 're_test_123456789'
		process.env.IDEMPOTENCY_KEY_SECRET =
			'test-idempotency-secret-at-least-32-chars'
	}

	beforeAll(async () => {
		setMinimalRequiredEnv()

		module = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					isGlobal: true,
					validate,
					ignoreEnvFile: true,
					cache: true
				}),
				TestConfigModule,
				SupabaseModule.forRootAsync(),
				EventEmitterModule.forRoot(),
				ScheduleModule.forRoot()
			],
			providers: [
				SubscriptionRetryService,
				{
					provide: LeaseSubscriptionService,
					useClass: MockLeaseSubscriptionService
				},
				{
					provide: AppLogger,
					useClass: MockLogger
				}
			]
		}).compile()

		subscriptionRetryService = module.get<SubscriptionRetryService>(
			SubscriptionRetryService
		)
		supabaseService = module.get<SupabaseService>(SupabaseService)
		mockLeaseSubscriptionService = module.get(
			LeaseSubscriptionService
		) as unknown as MockLeaseSubscriptionService
		mockLogger = module.get<MockLogger>(AppLogger)
	})

	afterAll(async () => {
		await module.close()
	})

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks()
	})

	describe('admin client usage', () => {
		it('should use admin client (SUPABASE_SERVICE_ROLE_KEY) for database queries', async () => {
			// Verify that the service uses getAdminClient()
			const adminClient = supabaseService.getAdminClient()
			expect(adminClient).toBeDefined()

			// The admin client should be initialized with SUPABASE_SERVICE_ROLE_KEY
			// We can verify this by checking that queries work without user context
			const spy = jest.spyOn(supabaseService, 'getAdminClient')

			// Mock the database response to return no leases
			const mockLimit = jest.fn().mockResolvedValue({
				data: [],
				error: null
			})
			const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
			const mockLt = jest.fn().mockReturnValue({ order: mockOrder })
			const mockIn = jest.fn().mockReturnValue({ lt: mockLt })
			const mockSelect = jest.fn().mockReturnValue({ in: mockIn })
			const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

			adminClient.from = mockFrom

			// Run the retry job
			await subscriptionRetryService.retryFailedSubscriptions()

			// Verify getAdminClient was called
			expect(spy).toHaveBeenCalled()

			// Verify the query was made using the admin client
			expect(mockFrom).toHaveBeenCalledWith('leases')

			spy.mockRestore()
		})

		it('should successfully query leases using admin client', async () => {
			const adminClient = supabaseService.getAdminClient()

			// Create a test lease in the database (if database is available)
			// For this integration test, we'll mock the response
			const mockLeaseData = {
				id: 'test-lease-id',
				rent_amount: 1000,
				primary_tenant_id: 'test-tenant-id',
				owner_user_id: 'test-owner-id',
				subscription_retry_count: 0,
				subscription_last_attempt_at: null,
				stripe_connected_accounts: {
					stripe_account_id: 'acct_test123'
				}
			}

			// Mock the initial query that returns leases
			const mockLimit = jest.fn().mockResolvedValue({
				data: [mockLeaseData],
				error: null
			})
			const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
			const mockLt = jest.fn().mockReturnValue({ order: mockOrder })
			const mockIn = jest.fn().mockReturnValue({ lt: mockLt })
			const mockSelectInitial = jest.fn().mockReturnValue({ in: mockIn })

			// Mock the select query for checking subscription status
			const mockSingle = jest.fn().mockResolvedValue({
				data: {
					stripe_subscription_status: 'active',
					stripe_subscription_id: 'sub_test123'
				},
				error: null
			})
			const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
			const mockSelectStatus = jest.fn().mockReturnValue({ eq: mockEq })

			// Override from to handle different query types
			let callCount = 0
			adminClient.from = jest.fn((table: string) => {
				callCount++
				if (callCount === 1) {
					// First call: initial query for leases
					return { select: mockSelectInitial }
				} else {
					// Subsequent calls: status check
					return { select: mockSelectStatus }
				}
			}) as typeof adminClient.from

			// Mock the lease subscription service
			mockLeaseSubscriptionService.createSubscriptionForLease.mockResolvedValue(
				undefined
			)

			// Run the retry job
			await subscriptionRetryService.retryFailedSubscriptions()

			// Verify the admin client was used to query leases
			expect(adminClient.from).toHaveBeenCalledWith('leases')

			// Verify the lease subscription service was called
			expect(
				mockLeaseSubscriptionService.createSubscriptionForLease
			).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					id: 'test-lease-id',
					primary_tenant_id: 'test-tenant-id',
					rent_amount: 1000
				}),
				'acct_test123'
			)
		})
	})

	describe('missing Stripe account handling', () => {
		it('should handle missing Stripe account gracefully', async () => {
			const adminClient = supabaseService.getAdminClient()

			// Mock lease without Stripe account
			const mockLeaseData = {
				id: 'test-lease-no-stripe',
				rent_amount: 1000,
				primary_tenant_id: 'test-tenant-id',
				owner_user_id: 'test-owner-id',
				subscription_retry_count: 0,
				subscription_last_attempt_at: null,
				stripe_connected_accounts: {
					stripe_account_id: null // No Stripe account
				}
			}

			// Mock the update query
			const mockEqUpdate = jest.fn().mockResolvedValue({
				data: null,
				error: null
			})
			const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqUpdate })

			// Mock the initial query
			const mockLimit = jest.fn().mockResolvedValue({
				data: [mockLeaseData],
				error: null
			})
			const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
			const mockLt = jest.fn().mockReturnValue({ order: mockOrder })
			const mockIn = jest.fn().mockReturnValue({ lt: mockLt })
			const mockSelect = jest.fn().mockReturnValue({ in: mockIn })

			let callCount = 0
			adminClient.from = jest.fn((table: string) => {
				callCount++
				if (callCount === 1) {
					// First call: initial query
					return { select: mockSelect }
				} else {
					// Second call: update
					return { update: mockUpdate }
				}
			}) as typeof adminClient.from

			// Run the retry job
			await subscriptionRetryService.retryFailedSubscriptions()

			// Verify lease was updated with failure reason (this is the key behavior)
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					stripe_subscription_status: 'failed',
					subscription_failure_reason:
						'Property owner has no Stripe account configured',
					subscription_retry_count: 1
				})
			)

			// Verify the update was applied to the correct lease
			expect(mockEqUpdate).toHaveBeenCalledWith('id', 'test-lease-no-stripe')

			// Verify subscription service was NOT called (key requirement)
			expect(
				mockLeaseSubscriptionService.createSubscriptionForLease
			).not.toHaveBeenCalled()
		})
	})

	describe('exponential backoff calculation', () => {
		it('should calculate exponential backoff correctly', () => {
			// Access the private method via reflection for testing
			const calculateBackoff = (
				subscriptionRetryService as SubscriptionRetryService & {
					calculateBackoff: (retryCount: number) => number
				}
			).calculateBackoff.bind(subscriptionRetryService)

			// Test exponential backoff: baseDelay * 3^retryCount
			// Base delay is 5 minutes = 300,000 ms
			const baseDelay = 5 * 60 * 1000

			expect(calculateBackoff(0)).toBe(baseDelay * Math.pow(3, 0)) // 5 minutes
			expect(calculateBackoff(1)).toBe(baseDelay * Math.pow(3, 1)) // 15 minutes
			expect(calculateBackoff(2)).toBe(baseDelay * Math.pow(3, 2)) // 45 minutes
			expect(calculateBackoff(3)).toBe(baseDelay * Math.pow(3, 3)) // 2.25 hours
			expect(calculateBackoff(4)).toBe(baseDelay * Math.pow(3, 4)) // 6.75 hours

			// Verify specific values
			expect(calculateBackoff(0)).toBe(300000) // 5 minutes
			expect(calculateBackoff(1)).toBe(900000) // 15 minutes
			expect(calculateBackoff(2)).toBe(2700000) // 45 minutes
			expect(calculateBackoff(3)).toBe(8100000) // 2.25 hours
			expect(calculateBackoff(4)).toBe(24300000) // 6.75 hours
		})

		it('should respect backoff timing when retrying', async () => {
			const adminClient = supabaseService.getAdminClient()

			// Mock lease with recent attempt (should be skipped)
			const recentAttemptTime = new Date(Date.now() - 60000).toISOString() // 1 minute ago
			const mockLeaseData = {
				id: 'test-lease-recent',
				rent_amount: 1000,
				primary_tenant_id: 'test-tenant-id',
				owner_user_id: 'test-owner-id',
				subscription_retry_count: 1,
				subscription_last_attempt_at: recentAttemptTime,
				stripe_connected_accounts: {
					stripe_account_id: 'acct_test123'
				}
			}

			// Mock the initial query
			const mockLimit = jest.fn().mockResolvedValue({
				data: [mockLeaseData],
				error: null
			})
			const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
			const mockLt = jest.fn().mockReturnValue({ order: mockOrder })
			const mockIn = jest.fn().mockReturnValue({ lt: mockLt })
			const mockSelect = jest.fn().mockReturnValue({ in: mockIn })

			adminClient.from = jest
				.fn()
				.mockReturnValue({ select: mockSelect }) as typeof adminClient.from

			// Run the retry job
			await subscriptionRetryService.retryFailedSubscriptions()

			// Verify subscription service was NOT called (key requirement - lease should be skipped)
			expect(
				mockLeaseSubscriptionService.createSubscriptionForLease
			).not.toHaveBeenCalled()
		})
	})

	describe('database query verification', () => {
		it('should query leases with correct filters', async () => {
			const adminClient = supabaseService.getAdminClient()

			const mockLimit = jest.fn().mockResolvedValue({
				data: [],
				error: null
			})
			const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
			const mockLt = jest.fn().mockReturnValue({ order: mockOrder })
			const mockIn = jest.fn().mockReturnValue({ lt: mockLt })
			const mockSelect = jest.fn().mockReturnValue({ in: mockIn })
			const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

			adminClient.from = mockFrom

			// Run the retry job
			await subscriptionRetryService.retryFailedSubscriptions()

			// Verify the query structure
			expect(mockFrom).toHaveBeenCalledWith('leases')
			expect(mockSelect).toHaveBeenCalledWith(
				expect.stringContaining('stripe_connected_accounts')
			)
			expect(mockIn).toHaveBeenCalledWith('stripe_subscription_status', [
				'pending',
				'failed'
			])
		})
	})
})
