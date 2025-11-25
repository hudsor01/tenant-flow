/**
 * Supabase Configuration
 * Centralized Supabase URL and key configurations.
 */

/**
 * Supabase project URL
 * Set via NEXT_PUBLIC_SUPABASE_URL environment variable
 */
export const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]

/**
 * Supabase public/anon key
 * Set via NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable
 */
export const SUPABASE_PUBLISHABLE_KEY = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]

/**
 * Validates that required Supabase configuration is present.
 * Throws an error if SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing.
 *
 * @throws Error if configuration is missing
 */
export function assertSupabaseConfig(): void {
	if (!SUPABASE_URL) {
		throw new Error(
			'NEXT_PUBLIC_SUPABASE_URL is not set. Please configure your Supabase project URL.'
		)
	}
	if (!SUPABASE_PUBLISHABLE_KEY) {
		throw new Error(
			'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. Please configure your Supabase publishable key.'
		)
	}
}
