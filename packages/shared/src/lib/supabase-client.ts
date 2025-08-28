/**
 * TenantFlow Typed Supabase Client
 *
 * Pre-configured Supabase clients with full type safety.
 * Use these instead of raw createClient calls throughout the application.
 */

import {
	createClient,
	type SupabaseClient,
	type User,
	type Session,
	type AuthError
} from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

// ========================
// Client Configuration
// ========================

// Environment variables validation
const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL) {
	throw new Error('Missing SUPABASE_URL environment variable')
}

if (!SUPABASE_ANON_KEY) {
	throw new Error('Missing SUPABASE_ANON_KEY environment variable')
}

// ========================
// Typed Client Instances
// ========================

/**
 * Client-side Supabase client with anonymous/authenticated access
 * Use this in frontend components and client-side API calls
 */
export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
	SUPABASE_URL,
	SUPABASE_ANON_KEY,
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true
		},
		db: {
			schema: 'public'
		}
	}
)

/**
 * Server-side admin client with full database access
 * ONLY use this in backend services where you need to bypass RLS
 *
 * SECURITY WARNING: Never use this client with user input without validation
 */
export const supabaseAdmin: SupabaseClient<Database> = (() => {
	if (!SUPABASE_SERVICE_KEY) {
		throw new Error('SUPABASE_SERVICE_KEY required for admin client')
	}

	return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		},
		db: {
			schema: 'public'
		}
	})
})()

// ========================
// Direct Client Usage Only
// ========================
// ULTRA-NATIVE: Use supabaseClient and supabaseAdmin directly
// No factory functions - violates KISS principle

// ========================
// Type-Safe Query Helpers
// ========================

// ULTRA-NATIVE: Use Supabase query results directly
// No wrapper functions - handle .data and .error inline

// ========================
// Common Query Patterns
// ========================

/**
 * Get current authenticated user with type safety
 */
export async function getCurrentUser(): Promise<{
	user: User | null
	error: AuthError | null
}> {
	const {
		data: { user },
		error
	} = await supabaseClient.auth.getUser()
	return { user, error }
}

/**
 * Get user session with type safety
 */
export async function getCurrentSession(): Promise<{
	session: Session | null
	error: AuthError | null
}> {
	const {
		data: { session },
		error
	} = await supabaseClient.auth.getSession()
	return { session, error }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
	const { error } = await supabaseClient.auth.signOut()
	return { error }
}

// ========================
// ULTRA-NATIVE Multi-tenant
// ========================
// Use RLS policies directly - no wrapper classes
// Example: supabaseClient.from('Property').select('*').eq('organizationId', orgId)

// ========================
// Type Exports
// ========================

// Re-export useful types for consumers
export type { Database } from '../types/supabase'
export type {
	Tables,
	TablesInsert,
	TablesUpdate,
	Enums,
	QueryData,
	QueryError,
	TenantFlowUserMetadata,
	TenantFlowOrganizationSettings,
	TenantFlowPropertyMetadata
} from '../types/supabase'
