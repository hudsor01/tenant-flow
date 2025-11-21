/**
 * TenantFlow Typed Supabase Client
 *
 * Pre-configured Supabase clients with full type safety.
 * Use these instead of raw createClient calls throughout the application.
 */

import { createBrowserClient } from '@supabase/ssr'
import {
	createClient,
	type AuthError,
	type Session,
	type SupabaseClient,
	type User
} from '@supabase/supabase-js'
import type { Database } from '../types/supabase.js'
// Import from centralized config for consistent SB_* → SUPABASE_* → NEXT_PUBLIC_SUPABASE_* fallback
import { SB_URL, SB_PUBLISHABLE_KEY } from '../config/supabase.js'

// Admin secret key (backend only, not in centralized config)
const SB_SECRET_KEY = process.env.SB_SECRET_KEY || process.env.SUPABASE_SECRET_KEY

// Create a lazy-initialized client to avoid build-time errors
let _client: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> {
	if (_client) return _client

	const isBrowser = typeof window !== 'undefined'

	// Use the SSR-aware browser client so PKCE code verifiers are stored in cookies.
	// This lets the Next.js `/auth/callback` route read the verifier server-side
	// and prevents "both auth code and code verifier should be non-empty" errors.
	if (isBrowser) {
		_client = createBrowserClient<Database>(
			SB_URL,
			SB_PUBLISHABLE_KEY,
			{
				db: { schema: 'public' }
			}
		)
		return _client
	}

	// Backend/Node environments can keep using the standard client
	_client = createClient<Database>(SB_URL, SB_PUBLISHABLE_KEY, {
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
	get(_target, prop) {
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
 * IMPORTANT: This will throw an error if used in frontend without SB_SECRET_KEY
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
	if (!SB_SECRET_KEY) {
		throw new Error(
			'SB_SECRET_KEY required for admin client - this should only be used in backend services'
		)
	}

	return createClient<Database>(SB_URL!, SB_SECRET_KEY, {
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


export type {
	Database,
	Enums,
	Tables,
	TablesInsert,
	TablesUpdate
} from '../types/supabase.js'
