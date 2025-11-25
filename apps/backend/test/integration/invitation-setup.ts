/**
 * Simplified Setup for Tenant Invitation Integration Tests
 *
 * This setup only requires the primary owner credentials (E2E_OWNER_EMAIL/PASSWORD)
 * since invitation tests don't require multi-user RLS boundary testing.
 */

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

	// Ensure user exists in users table
	const serviceClient = getServiceClient()
	const authUserId = authData.data.user.id

	const { data: existingUser } = await serviceClient
		.from('users')
		.select('id')
		.eq('id', authUserId)
		.maybeSingle()

	if (!existingUser) {
		const { error: userError } = await serviceClient.from('users').insert({
			id: authUserId,
			email: authData.data.user.email!,
			full_name: credentials.user_type === 'OWNER' ? 'Owner Test' : 'Tenant Test',
			user_type: credentials.user_type === 'OWNER' ? 'OWNER' : 'TENANT'
		})

		if (userError && !userError.message.includes('duplicate key')) {
			throw new Error(
				`Failed to create user record for ${credentials.email}: ${userError.message}`
			)
		}
	}

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
 */
export function getServiceClient(): SupabaseClient<Database> {
	const supabaseUrl =
		process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
	const serviceKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl || !serviceKey) {
		throw new Error(
			'Missing service role credentials (SUPABASE_URL and SUPABASE_SECRET_KEY).'
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
