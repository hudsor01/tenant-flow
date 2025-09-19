/**
 * TenantFlow Typed Supabase Client
 *
 * Pre-configured Supabase clients with full type safety.
 * Use these instead of raw createClient calls throughout the application.
 */

import {
	createClient,
	type AuthError,
	type Session,
	type SupabaseClient,
	type User
} from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Create a lazy-initialized client to avoid build-time errors
let _client: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> {
	if (!_client) {
		if (!SUPABASE_URL) {
			throw new Error('Missing SUPABASE_URL environment variable')
		}
		if (!SUPABASE_ANON_KEY) {
			throw new Error('Missing SUPABASE_ANON_KEY environment variable')
		}
		_client = createClient<Database>(
			SUPABASE_URL,
			SUPABASE_ANON_KEY,
			{
				auth: {
					persistSession: true,
					autoRefreshToken: true,
					flowType: 'pkce',
					detectSessionInUrl: true
				},
				db: {
					schema: 'public'
				}
			}
		)
	}
	return _client
}

// Export function to get client directly - better webpack compatibility
export function getSupabaseClientInstance(): SupabaseClient<Database> {
	return getSupabaseClient()
}

// Export for backward compatibility and simpler imports
export const supabaseClient = getSupabaseClient()

/**
 * Server-side admin client with full database access
 * ONLY use this in backend services where you need to bypass RLS
 *
 * SECURITY WARNING: Never use this client with user input without validation
 * IMPORTANT: This will throw an error if used in frontend without SUPABASE_SERVICE_KEY
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
	if (!SUPABASE_SERVICE_KEY) {
		throw new Error(
			'SUPABASE_SERVICE_KEY required for admin client - this should only be used in backend services'
		)
	}

	return createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		},
		db: {
			schema: 'public'
		}
	})
}

// For environments where admin client is needed, use getSupabaseAdmin()
// This prevents immediate initialization that would fail in frontend
let _adminClient: SupabaseClient<Database> | null = null

// Export function for admin client - better webpack compatibility
export function getSupabaseAdminInstance(): SupabaseClient<Database> {
	// Only create admin client when actually accessed (and only in backend)
	if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
		throw new Error(
			'supabaseAdmin cannot be used in browser/frontend code. Use supabaseClient instead.'
		)
	}
	if (!_adminClient) {
		_adminClient = getSupabaseAdmin()
	}
	return _adminClient
}

/**
 * Get current authenticated user with type safety
 */
export async function getCurrentUser(): Promise<{
	user: User | null
	error: AuthError | null
}> {
	const client = getSupabaseClient()
	const {
		data: { user },
		error
	} = await client.auth.getUser()
	return { user, error }
}

export async function getCurrentSession(): Promise<{
	session: Session | null
	error: AuthError | null
}> {
	const client = getSupabaseClient()
	const {
		data: { session },
		error
	} = await client.auth.getSession()
	return { session, error }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
	const client = getSupabaseClient()
	const { error } = await client.auth.signOut()
	return { error }
}

// ========================
// ULTRA-NATIVE Multi-tenant
// ========================
// Use RLS policies directly - no wrapper classes
// Example: supabaseClient.from('Property').select('*').eq('organizationId', orgId)

export type {
	Database,
	Enums,
	Tables,
	TablesInsert,
	TablesUpdate
} from '../types/supabase-generated'

export type {
	QueryData,
	QueryError,
	TenantFlowOrganizationSettings,
	TenantFlowPropertyMetadata,
	TenantFlowUserMetadata
} from '../types/supabase'
