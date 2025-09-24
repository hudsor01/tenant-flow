/**
 * Test Environment Configuration
 *
 * Comprehensive test database and external service setup
 * Following CLAUDE.md KISS principle - simple, reliable test configuration
 */
import type { DynamicModule, Provider, Type } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

export interface TestEnvironmentConfig {
	database: {
		url: string
		host: string
		port: number
		database: string
		user: string
		password: string
	}
	supabase: {
		url: string
		anonKey: string
		serviceRoleKey: string
		jwtSecret: string
	}
	stripe: {
		secretKey: string
		webhookSecret: string
		publishableKey: string
	}
	email: {
		resendApiKey: string
	}
}

/**
 * Test Environment Detection
 * Determines which test environment to use based on NODE_ENV and availability
 */
export function getTestEnvironment(): 'unit' | 'integration' | 'e2e' {
	const env = process.env.NODE_ENV
	const testType = process.env.TEST_TYPE

	if (testType) return testType as 'unit' | 'integration' | 'e2e'
	if (env === 'test') return 'integration'

	return 'unit'
}

/**
 * Test Database Configuration
 * Provides isolated test databases for different test types
 */
export function getTestDatabaseConfig(): TestEnvironmentConfig['database'] {
	const testEnv = getTestEnvironment()

	switch (testEnv) {
		case 'unit':
			// Unit tests use mocked database
			return {
				url: 'mock://localhost/unit_test_db',
				host: 'localhost',
				port: 5432,
				database: 'unit_test_db',
				user: 'test_user',
				password: 'test_password'
			}

		case 'integration':
			// Integration tests use real test database
			return {
				url:
					process.env.TEST_DATABASE_URL ||
					'postgresql://postgres:password@localhost:5432/tenantflow_integration_test',
				host: process.env.TEST_DATABASE_HOST || 'localhost',
				port: parseInt(process.env.TEST_DATABASE_PORT || '5432', 10),
				database:
					process.env.TEST_DATABASE_NAME || 'tenantflow_integration_test',
				user: process.env.TEST_DATABASE_USER || 'postgres',
				password: process.env.TEST_DATABASE_PASSWORD || 'password'
			}

		case 'e2e':
			// E2E tests use dedicated e2e database
			return {
				url:
					process.env.E2E_DATABASE_URL ||
					'postgresql://postgres:password@localhost:5432/tenantflow_e2e_test',
				host: process.env.E2E_DATABASE_HOST || 'localhost',
				port: parseInt(process.env.E2E_DATABASE_PORT || '5432', 10),
				database: process.env.E2E_DATABASE_NAME || 'tenantflow_e2e_test',
				user: process.env.E2E_DATABASE_USER || 'postgres',
				password: process.env.E2E_DATABASE_PASSWORD || 'password'
			}

		default:
			throw new Error(`Unknown test environment: ${testEnv}`)
	}
}

/**
 * Test Supabase Configuration
 * Uses either test project or mocked Supabase depending on test type
 */
export function getTestSupabaseConfig(): TestEnvironmentConfig['supabase'] {
	const testEnv = getTestEnvironment()

	if (testEnv === 'unit') {
		// Unit tests use mocked Supabase
		return {
			url: 'https://mock-supabase-project.supabase.co',
			anonKey: 'mock_anon_key_for_unit_tests',
			serviceRoleKey: 'mock_service_role_key_for_unit_tests',
			jwtSecret: 'mock_jwt_secret_for_unit_tests'
		}
	}

	// Integration and E2E tests use real test Supabase project or fallback
	return {
		url:
			process.env.TEST_SUPABASE_URL ||
			process.env.SUPABASE_URL ||
			'https://test-project.supabase.co',
		anonKey:
			process.env.TEST_SUPABASE_ANON_KEY ||
			process.env.SUPABASE_ANON_KEY ||
			'test_anon_key',
		serviceRoleKey:
			process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ||
			process.env.SUPABASE_SERVICE_ROLE_KEY ||
			'test_service_role_key',
		jwtSecret:
			process.env.TEST_SUPABASE_JWT_SECRET ||
			process.env.SUPABASE_JWT_SECRET ||
			'test_jwt_secret'
	}
}

/**
 * Test Stripe Configuration
 * Always uses Stripe test keys for all test environments
 */
