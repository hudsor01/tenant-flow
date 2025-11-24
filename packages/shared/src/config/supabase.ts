/**
 * Supabase Configuration
 * Centralized Supabase URL and key configuration with build-time validation.
 */

/**
 * Validates and returns the Supabase URL from environment variables.
 * Follows official Supabase docs naming convention.
 * Falls back to custom names for backward compatibility with Doppler.
 * Throws an error at build time if no environment variable is present.
 */
function getSupabaseUrl(): string {
	const url =
		process.env['NEXT_PUBLIC_SUPABASE_URL'] || // Official Supabase naming (browser)
		process.env['SUPABASE_URL'] ||              // Official Supabase naming (server)
		process.env['NEXT_PUBLIC_SUPABASE_URL'] ||  // Custom naming (browser) - backward compat
		process.env['SUPABASE_URL']                 // Custom naming (server) - backward compat

	if (!url) {
		throw new Error(
			'Supabase URL environment variable is required. ' +
				'Set NEXT_PUBLIC_SUPABASE_URL (official) or NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL (custom).'
		)
	}

	return url
}

/**
 * Validates and returns the Supabase publishable key from environment variables.
 * Follows official Supabase docs naming convention.
 * Falls back to custom names for backward compatibility with Doppler.
 * Throws an error at build time if no environment variable is present.
 */
function getSupabasePublishableKey(): string {
	const key =
		process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] || // Official Supabase naming (browser)
		process.env['SUPABASE_PUBLISHABLE_KEY'] || // Official Supabase naming (server)
		process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] || // Custom naming (browser) - backward compat
		process.env['SUPABASE_PUBLISHABLE_KEY']                    // Custom naming (server) - backward compat

	if (!key) {
		throw new Error(
			'Supabase publishable key environment variable is required. ' +
				'Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (official) or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/SUPABASE_PUBLISHABLE_KEY (custom).'
		)
	}

	return key
}

/**
 * Supabase URL constant - validated at build time.
 *
 * **Single source of truth for Supabase URL**
 *
 * - Production: Set via Doppler/environment variables
 * - Development: Set via .env.local or Doppler
 * - Build-time: Validated to prevent runtime errors
 */
export const SUPABASE_URL = (() => {
	if (process.env["SKIP_ENV_VALIDATION"] === 'true') {
		return (
			process.env["NEXT_PUBLIC_SUPABASE_URL"] ||      // Official naming (browser)
			process.env["SUPABASE_URL"] ||                  // Official naming (server)
			process.env["NEXT_PUBLIC_SUPABASE_URL"] ||            // Custom naming (browser)
			process.env["SUPABASE_URL"] ||                        // Custom naming (server)
			''
		)
	}
	return getSupabaseUrl()
})()

/**
 * Supabase publishable key constant - validated at build time.
 *
 * **Single source of truth for Supabase publishable key**
 *
 * - Production: Set via Doppler/environment variables
 * - Development: Set via .env.local or Doppler
 * - Build-time: Validated to prevent runtime errors
 */
export const SUPABASE_PUBLISHABLE_KEY = (() => {
	if (process.env["SKIP_ENV_VALIDATION"] === 'true') {
		return (
			process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||       // Official naming (browser)
			process.env["SUPABASE_PUBLISHABLE_KEY"] ||                   // Official naming (server)
			process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||      // Custom naming (browser)
			process.env["SUPABASE_PUBLISHABLE_KEY"] ||                  // Custom naming (server)
			''
		)
	}
	return getSupabasePublishableKey()
})()

/**
 * Validates that Supabase configuration is properly set.
 *
 * **Warning**: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY may be empty when
 * SKIP_ENV_VALIDATION === 'true'. Consumers must call this function before
 * creating Supabase clients to ensure configuration is valid.
 *
 * @throws {Error} If SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is falsy
 */
export function assertSupabaseConfig(): void {
	if (!SUPABASE_URL) {
		throw new Error(
			'Supabase URL is not configured. ' +
			'Set SUPABASE_URL (Doppler/production) or SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL (local dev).'
		)
	}

	if (!SUPABASE_PUBLISHABLE_KEY) {
		throw new Error(
			'Supabase publishable key is not configured. ' +
			'Set SUPABASE_PUBLISHABLE_KEY (Doppler/production) or SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (local dev).'
		)
	}
}
