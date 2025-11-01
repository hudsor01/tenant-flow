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
import type { Database } from '../types/supabase.js'

// Platform compatibility: Frontend uses NEXT_PUBLIC_*, Backend uses regular env vars
// At least one of each pair must be defined
const SUPABASE_URL = (() => {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
	if (!url) {
		throw new Error(
			'SUPABASE_URL environment variable is required (NEXT_PUBLIC_SUPABASE_URL for frontend, SUPABASE_URL for backend)'
		)
	}
	return url
})()

const SUPABASE_PUBLISHABLE_KEY = (() => {
	const key =
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
		process.env.SUPABASE_PUBLISHABLE_KEY
	if (!key) {
		throw new Error(
			'SUPABASE_PUBLISHABLE_KEY environment variable is required (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for frontend, SUPABASE_PUBLISHABLE_KEY for backend)'
		)
	}
	return key
})()

const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

// Create a lazy-initialized client to avoid build-time errors
let _client: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> {
	if (!_client) {
		// Environment variables are validated at module load time
		_client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				flowType: 'pkce',
				detectSessionInUrl: true
			},
			db: {
				schema: 'public'
			}
		})
	}
	return _client
}

// Export function to get client directly - better webpack compatibility
export function getSupabaseClientInstance(): SupabaseClient<Database> {
	return getSupabaseClient()
}

// Export for backward compatibility and simpler imports
// Use lazy initialization to avoid build-time errors
let _exportedClient: SupabaseClient<Database> | null = null
export const supabaseClient = new Proxy({} as SupabaseClient<Database>, {
	get(target, prop) {
		if (!_exportedClient) {
			_exportedClient = getSupabaseClient()
		}
		return _exportedClient[prop as keyof SupabaseClient<Database>]
	}
})

/**
 * Server-side admin client with full database access
 * ONLY use this in backend services where you need to bypass RLS
 *
 * SECURITY WARNING: Never use this client with user input without validation
 * IMPORTANT: This will throw an error if used in frontend without SUPABASE_SECRET_KEY
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
	if (!SUPABASE_SECRET_KEY) {
		throw new Error(
			'SUPABASE_SECRET_KEY required for admin client - this should only be used in backend services'
		)
	}

	return createClient<Database>(SUPABASE_URL!, SUPABASE_SECRET_KEY, {
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

// Use RLS policies directly - no wrapper classes
// Example: supabaseClient.from('Property').select('*').eq('organizationId', orgId)

export type {
	Database,
	Enums,
	Tables,
	TablesInsert,
	TablesUpdate
} from '../types/supabase-generated.js'

export type {
	QueryData,
	QueryError,
	TenantFlowOrganizationSettings,
	TenantFlowPropertyMetadata,
	TenantFlowUserMetadata
} from '../types/supabase.js'
