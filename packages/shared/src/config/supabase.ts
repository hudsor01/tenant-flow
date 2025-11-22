/**
 * Supabase Configuration
 * Centralized Supabase URL and key configuration with build-time validation.
 */

/**
 * Validates and returns the Supabase URL from environment variables.
 * Prefers SB_URL for server contexts, falls back to NEXT_PUBLIC_SB_URL for browser builds.
 * Throws an error at build time if neither environment variable is present.
 */
function getSupabaseUrl(): string {
	const url =
		process.env["NEXT_PUBLIC_SB_URL"] ||
		process.env["SB_URL"]

	if (!url) {
		throw new Error(
			'Supabase URL environment variable is required. ' +
				'Set NEXT_PUBLIC_SB_URL (Doppler frontend) or SB_URL (Doppler backend).'
		)
	}

	return url
}

/**
 * Validates and returns the Supabase publishable key from environment variables.
 * Prefers SB_PUBLISHABLE_KEY for server contexts, falls back to NEXT_PUBLIC_SB_PUBLISHABLE_KEY for browser builds.
 * Throws an error at build time if neither environment variable is present.
 */
function getSupabasePublishableKey(): string {
	const key =
		process.env["NEXT_PUBLIC_SB_PUBLISHABLE_KEY"] ||
		process.env["SB_PUBLISHABLE_KEY"]

	if (!key) {
		throw new Error(
			'Supabase publishable key environment variable is required.'
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
export const SB_URL = (() => {
	if (process.env["SKIP_ENV_VALIDATION"] === 'true') {
		return (
			process.env["NEXT_PUBLIC_SB_URL"] ||
			process.env["SB_URL"] ||
			process.env["NEXT_PUBLIC_SUPABASE_URL"] ||
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
export const SB_PUBLISHABLE_KEY = (() => {
	if (process.env["SKIP_ENV_VALIDATION"] === 'true') {
		return (
			process.env["NEXT_PUBLIC_SB_PUBLISHABLE_KEY"] ||
			process.env["SB_PUBLISHABLE_KEY"]
		)
	}
	return getSupabasePublishableKey()
})()

/**
 * Validates that Supabase configuration is properly set.
 *
 * **Warning**: SB_URL and SB_PUBLISHABLE_KEY may be empty when
 * SKIP_ENV_VALIDATION === 'true'. Consumers must call this function before
 * creating Supabase clients to ensure configuration is valid.
 *
 * @throws {Error} If SB_URL or SB_PUBLISHABLE_KEY is falsy
 */
export function assertSupabaseConfig(): void {
	if (!SB_URL) {
		throw new Error(
			'Supabase URL is not configured. ' +
			'Set SB_URL (Doppler/production) or SB_URL/NEXT_PUBLIC_SB_URL (local dev).'
		)
	}

	if (!SB_PUBLISHABLE_KEY) {
		throw new Error(
			'Supabase publishable key is not configured. ' +
			'Set SB_PUBLISHABLE_KEY (Doppler/production) or SB_PUBLISHABLE_KEY/NEXT_PUBLIC_SB_PUBLISHABLE_KEY (local dev).'
		)
	}
}
