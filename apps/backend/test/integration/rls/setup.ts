/**
 * Backend RLS Integration Test Setup
 *
 * Provides utilities for multi-user authentication and RLS boundary testing.
 * These tests connect to real Supabase database to verify RLS policies work correctly.
 *
 * PREREQUISITES:
 * - Backend must be running: `doppler run -- pnpm --filter @repo/backend dev`
 * - Test accounts must exist in Supabase Auth (see .env.test for credentials)
 * - Database must have latest migrations applied
 */

import { Logger } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'

/**
 * Test user credentials
 * These accounts must be created manually in Supabase Auth
 */
export interface TestCredentials {
	email: string
	password: string
	user_type: 'OWNER' | 'TENANT'
}

export const TEST_USERS = {
	OWNER_A: {
		email: process.env.E2E_OWNER_EMAIL!,
		password: process.env.E2E_OWNER_PASSWORD!,
		user_type: 'OWNER' as const
	},
	// OWNER_B, TENANT_A, TENANT_B are optional - use existing E2E_TENANT_EMAIL if available
	OWNER_B: {
		email: process.env.E2E_OWNER_B_EMAIL || process.env.E2E_MANAGER_EMAIL || '',
		password: process.env.E2E_OWNER_B_PASSWORD || process.env.E2E_MANAGER_PASSWORD || '',
		user_type: 'OWNER' as const
	},
	TENANT_A: {
		email: process.env.E2E_TENANT_A_EMAIL || process.env.E2E_TENANT_EMAIL || '',
		password: process.env.E2E_TENANT_A_PASSWORD || process.env.E2E_TENANT_PASSWORD || '',
		user_type: 'TENANT' as const
	},
	TENANT_B: {
		email: process.env.E2E_TENANT_B_EMAIL || '',
		password: process.env.E2E_TENANT_B_PASSWORD || '',
		user_type: 'TENANT' as const
	}
} as const

// Only the primary owner credentials are strictly required
// Other test users are optional - tests will skip if not available
const REQUIRED_TEST_USER_VARS = [
	'E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD'
] as const

// These are optional but tests may be skipped without them
const OPTIONAL_TEST_USER_VARS = [
	'E2E_OWNER_B_EMAIL', 'E2E_OWNER_B_PASSWORD',
	'E2E_TENANT_A_EMAIL', 'E2E_TENANT_A_PASSWORD',
	'E2E_TENANT_B_EMAIL', 'E2E_TENANT_B_PASSWORD'
] as const

const logger = new Logger('RlsTestSetup')

const missingRequiredVars = REQUIRED_TEST_USER_VARS.filter(varName => !process.env[varName])

// Skip integration tests if required environment variables are not set
// This allows unit tests to run without needing integration test credentials
export const shouldSkipIntegrationTests = missingRequiredVars.length > 0

if (shouldSkipIntegrationTests) {
	logger.warn(
		`Skipping integration tests due to missing environment variables:
  - ${missingRequiredVars.join('\n  - ')}

To run integration tests, set these variables in your environment or .env.local file.`
	)
}

// Check for optional vars and warn (don't fail)
const missingOptionalVars = OPTIONAL_TEST_USER_VARS.filter(varName => !process.env[varName])
if (missingOptionalVars.length > 0) {
	logger.warn(
		`[RLS Tests] Some multi-user test accounts are not configured. Tests requiring these users will be skipped:
  - ${missingOptionalVars.join('\n  - ')}

To run full RLS isolation tests, configure these in Doppler.`
	)
}

/**
 * Check if a specific test user is available
 */
export function isTestUserAvailable(userKey: keyof typeof TEST_USERS): boolean {
	const user = TEST_USERS[userKey]
	return Boolean(user.email && user.password)
}

// Validate password strength - reject only exact weak passwords (not substrings)
// Note: "TestPassword123!" is acceptable as it has mixed case, numbers, and special char
const WEAK_PASSWORDS = [
	'password',
	'password123',
	'123456',
	'admin',
	'test123',
	'default'
]

// Only validate users that have credentials configured
Object.entries(TEST_USERS).forEach(([key, user]) => {
	// Skip validation for optional users without credentials
	if (!user.email || !user.password) {
		return
	}
	// Check exact match only - complex passwords with these substrings are fine
	if (WEAK_PASSWORDS.some(weak => user.password.toLowerCase() === weak.toLowerCase())) {
		throw new Error(
			`Test user ${key} is using a weak password. ` +
			`Please set a secure password in environment variables.`
		)
	}
})

/**
 * Authenticated test client with user context
 */
