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
	OWNER_B: {
		email: process.env.E2E_OWNER_B_EMAIL!,
		password: process.env.E2E_OWNER_B_PASSWORD!,
		user_type: 'OWNER' as const
	},
	TENANT_A: {
		email: process.env.E2E_TENANT_A_EMAIL!,
		password: process.env.E2E_TENANT_A_PASSWORD!,
		user_type: 'TENANT' as const
	},
	TENANT_B: {
		email: process.env.E2E_TENANT_B_EMAIL!,
		password: process.env.E2E_TENANT_B_PASSWORD!,
		user_type: 'TENANT' as const
	}
} as const

// Validate required environment variables at module load time
const REQUIRED_TEST_USER_VARS = [
	'E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD',
	'E2E_OWNER_B_EMAIL', 'E2E_OWNER_B_PASSWORD',
	'E2E_TENANT_A_EMAIL', 'E2E_TENANT_A_PASSWORD',
	'E2E_TENANT_B_EMAIL', 'E2E_TENANT_B_PASSWORD'
] as const

const missingVars = REQUIRED_TEST_USER_VARS.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
	throw new Error(
		`Missing required environment variables for integration tests:
  - ${missingVars.join('\n  - ')}

Please set these variables in your environment or .env.local file before running integration tests.`
	)
}

// Validate password strength - must not be a weak default password
const WEAK_PASSWORDS = [
	'TestPassword123!',
	'password',
	'password123',
	'123456',
	'admin',
	'test123',
	'default'
]

Object.entries(TEST_USERS).forEach(([key, user]) => {
	if (!user.email || !user.password) {
		throw new Error(`Test user ${key} is missing email or password. Check environment variables.`)
	}
	if (WEAK_PASSWORDS.some(weak => user.password.toLowerCase().includes(weak.toLowerCase()))) {
		throw new Error(
			`Test user ${key} is using a weak or default password. ` +
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
 */
function createTestClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey =
		process.env.SUPABASE_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in environment.'
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

	// Ensure user exists in users table (for foreign key constraints)
	const serviceClient = getServiceuser_typeClient()
	const authuser_id = authData.data.user.id

	if (serviceClient) {
		// Check if a user already exists with this auth ID as their primary key
		const { data: existingUser } = await serviceClient
			.from('users')
			.select('id, supabaseId')
			.eq('id', authData.data.user.id)
			.maybeSingle()

		if (!existingUser) {
			// Create new user with auth ID as both id and supabaseId
			const { error: userError } = await serviceClient.from('users').insert({
				id: authData.data.user.id,
				email: authData.data.user.email!,
				full_name: credentials.user_type === 'OWNER' ? 'Owner Test' : 'Tenant Test',
				user_type: credentials.user_type === 'OWNER' ? 'OWNER' : 'TENANT'
			})

			if (userError && !userError.message.includes('duplicate key')) {
				throw new Error(
					`Failed to create user record for ${credentials.email}: ${userError.message} (code: ${userError.code})`
				)
			}
		}
	}

	return {
		client,
		user_id: authuser_id, // Use auth ID for both RLS and foreign keys
		email: authData.data.user.email!,
		user_type: credentials.user_type,
		accessToken: authData.data.session.access_token
	}
} /**
 * Get service user_type client for cleanup operations
 * Throws an error if environment variables are not available
 */
export function getServiceuser_typeClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
	const serviceuser_typeKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl || !serviceuser_typeKey) {
		throw new Error(
			'Missing service user_type credentials (SUPABASE_URL and SUPABASE_SECRET_KEY). Cannot run tests.'
		)
	}

	return createClient<Database>(supabaseUrl, serviceuser_typeKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
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
 * Create or get a test lease for payment testing
 * Uses a fixed ID so it can be reused across tests
 */
export async function ensureTestLease(
	owner_id: string,
	tenant_id: string
): Promise<string> {
	const serviceClient = getServiceuser_typeClient()
	if (!serviceClient) {
		throw new Error('Service user_type client not available')
	}

	const testlease_id = 'test-lease-for-payments'
	const testproperty_id = 'test-property-for-payments'
	const testunit_id = 'test-unit-for-payments'

	// Check if lease already exists
	const { data: existing } = await serviceClient
		.from('leases')
		.select('id')
		.eq('id', testlease_id)
		.maybeSingle()

	if (existing) {
		return testlease_id
	}

	// Create minimal test property first
	const { error: propertyError } = await serviceClient.from('properties').upsert({
		id: testproperty_id,
		property_owner_id: owner_id,
		name: 'Test Property',
		address_line1: '123 Test St',
		city: 'Test City',
		state: 'CA',
		postal_code: '12345',
		property_type: 'SINGLE_FAMILY',
		status: 'ACTIVE'
	})

	if (propertyError && !propertyError.message.includes('duplicate key')) {
		throw new Error(`Failed to create test property: ${propertyError.message}`)
	}

	// Create minimal test unit
	const { error: unitError } = await serviceClient.from('units').upsert({
		id: testunit_id,
		property_id: testproperty_id,
		unit_number: '1',
		rent_amount: 150000, // $1,500
		bedrooms: 1,
		bathrooms: 1,
		square_feet: 500,
		status: 'OCCUPIED'
	})

	if (unitError && !unitError.message.includes('duplicate key')) {
		throw new Error(`Failed to create test unit: ${unitError.message}`)
	}

	// Create minimal test lease
	const start_date = new Date()
	const end_date = new Date()
	end_date.setFullYear(end_date.getFullYear() + 1)

	// Create tenant record (lease.tenant_id references tenant table, not users)
	const testTenantRecordId = 'test-tenant-record-for-payments'
	const { error: tenantRecordError } = await serviceClient
		.from('tenants')
		.upsert({
			id: testTenantRecordId,
			user_id: tenant_id, // Link to users table
			stripe_customer_id: ''
		})

	if (
		tenantRecordError &&
		!tenantRecordError.message.includes('duplicate key')
	) {
		throw new Error(
			`Failed to create tenant record: ${tenantRecordError.message}`
		)
	}

	const { error } = await serviceClient.from('leases').insert({
		id: testlease_id,
		primary_tenant_id: testTenantRecordId, // Use tenant record ID
		unit_id: testunit_id,
		rent_amount: 150000, // $1,500
		security_deposit: 150000,
		start_date: start_date.toISOString().split('T')[0]!,
		end_date: end_date.toISOString().split('T')[0]!,
		lease_status: 'ACTIVE'
	})

	if (error) {
		throw new Error(`Failed to create test lease: ${error.message}`)
	}

	return testlease_id
}
