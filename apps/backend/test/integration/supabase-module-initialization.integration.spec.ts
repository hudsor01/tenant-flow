/**
 * Integration Tests for Supabase Module Initialization
 *
 * These tests verify that the SupabaseModule correctly validates configuration
 * and handles startup connectivity verification.
 *
 * Run with: RUN_INTEGRATION_TESTS=true doppler run -- pnpm --filter @repo/backend exec jest supabase-module-initialization.integration.spec.ts
 */

import { Test, type TestingModule } from '@nestjs/testing'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SupabaseModule } from '../../src/database/supabase.module'
import { SupabaseService } from '../../src/database/supabase.service'
import { AppLogger } from '../../src/logger/app-logger.service'
import { AppConfigService } from '../../src/config/app-config.service'
import { validate } from '../../src/config/config.schema'
import { SUPABASE_ADMIN_CLIENT } from '../../src/database/supabase.constants'

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

// Test configuration module that provides AppConfigService globally
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

describeIf('SupabaseModule Initialization Integration', () => {
	let originalEnv: NodeJS.ProcessEnv
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

		// Other required config variables (minimal values for testing)
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

	beforeAll(() => {
		// Save original environment
		originalEnv = { ...process.env }
	})

	afterEach(() => {
		// Restore original environment after each test
		process.env = { ...originalEnv }
	})

	describe('successful initialization with valid configuration', () => {
		it('should initialize successfully with valid Supabase credentials', async () => {
			// Set all required environment variables
			setMinimalRequiredEnv()
			process.env.VERIFY_DB_ON_STARTUP = 'false' // Skip actual DB connection

			const module: TestingModule = await Test.createTestingModule({
				imports: [
					ConfigModule.forRoot({
						isGlobal: true,
						validate,
						ignoreEnvFile: true, // Use process.env directly
						cache: true
					}),
					TestConfigModule,
					SupabaseModule.forRootAsync()
				],
				providers: [
					{
						provide: AppLogger,
						useClass: MockLogger
					}
				]
			}).compile()

			const supabaseService = module.get<SupabaseService>(SupabaseService)
			const adminClient = module.get(SUPABASE_ADMIN_CLIENT)

			expect(supabaseService).toBeDefined()
			expect(adminClient).toBeDefined()

			// Verify admin client is functional
			const client = supabaseService.getAdminClient()
			expect(client).toBeDefined()

			await module.close()
		})
	})

	describe('failure with missing SUPABASE_URL environment variable', () => {
		it('should fail with clear error message when SUPABASE_URL is missing', async () => {
			// Set all required vars except SUPABASE_URL
			delete process.env.SUPABASE_URL
			delete process.env.NEXT_PUBLIC_SUPABASE_URL
			process.env.SUPABASE_SERVICE_ROLE_KEY = validSecretKey
			process.env.PROJECT_REF = validProjectRef
			process.env.SUPABASE_PUBLISHABLE_KEY = validPublishableKey

			await expect(async () => {
				await Test.createTestingModule({
					imports: [
						ConfigModule.forRoot({
							isGlobal: true,
							validate,
							ignoreEnvFile: true
						}),
						TestConfigModule,
						SupabaseModule.forRootAsync()
					],
					providers: [
						{
							provide: AppLogger,
							useClass: MockLogger
						}
					]
				}).compile()
			}).rejects.toThrow(/SUPABASE_URL/)
		})
	})

	describe('failure with missing SUPABASE_SERVICE_ROLE_KEY environment variable', () => {
		it('should fail with clear error message when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
			// Set all required vars except SUPABASE_SERVICE_ROLE_KEY
			process.env.SUPABASE_URL = validSupabaseUrl
			delete process.env.SUPABASE_SERVICE_ROLE_KEY
			process.env.PROJECT_REF = validProjectRef
			process.env.SUPABASE_PUBLISHABLE_KEY = validPublishableKey

			await expect(async () => {
				await Test.createTestingModule({
					imports: [
						ConfigModule.forRoot({
							isGlobal: true,
							validate,
							ignoreEnvFile: true
						}),
						TestConfigModule,
						SupabaseModule.forRootAsync()
					],
					providers: [
						{
							provide: AppLogger,
							useClass: MockLogger
						}
					]
				}).compile()
			}).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
		})
	})

	describe('failure with invalid key format in SUPABASE_SERVICE_ROLE_KEY', () => {
		it('should fail when SUPABASE_SERVICE_ROLE_KEY has invalid format', async () => {
			// Set invalid key format (neither sb_secret_ nor eyJ)
			process.env.SUPABASE_URL = validSupabaseUrl
			process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid_key_format_12345'
			process.env.PROJECT_REF = validProjectRef
			process.env.SUPABASE_PUBLISHABLE_KEY = validPublishableKey

			await expect(async () => {
				await Test.createTestingModule({
					imports: [
						ConfigModule.forRoot({
							isGlobal: true,
							validate,
							ignoreEnvFile: true
						}),
						TestConfigModule,
						SupabaseModule.forRootAsync()
					],
					providers: [
						{
							provide: AppLogger,
							useClass: MockLogger
						}
					]
				}).compile()
			}).rejects.toThrow(/Service role key must be either a secret key/)
		})
	})

	describe('warning with mismatched project ref', () => {
		it('should log warning when PROJECT_REF does not match SUPABASE_URL', async () => {
			// Set all required env vars with mismatched project ref
			setMinimalRequiredEnv()
			process.env.PROJECT_REF = 'wrongprojectref123'
			process.env.VERIFY_DB_ON_STARTUP = 'false' // Skip DB connection to test validation only

			const module: TestingModule = await Test.createTestingModule({
				imports: [
					ConfigModule.forRoot({
						isGlobal: true,
						validate,
						ignoreEnvFile: true
					}),
					TestConfigModule,
					SupabaseModule.forRootAsync()
				],
				providers: [
					{
						provide: AppLogger,
						useClass: MockLogger
					}
				]
			}).compile()

			const logger = module.get<MockLogger>(AppLogger)

			// Should initialize successfully but log a warning
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('PROJECT_REF')
			)
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('wrongprojectref123')
			)

			await module.close()
		})
	})

	describe('startup verification can be disabled with VERIFY_DB_ON_STARTUP=false', () => {
		it('should skip connectivity verification when VERIFY_DB_ON_STARTUP=false', async () => {
			// Set all required env vars and disable startup verification
			setMinimalRequiredEnv()
			process.env.VERIFY_DB_ON_STARTUP = 'false'

			const module: TestingModule = await Test.createTestingModule({
				imports: [
					ConfigModule.forRoot({
						isGlobal: true,
						validate,
						ignoreEnvFile: true
					}),
					TestConfigModule,
					SupabaseModule.forRootAsync()
				],
				providers: [
					{
						provide: AppLogger,
						useClass: MockLogger
					}
				]
			}).compile()

			const supabaseService = module.get<SupabaseService>(SupabaseService)
			expect(supabaseService).toBeDefined()

			// Module should initialize even if database is unreachable
			// (because verification is disabled)

			await module.close()
		})
	})
})