export interface AuthenticatedTestClient {
	client: SupabaseClient<Database>
	user_id: string
	email: string
	user_type: 'OWNER' | 'TENANT'
	accessToken: string
}

/**
 * Create Supabase client for testing
 * NOTE: Prefer NEXT_PUBLIC_* vars first since test/setup.ts may set mock SUPABASE_URL
 */
function createTestClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
	const supabaseKey =
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
		process.env.SUPABASE_PUBLISHABLE_KEY

	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in environment.'
		)
	}

	return createClient<Database>(supabaseUrl, supabaseKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
			detectSessionInUrl: false
		}
	})
}

/**
 * Authenticate as a test user and return authenticated client
 * NOTE: Test users must already exist in Supabase Auth
 */
export async function authenticateAs(
	credentials: TestCredentials
): Promise<AuthenticatedTestClient> {
	const client = createTestClient()

	// Sign in with the test user
	const authData = await client.auth.signInWithPassword({
		email: credentials.email,
		password: credentials.password
	})

	if (authData.error || !authData.data.session) {
		throw new Error(
			`Failed to authenticate as ${credentials.email}: ${authData.error?.message || 'No session'}`
		)
	}

	// User should already exist in users table (created by database trigger on auth signup)
	// Just verify we can access the authenticated client
	const authuser_id = authData.data.user.id

	return {
		client,
		user_id: authuser_id, // Use auth ID for both RLS and foreign keys
		email: authData.data.user.email!,
		user_type: credentials.user_type,
		accessToken: authData.data.session.access_token
	}
}

/**
 * Get service role client for cleanup operations
 * NOTE: Prefer NEXT_PUBLIC_* vars first since test/setup.ts may set mock SUPABASE_URL
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
	const secretKey = process.env.SB_SECRET_KEY

	if (!supabaseUrl || !secretKey) {
		throw new Error(
			'Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SB_SECRET_KEY). Cannot run tests.'
		)
	}

	return createClient<Database>(supabaseUrl, secretKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
			detectSessionInUrl: false
		},
		db: {
			schema: 'public'
		}
	})
}

/**
 * Cleanup test data created during tests
 */
export async function cleanupTestData(
	serviceClient: SupabaseClient<Database>,
	resourceIds: {
		properties?: string[]
		tenants?: string[]
		leases?: string[]
		payments?: string[]
		units?: string[]
	}
) {
	// Delete in reverse foreign key order
	if (resourceIds.payments) {
		for (const id of resourceIds.payments) {
			await serviceClient.from('rent_payments').delete().eq('id', id)
		}
	}

	if (resourceIds.leases) {
		for (const id of resourceIds.leases) {
			await serviceClient.from('leases').delete().eq('id', id)
		}
	}

	if (resourceIds.tenants) {
		for (const id of resourceIds.tenants) {
			await serviceClient.from('tenants').delete().eq('id', id)
		}
	}

	if (resourceIds.units) {
		for (const id of resourceIds.units) {
			await serviceClient.from('units').delete().eq('id', id)
		}
	}

	if (resourceIds.properties) {
		for (const id of resourceIds.properties) {
			await serviceClient.from('properties').delete().eq('id', id)
		}
	}
}

/**
 * Helper to expect query to return empty results (RLS filtered)
 */
export function expectEmptyResult<T>(data: T[] | null, context: string): void {
	if (data === null || data.length === 0) {
		return // Success - RLS filtered results
	}
	throw new Error(
		`Expected empty result for ${context}, but got ${data.length} rows. RLS policy may be broken!`
	)
}

/**
 * Helper to expect query to fail with permission error
 */
export function expectPermissionError(error: any, context: string): void {
	if (!error) {
		throw new Error(
			`Expected permission error for ${context}, but query succeeded. RLS policy may be broken!`
		)
	}

	// Supabase returns various error codes for permission issues
	const permissionErrors = [
		'PGRST301', // Permission denied
		'42501', // Insufficient privilege
		'42P01' // Relation does not exist (RLS hides table)
	]

	const errorCode = error.code || error.error_code || ''
	const errorMessage = error.message || ''

	if (
		permissionErrors.some(code => errorCode.includes(code)) ||
		errorMessage.toLowerCase().includes('permission') ||
		errorMessage.toLowerCase().includes('policy')
	) {
		return // Success - permission denied as expected
	}

	throw new Error(
		`Expected permission error for ${context}, but got: ${errorMessage} (${errorCode})`
	)
}

/**
 * NOTE: After Stripe decoupling migration, properties.owner_user_id references auth.users.id directly.
 * The property_owners table was removed and replaced with stripe_connected_accounts.
 * No helper function needed - just use the auth user ID directly.
 */

