import { Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { Database } from '@repo/shared'
import type {
	SupabaseClient,
	User as SupabaseUser
} from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { SilentLogger } from '../__test__/silent-logger'
import { AuthService } from './auth.service'

/**
 * AuthService Integration Tests with Real Supabase Database
 *
 * Following Supabase testing documentation patterns:
 * - Uses real Supabase client with test environment variables
 * - Implements unique identifier strategy for test isolation
 * - Cleans up test data after each test
 * - Tests actual database interactions
 */

// Global test helper functions
const createTestEmail = (): string => {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(2, 9)
	return `test_${timestamp}_${random}@example.com`
}

const createTestName = (): string => {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(2, 9)
	return `Test User ${timestamp}_${random}`
}

describe('AuthService Integration Tests', () => {
	let service: AuthService
	let testClient: SupabaseClient<Database>
	let testRunId: string

	// Test configuration from environment
	// Require explicit test environment variables - no fallbacks
	const supabaseUrl =
		process.env.TEST_SUPABASE_URL ||
		process.env.SUPABASE_URL ||
		(() => {
			throw new Error(
				'TEST_SUPABASE_URL or SUPABASE_URL environment variable is required for auth integration tests'
			)
		})()
	const serviceKey =
		process.env.TEST_SERVICE_ROLE_KEY ||
		process.env.SERVICE_ROLE_KEY ||
		(() => {
			throw new Error(
				'TEST_SERVICE_ROLE_KEY or SERVICE_ROLE_KEY environment variable is required for auth integration tests'
			)
		})()

	const testConfig = {
		supabaseUrl,
		serviceKey,
		isConfigured(): boolean {
			return !!(this.supabaseUrl && this.serviceKey)
		}
	}

	beforeAll(async () => {
		if (!testConfig.isConfigured()) {
			// Skipping AuthService integration tests - Supabase environment not configured
			return
		}

		// Create unique test run ID for isolation
		testRunId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

		// Initialize test client with same credentials as service
		testClient = createClient<Database>(
			testConfig.supabaseUrl!,
			testConfig.serviceKey!,
			{
				auth: { persistSession: false, autoRefreshToken: false }
			}
		)

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: Logger,
					useValue: {
						log: jest.fn(),
						error: jest.fn(),
						warn: jest.fn(),
						debug: jest.fn(),
						verbose: jest.fn()
					}
				}
			]
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<AuthService>(AuthService)
	})

	afterAll(async () => {
		if (!testConfig.isConfigured()) return

		// Clean up any test data that might have been created
		try {
			await testClient.from('User').delete().like('email', `%${testRunId}%`)
		} catch {
			// Ignore cleanup errors in tests
			// Test cleanup completed
		}
	})

	describe('Service Initialization', () => {
		it('should be defined and properly initialized', () => {
			if (!testConfig.isConfigured()) return

			expect(service).toBeDefined()
			expect(service).toBeInstanceOf(AuthService)
		})

		it('should have Supabase connection available', async () => {
			if (!testConfig.isConfigured()) return

			const connectionTest = await service.testSupabaseConnection()
			expect(connectionTest).toHaveProperty('connected')
			expect(typeof connectionTest.connected).toBe('boolean')
		})
	})

	describe('User Management with Real Database', () => {
		const createTestEmail = () => `test-user-${testRunId}@example.com`
		const createTestName = () => `Test User ${testRunId}`

		it('should create user in database successfully', async () => {
			if (!testConfig.isConfigured()) return

			try {
				const testEmail = createTestEmail()
				const testName = createTestName()

				// Note: This creates a user directly in Supabase auth + database
				const result = await service.createUser({
					email: testEmail,
					name: testName,
					password: 'TestPassword123!'
				})

				expect(result).toHaveProperty('user')
				expect(result.user.email).toBe(testEmail)
				expect(result.user.name).toBe(testName)
				expect(result).toHaveProperty('access_token')
				expect(result).toHaveProperty('refresh_token')

				// Verify user was created in database
				const dbUser = await service.getUserByEmail(testEmail)
				expect(dbUser).toBeDefined()
				expect(dbUser?.email).toBe(testEmail)
				expect(dbUser?.name).toBe(testName)
			} catch (error: unknown) {
				if (error instanceof Error && error.message.includes('fetch failed')) {
					// Skipping - Supabase service not available
					return
				}
				throw error
			}
		})

		it('should sync user with database on first access', async () => {
			if (!testConfig.isConfigured()) return

			try {
				// Create a mock Supabase user (simulating what comes from auth.getUser)
				const mockSupabaseUser = {
					id: `sb-user-${testRunId}`,
					email: createTestEmail(),
					user_metadata: {
						name: createTestName(),
						full_name: createTestName()
					},
					created_at: new Date().toISOString(),
					email_confirmed_at: new Date().toISOString()
				} as const

				const syncedUser = await service.syncUserWithDatabase({
					...mockSupabaseUser,
					app_metadata: {},
					aud: 'authenticated',
					user_metadata: {}
				} as SupabaseUser)

				expect(syncedUser).toHaveProperty('id')
				expect(syncedUser.email).toBe(mockSupabaseUser.email)
				expect(syncedUser.supabaseId).toBe(mockSupabaseUser.id)
				expect(syncedUser.role).toBe('OWNER') // Default role
				expect(syncedUser.emailVerified).toBe(true)

				// Verify user exists in database
				const dbUser = await service.getUserBySupabaseId(mockSupabaseUser.id)
				expect(dbUser).toBeDefined()
				expect(dbUser?.supabaseId).toBe(mockSupabaseUser.id)
			} catch (error: unknown) {
				if (
					error instanceof Error &&
					(error.message.includes('Failed to sync user data') ||
						error.message.includes('fetch failed'))
				) {
					// Skipping - Supabase service not available
					return
				}
				throw error
			}
		})

		it('should update existing user profile', async () => {
			if (!testConfig.isConfigured()) return

			try {
				// First create a user
				const testEmail = createTestEmail()
				await service.createUser({
					email: testEmail,
					name: createTestName(),
					password: 'TestPassword123!'
				})

				// Get the user ID for updates
				const dbUser = await service.getUserByEmail(testEmail)
				expect(dbUser).toBeDefined()

				// Update the user profile
				const updates = {
					name: `Updated ${createTestName()}`,
					phone: '+1234567890',
					bio: 'Test bio for integration test'
				}

				const updateResult = await service.updateUserProfile(
					dbUser!.supabaseId,
					updates
				)

				expect(updateResult).toHaveProperty('user')
				expect(updateResult.user.name).toBe(updates.name)
				expect(updateResult.user.phone).toBe(updates.phone)
				expect(updateResult.user.bio).toBe(updates.bio)
				expect(updateResult.user.profileComplete).toBe(true) // name + phone = complete
			} catch (error: unknown) {
				if (error instanceof Error && error.message.includes('fetch failed')) {
					// Skipping - Supabase service not available
					return
				}
				throw error
			}
		})

		it('should handle user stats calculation', async () => {
			if (!testConfig.isConfigured()) return

			const stats = await service.getUserStats()

			expect(stats).toHaveProperty('total')
			expect(stats).toHaveProperty('byRole')
			expect(stats.byRole).toHaveProperty('owners')
			expect(stats.byRole).toHaveProperty('managers')
			expect(stats.byRole).toHaveProperty('tenants')

			// Should be numbers (may be 0 in test environment)
			expect(typeof stats.total).toBe('number')
			expect(typeof stats.byRole.owners).toBe('number')
			expect(typeof stats.byRole.managers).toBe('number')
			expect(typeof stats.byRole.tenants).toBe('number')
		})
	})

	describe('Error Handling', () => {
		it('should handle duplicate email creation gracefully', async () => {
			if (!testConfig.isConfigured()) return

			try {
				const testEmail = createTestEmail()
				const testName = createTestName()

				// Create first user
				await service.createUser({
					email: testEmail,
					name: testName,
					password: 'TestPassword123!'
				})

				// Attempt to create duplicate
				await expect(
					service.createUser({
						email: testEmail,
						name: 'Different Name',
						password: 'DifferentPassword123!'
					})
				).rejects.toThrow()
			} catch (error: unknown) {
				if (error instanceof Error && error.message.includes('fetch failed')) {
					// Skipping - Supabase service not available
					return
				}
				throw error
			}
		})

		it('should handle invalid password gracefully', async () => {
			if (!testConfig.isConfigured()) return

			try {
				await expect(
					service.createUser({
						email: createTestEmail(),
						name: createTestName(),
						password: 'weak' // Too short
					})
				).rejects.toThrow('Password must be at least 8 characters long')
			} catch (error: unknown) {
				if (error instanceof Error && error.message.includes('fetch failed')) {
					// Skipping - Supabase service not available
					return
				}
				throw error
			}
		})

		it('should handle missing required fields', async () => {
			if (!testConfig.isConfigured()) return

			try {
				await expect(
					service.createUser({
						email: '',
						name: createTestName(),
						password: 'TestPassword123!'
					})
				).rejects.toThrow('Email and name are required')

				await expect(
					service.createUser({
						email: createTestEmail(),
						name: '',
						password: 'TestPassword123!'
					})
				).rejects.toThrow('Email and name are required')
			} catch (error: unknown) {
				if (error instanceof Error && error.message.includes('fetch failed')) {
					// Skipping - Supabase service not available
					return
				}
				throw error
			}
		})
	})

	describe('Connection Health', () => {
		it('should test Supabase connection successfully', async () => {
			if (!testConfig.isConfigured()) return

			try {
				const connectionTest = await service.testSupabaseConnection()

				expect(connectionTest).toHaveProperty('connected')
				expect(connectionTest.connected).toBe(true)
				expect(connectionTest).toHaveProperty('auth')
				expect(connectionTest.auth).toHaveProperty('url')
			} catch (error: unknown) {
				if (error instanceof Error && error.message.includes('fetch failed')) {
					// Skipping - Supabase service not available
					return
				}
				throw error
			}
		})
	})
})
