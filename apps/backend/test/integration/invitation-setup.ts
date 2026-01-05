/**
 * Simplified Setup for Tenant Invitation Integration Tests
 *
 * This setup only requires the primary owner credentials (E2E_OWNER_EMAIL/PASSWORD)
 * since invitation tests don't require multi-user RLS boundary testing.
 */

import { Logger } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase'

/**
 * Test user credentials
 */
export interface TestCredentials {
	email: string
	password: string
	user_type: 'OWNER' | 'TENANT'
}

// Only require primary owner for invitation tests
const REQUIRED_VARS = ['E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD'] as const

const logger = new Logger('InvitationSetup')

const missingVars = REQUIRED_VARS.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
	throw new Error(
		`Missing required environment variables for invitation integration tests:
  - ${missingVars.join('\n  - ')}

Please set these variables via Doppler before running integration tests.`
	)
}

export const TEST_OWNER = {
	email: process.env.E2E_OWNER_EMAIL!,
	password: process.env.E2E_OWNER_PASSWORD!,
	user_type: 'OWNER' as const
}

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
 */
export async function authenticateAs(
	credentials: TestCredentials
): Promise<AuthenticatedTestClient> {
	const client = createTestClient()

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
	const authUserId = authData.data.user.id

	return {
		client,
		user_id: authUserId,
		email: authData.data.user.email!,
		user_type: credentials.user_type,
		accessToken: authData.data.session.access_token
	}
}

/**
 * Get service role client for cleanup operations
 * NOTE: Prefer NEXT_PUBLIC_* vars first since test/setup.ts may set mock SUPABASE_URL
 *
 * WARNING: The SERVICE_ROLE may not actually bypass RLS. If tests fail with
 * "permission denied" errors, the SERVICE_ROLE in Doppler needs to be updated
 * to the actual Supabase service_role JWT key (starts with eyJ...).
 */
export function getServiceClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!supabaseUrl || !serviceKey) {
		throw new Error(
			'Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).'
		)
	}

	return createClient<Database>(supabaseUrl, serviceKey, {
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
 * NOTE: After Stripe decoupling migration, properties.owner_user_id references auth.users.id directly.
 * The property_owners table was removed and replaced with stripe_connected_accounts.
 * No helper function needed - just use the auth user ID directly.
 */

/**
 * Check if the service key bypasses RLS (required for test data setup).
 * Returns true if the service key can write to tables, false otherwise.
 */
export async function canServiceKeyBypassRLS(): Promise<boolean> {
	try {
		const client = getServiceClient()
		// Try a simple read operation that requires service role
		const { error } = await client.from('properties').select('id').limit(1)

		// If we get "permission denied", the key doesn't bypass RLS
		if (error?.message?.includes('permission denied')) {
			return false
		}
		return true
	} catch {
		return false
	}
}
