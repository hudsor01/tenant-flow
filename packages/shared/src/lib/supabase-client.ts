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
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, assertSupabaseConfig } from '../config/supabase.js'

// Admin secret key (backend only, not in centralized config)
// Prefer new sb_secret_* key, fall back to deprecated SERVICE_ROLE
const SB_SECRET_KEY = process.env.SB_SECRET_KEY || process.env.SERVICE_ROLE

// Type alias for public-schema-only clients
// This prevents type errors when Database includes multiple schemas (public + stripe)
type PublicSupabaseClient = SupabaseClient<Database, "public">

// Use globalThis to persist singleton across VM contexts (important for vitest vmThreads)
// This prevents "Multiple GoTrueClient instances" warnings in tests
const GLOBAL_CLIENT_KEY = '__supabase_client__' as const

declare global {
	var __supabase_client__: PublicSupabaseClient | undefined
}

// Create a lazy-initialized client to avoid build-time errors
let _client: PublicSupabaseClient | null = null

function getSupabaseClient(): PublicSupabaseClient {
	// Check globalThis first for cross-VM persistence (vitest vmThreads)
	if (globalThis[GLOBAL_CLIENT_KEY]) {
		_client = globalThis[GLOBAL_CLIENT_KEY]
		return _client
	}

	if (_client) return _client

	// Validate config before creating client
	assertSupabaseConfig()

	// Detect test environment (jsdom doesn't fully support document.cookie)
	// @supabase/ssr's createBrowserClient requires proper cookie support
	const isTestEnvironment = typeof process !== 'undefined' && (
		process.env.VITEST === 'true' ||
		process.env.VITEST_INTEGRATION === 'true' ||
		process.env.NODE_ENV === 'test'
	)

	const isBrowser = typeof window !== 'undefined' && !isTestEnvironment

	// Use the SSR-aware browser client so PKCE code verifiers are stored in cookies.
	// This lets the Next.js `/auth/callback` route read the verifier server-side
	// and prevents "both auth code and code verifier should be non-empty" errors.
	if (isBrowser) {
		_client = createBrowserClient<Database>(
			SUPABASE_URL!, // Non-null: validated by assertSupabaseConfig()
			SUPABASE_PUBLISHABLE_KEY!, // Non-null: validated by assertSupabaseConfig()
			{
				db: { schema: 'public' }
			}
		) as unknown as PublicSupabaseClient
		// Store in globalThis for consistency
		globalThis[GLOBAL_CLIENT_KEY] = _client
		return _client
	}

	// Backend/Node/Test environments use the standard client
	// (jsdom in tests doesn't support document.cookie properly)
	_client = createClient<Database>(
		SUPABASE_URL!, // Non-null: validated by assertSupabaseConfig()
		SUPABASE_PUBLISHABLE_KEY!, // Non-null: validated by assertSupabaseConfig()
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
	) as unknown as PublicSupabaseClient

	// Store in globalThis for cross-VM persistence (vitest vmThreads)
	globalThis[GLOBAL_CLIENT_KEY] = _client

	return _client
}

// Export function to get client directly - better webpack compatibility
export function getSupabaseClientInstance(): PublicSupabaseClient {
	return getSupabaseClient()
}

/**
 * Server-side admin client with full database access
 * ONLY use this in backend services where you need to bypass RLS
 *
 * SECURITY WARNING: Never use this client with user input without validation
 * IMPORTANT: This will throw an error if used in frontend without SERVICE_ROLE
 */
export function getSupabaseAdmin(): PublicSupabaseClient {
	if (!SB_SECRET_KEY) {
		throw new Error(
			'SB_SECRET_KEY required for admin client - this should only be used in backend services'
		)
	}

	// Validate config before creating client
	assertSupabaseConfig()

	return createClient<Database>(
		SUPABASE_URL!, // Non-null: validated by assertSupabaseConfig()
		SB_SECRET_KEY,
		{
			auth: {
				persistSession: false,
				autoRefreshToken: false
			},
			db: {
				schema: 'public'
			}
		}
	) as unknown as PublicSupabaseClient
}

// For environments where admin client is needed, use getSupabaseAdmin()
// This prevents immediate initialization that would fail in frontend
let _adminClient: PublicSupabaseClient | null = null

// Export function for admin client - better webpack compatibility
export function getSupabaseAdminInstance(): PublicSupabaseClient {
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

/**
 * Exported alias for backward compatibility
 * Prefer using getSupabaseClientInstance() for better tree-shaking
 */
export const supabaseClient = getSupabaseClient()