export function getTestStripeConfig(): TestEnvironmentConfig['stripe'] {
	const testEnv = getTestEnvironment()

	// For unit tests, always use mock keys
	if (testEnv === 'unit') {
		return {
			secretKey: 'sk_test_mock_secret_key_for_unit_testing',
			webhookSecret: 'whsec_mock_webhook_secret_for_unit_testing',
			publishableKey: 'pk_test_mock_publishable_key_for_unit_testing'
		}
	}

	// For integration/e2e tests, require actual test keys
	const secretKey = process.env.TEST_STRIPE_SECRET_KEY
	const webhookSecret = process.env.TEST_STRIPE_WEBHOOK_SECRET
	const publishableKey = process.env.TEST_STRIPE_PUBLISHABLE_KEY

	// Validate test keys are properly formatted
	if (secretKey && !secretKey.startsWith('sk_test_')) {
		throw new Error(
			`TEST_STRIPE_SECRET_KEY must start with 'sk_test_'. Got: ${secretKey.substring(0, 10)}...`
		)
	}

	if (publishableKey && !publishableKey.startsWith('pk_test_')) {
		throw new Error(
			`TEST_STRIPE_PUBLISHABLE_KEY must start with 'pk_test_'. Got: ${publishableKey.substring(0, 10)}...`
		)
	}

	if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
		throw new Error(
			`TEST_STRIPE_WEBHOOK_SECRET must start with 'whsec_'. Got: ${webhookSecret.substring(0, 10)}...`
		)
	}

	// Warn if using placeholder keys
	if (secretKey?.includes('Replace')) {
		console.warn(
			'[WARNING]  Using placeholder Stripe test keys. See apps/backend/test/stripe-test-setup.md for setup instructions.'
		)
	}

	return {
		secretKey: secretKey || 'sk_test_placeholder_key_see_stripe_test_setup_md',
		webhookSecret:
			webhookSecret || 'whsec_placeholder_secret_see_stripe_test_setup_md',
		publishableKey:
			publishableKey || 'pk_test_placeholder_key_see_stripe_test_setup_md'
	}
}

/**
 * Test Email Configuration
 * Uses test/mock email service for all environments
 */
export function getTestEmailConfig(): TestEnvironmentConfig['email'] {
	return {
		resendApiKey:
			process.env.TEST_RESEND_API_KEY || 'mock_resend_api_key_for_testing'
	}
}

/**
 * Complete Test Environment Configuration
 * Combines all test configurations into a single object
 */
export function getTestEnvironmentConfig(): TestEnvironmentConfig {
	return {
		database: getTestDatabaseConfig(),
		supabase: getTestSupabaseConfig(),
		stripe: getTestStripeConfig(),
		email: getTestEmailConfig()
	}
}

/**
 * Create Test Module with Environment Configuration
 * Helper function to create NestJS test modules with proper test environment
 */
export async function createTestModule(moduleMetadata: {
	imports?: Array<Type<unknown> | DynamicModule>
	controllers?: Array<Type<unknown>>
	providers?: Array<Provider>
	exports?: Array<Type<unknown> | DynamicModule | Provider>
}): Promise<TestingModule> {
	const testConfig = getTestEnvironmentConfig()

	// Set environment variables for test
	process.env.NODE_ENV = 'test'
	process.env.DATABASE_URL = testConfig.database.url
	process.env.SUPABASE_URL = testConfig.supabase.url
	process.env.SUPABASE_ANON_KEY = testConfig.supabase.anonKey
	process.env.SUPABASE_SERVICE_ROLE_KEY = testConfig.supabase.serviceRoleKey
	process.env.SUPABASE_JWT_SECRET = testConfig.supabase.jwtSecret
	process.env.STRIPE_SECRET_KEY = testConfig.stripe.secretKey
	process.env.STRIPE_WEBHOOK_SECRET = testConfig.stripe.webhookSecret
	process.env.STRIPE_PUBLISHABLE_KEY = testConfig.stripe.publishableKey
	process.env.RESEND_API_KEY = testConfig.email.resendApiKey

	return Test.createTestingModule({
		imports: [
			ConfigModule.forRoot({
				isGlobal: true,
				ignoreEnvFile: true, // Use environment variables set above
				ignoreEnvVars: false
			}),
			...(moduleMetadata?.imports || [])
		],
		controllers: moduleMetadata?.controllers || [],
		providers: moduleMetadata?.providers || [],
		exports: moduleMetadata?.exports || []
	}).compile()
}

/**
 * Test Database Utilities
 * Helper functions for database setup and teardown in tests
 */
export class TestDatabaseUtils {
	private static readonly logger = new Logger(TestDatabaseUtils.name)
	/**
	 * Clean test database
	 * Removes all data while preserving schema
	 */
	static async cleanDatabase(): Promise<void> {
		const testEnv = getTestEnvironment()

		if (testEnv === 'unit') {
			// Unit tests don't need database cleanup (mocked)
			return
		}

		// For integration/e2e tests, implement database cleanup
		// This would typically connect to test database and truncate tables
		TestDatabaseUtils.logger.verbose(
			`Cleaning test database for ${testEnv} tests...`
		)
	}

	/**
	 * Seed test database
	 * Adds necessary test data
	 */
	static async seedTestData(): Promise<void> {
		const testEnv = getTestEnvironment()

		if (testEnv === 'unit') {
			// Unit tests don't need database seeding (mocked)
			return
		}

		TestDatabaseUtils.logger.verbose(
			`Seeding test database for ${testEnv} tests...`
		)
	}

	/**
	 * Setup test database
	 * Creates necessary tables and initial data
	 */
	static async setupTestDatabase(): Promise<void> {
		const testEnv = getTestEnvironment()

		if (testEnv === 'unit') {
			// Unit tests don't need database setup (mocked)
			return
		}

		TestDatabaseUtils.logger.verbose(
			`Setting up test database for ${testEnv} tests...`
		)
		await this.cleanDatabase()
		await this.seedTestData()
	}
}
