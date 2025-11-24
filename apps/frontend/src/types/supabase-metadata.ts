/**
 * Supabase metadata type definitions
 *
 * These types define the structure of app_metadata and user_metadata
 * stored in Supabase auth.users table and JWT tokens.
 */

/**
 * Supabase app_metadata type definition
 *
 * Stored in JWT and set by custom access token hook.
 * This is the authoritative source for user roles in production.
 */
export interface SupabaseAppMetadata {
	provider?: string
	providers?: string[]
	user_type?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
	org_id?: string
	organization_id?: string
}

/**
 * Supabase user_metadata type definition
 *
 * User-provided metadata stored in auth.users.
 * Used as fallback for user_type if not set in app_metadata.
 */
export interface SupabaseUserMetadata {
	name?: string
	full_name?: string
	avatar_url?: string
	user_type?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
	[key: string]: unknown
}
