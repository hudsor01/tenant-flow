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
	role: 'LANDLORD' | 'TENANT'
}

export const TEST_USERS = {
	LANDLORD_A: {
		email:
			process.env.E2E_LANDLORD_A_EMAIL || 'landlord-a@test.tenantflow.local',
		password: process.env.E2E_LANDLORD_A_PASSWORD || 'TestPassword123!',
		role: 'LANDLORD' as const
	},
	LANDLORD_B: {
		email:
			process.env.E2E_LANDLORD_B_EMAIL || 'landlord-b@test.tenantflow.local',
		password: process.env.E2E_LANDLORD_B_PASSWORD || 'TestPassword123!',
		role: 'LANDLORD' as const
	},
	TENANT_A: {
		email: process.env.E2E_TENANT_A_EMAIL || 'tenant-a@test.tenantflow.local',
		password: process.env.E2E_TENANT_A_PASSWORD || 'TestPassword123!',
		role: 'TENANT' as const
	},
	TENANT_B: {
		email: process.env.E2E_TENANT_B_EMAIL || 'tenant-b@test.tenantflow.local',
		password: process.env.E2E_TENANT_B_PASSWORD || 'TestPassword123!',
		role: 'TENANT' as const
	}
} as const

/**
 * Authenticated test client with user context
 */
export interface AuthenticatedTestClient {
	client: SupabaseClient<Database>
	userId: string
	email: string
	role: 'LANDLORD' | 'TENANT'
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
			persistSession: false
		}
	})
}

/**
 * Authenticate as a test user and return authenticated client
 */
export async function authenticateAs(
	credentials: TestCredentials
): Promise<AuthenticatedTestClient> {
	const client = createTestClient()

	const { data, error } = await client.auth.signInWithPassword({
		email: credentials.email,
		password: credentials.password
	})

	if (error || !data.session) {
		throw new Error(
			`Failed to authenticate as ${credentials.email}: ${error?.message || 'No session'}`
		)
	}

	return {
		client,
		userId: data.user.id,
		email: data.user.email!,
		role: credentials.role,
		accessToken: data.session.access_token
	}
}

/**
 * Get service role client for cleanup operations
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
	const serviceRoleKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error(
			'Missing service role credentials. Set SUPABASE_SECRET_KEY in environment.'
		)
	}

	return createClient<Database>(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
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