/**
 * Create or get a test lease for payment testing
 * Uses the authenticated owner client to create test data (RLS will allow owner to create their own data)
 * @param ownerClient - Authenticated Supabase client for the owner
 * @param owner_id - The owner's auth.users.id
 * @param tenant_id - The tenant's user ID
 */
export async function ensureTestLease(
	ownerClient: SupabaseClient<Database>,
	owner_id: string,
	tenant_id: string
): Promise<string> {
	// Generate deterministic UUIDs based on owner/tenant using crypto
	// This ensures same owner/tenant pair gets same IDs across test runs
	const crypto = await import('crypto')
	const hash = (input: string) => crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)

	// Create valid UUID v4 format from hash
	const toUUID = (hashStr: string) => {
		return `${hashStr.slice(0, 8)}-${hashStr.slice(8, 12)}-4${hashStr.slice(13, 16)}-a${hashStr.slice(17, 20)}-${hashStr.slice(20, 32)}`
	}

	const testlease_id = toUUID(hash(`lease-${owner_id}-${tenant_id}`))
	const testproperty_id = toUUID(hash(`property-${owner_id}-${tenant_id}`))
	const testunit_id = toUUID(hash(`unit-${owner_id}-${tenant_id}`))
	const testTenantRecordId = toUUID(hash(`tenant-${owner_id}-${tenant_id}`))

	// Check if lease already exists
	const { data: existing } = await ownerClient
		.from('leases')
		.select('id')
		.eq('id', testlease_id)
		.maybeSingle()

	if (existing) {
		return testlease_id
	}

	// After Stripe decoupling: owner_user_id references auth.users.id directly
	// No need to query stripe_connected_accounts table - use auth user ID directly

	// Create minimal test property first (owner can create their own property)
	const { error: propertyError } = await ownerClient.from('properties').upsert({
		id: testproperty_id,
		owner_user_id: owner_id,
		name: 'Test Property for Payments',
		address_line1: '123 Test St',
		city: 'Test City',
		state: 'CA',
		postal_code: '12345',
		property_type: 'SINGLE_FAMILY',
		status: 'active'
	})

	if (propertyError && !propertyError.message.includes('duplicate key')) {
		throw new Error(`Failed to create test property: ${propertyError.message}`)
	}

	// Create minimal test unit (owner can create units in their property)
	const { error: unitError } = await ownerClient.from('units').upsert({
		id: testunit_id,
		property_id: testproperty_id,
		owner_user_id: owner_id,
		unit_number: '1',
		rent_amount: 150000, // $1,500
		bedrooms: 1,
		bathrooms: 1,
		square_feet: 500,
		status: 'occupied'
	})

	if (unitError && !unitError.message.includes('duplicate key')) {
		throw new Error(`Failed to create test unit: ${unitError.message}`)
	}

	// Create tenant record using service role client (owners can't create tenants via RLS - correct behavior)
	// In production, tenant records are created via the invitation flow (backend uses admin client)
	const serviceClient = getServiceRoleClient()

	// First check if tenant record already exists (avoid confusing upsert errors)
	const { data: existingTenant } = await serviceClient
		.from('tenants')
		.select('id')
		.eq('user_id', tenant_id)
		.maybeSingle()

	let actualTenantRecordId: string

	if (existingTenant) {
		// Tenant already exists (created via invitation flow in production)
		actualTenantRecordId = existingTenant.id
	} else {
		// Create new tenant record for test setup
		const { error: tenantRecordError } = await serviceClient
			.from('tenants')
			.insert({
				id: testTenantRecordId,
				user_id: tenant_id,
				stripe_customer_id: ''
			})

		if (tenantRecordError) {
			throw new Error(
				`Failed to create tenant record for test setup: ${tenantRecordError.message}. ` +
				`Ensure SERVICE_ROLE is configured correctly in Doppler.`
			)
		}
		actualTenantRecordId = testTenantRecordId
	}

	// Create minimal test lease
	const start_date = new Date()
	const end_date = new Date()
	end_date.setFullYear(end_date.getFullYear() + 1)

	const { error } = await ownerClient.from('leases').insert({
		id: testlease_id,
		owner_user_id: owner_id,
		primary_tenant_id: actualTenantRecordId,
		unit_id: testunit_id,
		rent_amount: 150000, // $1,500
		security_deposit: 150000,
		start_date: start_date.toISOString().split('T')[0]!,
		end_date: end_date.toISOString().split('T')[0]!,
		lease_status: 'active'
	})

	if (error) {
		throw new Error(`Failed to create test lease: ${error.message}`)
	}

	return testlease_id
}
