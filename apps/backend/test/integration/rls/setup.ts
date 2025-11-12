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
import type { Database } from '@repo/shared/types/supabase-generated'

/**
 * Test user credentials
 * These accounts must be created manually in Supabase Auth
 */
export interface TestCredentials {
	email: string
	password: string
	role: 'OWNER' | 'TENANT'
}

export const TEST_USERS = {
	OWNER_A: {
		email: process.env.E2E_OWNER_EMAIL!,
		password: process.env.E2E_OWNER_PASSWORD!,
		role: 'OWNER' as const
	},
	OWNER_B: {
		email: process.env.E2E_OWNER_B_EMAIL!,
		password: process.env.E2E_OWNER_B_PASSWORD!,
		role: 'OWNER' as const
	},
	TENANT_A: {
		email: process.env.E2E_TENANT_A_EMAIL!,
		password: process.env.E2E_TENANT_A_PASSWORD!,
		role: 'TENANT' as const
	},
	TENANT_B: {
		email: process.env.E2E_TENANT_B_EMAIL!,
		password: process.env.E2E_TENANT_B_PASSWORD!,
		role: 'TENANT' as const
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

// Validate password strength - must not be the weak default
const WEAK_PASSWORD = 'TestPassword123!'
Object.entries(TEST_USERS).forEach(([key, user]) => {
	if (!user.email || !user.password) {
		throw new Error(`Test user ${key} is missing email or password. Check environment variables.`)
	}
	if (user.password === WEAK_PASSWORD) {
		throw new Error(
			`Test user ${key} is using the weak default password. ` +
			`Please set a secure password in environment variables.`
		)
	}
})

/**
 * Authenticated test client with user context
 */
export interface AuthenticatedTestClient {
	client: SupabaseClient<Database>
	userId: string
	email: string
	role: 'OWNER' | 'TENANT'
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
	const serviceClient = getServiceRoleClient()
	const authUserId = authData.data.user.id

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
				supabaseId: authData.data.user.id,
				email: authData.data.user.email!,
				firstName: credentials.role === 'OWNER' ? 'Owner' : 'Tenant',
				lastName: 'Test',
				role: credentials.role === 'OWNER' ? 'OWNER' : 'TENANT'
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
		userId: authUserId, // Use auth ID for both RLS and foreign keys
		email: authData.data.user.email!,
		role: credentials.role,
		accessToken: authData.data.session.access_token
	}
} /**
 * Get service role client for cleanup operations
 * Throws an error if environment variables are not available
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
	const serviceRoleKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error(
			'Missing service role credentials (SUPABASE_URL and SUPABASE_SECRET_KEY). Cannot run tests.'
		)
	}

	return createClient<Database>(supabaseUrl, serviceRoleKey, {
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
			await serviceClient.from('rent_payment').delete().eq('id', id)
		}
	}

	if (resourceIds.leases) {
		for (const id of resourceIds.leases) {
			await serviceClient.from('lease').delete().eq('id', id)
		}
	}

	if (resourceIds.tenants) {
		for (const id of resourceIds.tenants) {
			await serviceClient.from('tenant').delete().eq('id', id)
		}
	}

	if (resourceIds.units) {
		for (const id of resourceIds.units) {
			await serviceClient.from('unit').delete().eq('id', id)
		}
	}

	if (resourceIds.properties) {
		for (const id of resourceIds.properties) {
			await serviceClient.from('property').delete().eq('id', id)
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
	ownerId: string,
	tenantId: string
): Promise<string> {
	const serviceClient = getServiceRoleClient()
	if (!serviceClient) {
		throw new Error('Service role client not available')
	}

	const testLeaseId = 'test-lease-for-payments'
	const testPropertyId = 'test-property-for-payments'
	const testUnitId = 'test-unit-for-payments'

	// Check if lease already exists
	const { data: existing } = await serviceClient
		.from('lease')
		.select('id')
		.eq('id', testLeaseId)
		.maybeSingle()

	if (existing) {
		return testLeaseId
	}

	// Create minimal test property first
	const { error: propertyError } = await serviceClient.from('property').upsert({
		id: testPropertyId,
		ownerId,
		name: 'Test Property',
		address: '123 Test St',
		city: 'Test City',
		state: 'CA',
		zipCode: '12345',
		propertyType: 'SINGLE_FAMILY',
		status: 'ACTIVE'
	})

	if (propertyError && !propertyError.message.includes('duplicate key')) {
		throw new Error(`Failed to create test property: ${propertyError.message}`)
	}

	// Create minimal test unit
	const { error: unitError } = await serviceClient.from('unit').upsert({
		id: testUnitId,
		propertyId: testPropertyId,
		unitNumber: '1',
		rent: 150000, // $1,500
		bedrooms: 1,
		bathrooms: 1,
		squareFeet: 500,
		status: 'OCCUPIED'
	})

	if (unitError && !unitError.message.includes('duplicate key')) {
		throw new Error(`Failed to create test unit: ${unitError.message}`)
	}

	// Create minimal test lease
	const startDate = new Date()
	const endDate = new Date()
	endDate.setFullYear(endDate.getFullYear() + 1)

	// Create tenant record (lease.tenantId references tenant table, not users)
	const testTenantRecordId = 'test-tenant-record-for-payments'
	const { error: tenantRecordError } = await serviceClient
		.from('tenant')
		.upsert({
			id: testTenantRecordId,
			userId: tenantId, // Link to users table
			email: 'test-tenant@test.tenantflow.local',
			firstName: 'Test',
			lastName: 'Tenant',
			status: 'ACTIVE'
		})

	if (
		tenantRecordError &&
		!tenantRecordError.message.includes('duplicate key')
	) {
		throw new Error(
			`Failed to create tenant record: ${tenantRecordError.message}`
		)
	}

	const { error } = await serviceClient.from('lease').insert({
		id: testLeaseId,
		tenantId: testTenantRecordId, // Use tenant record ID, not user ID
		unitId: testUnitId,
		rentAmount: 150000, // $1,500
		securityDeposit: 150000,
		startDate: startDate.toISOString().split('T')[0]!,
		endDate: endDate.toISOString().split('T')[0]!,
		status: 'ACTIVE'
	})

	if (error) {
		throw new Error(`Failed to create test lease: ${error.message}`)
	}

	return testLeaseId
}
