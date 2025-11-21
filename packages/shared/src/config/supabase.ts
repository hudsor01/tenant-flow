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
	// Doppler integration requires SB_ prefix (Supabase blocks SB_ prefix)
	// Fallback to SB_* for local development
	const url =
		process.env["SB_URL"] ||
		process.env["SB_URL"] ||
		process.env["NEXT_PUBLIC_SB_URL"]

	if (!url) {
		throw new Error(
			'Supabase URL environment variable is required. ' +
				'Set SB_URL (Doppler/production) or SB_URL/NEXT_PUBLIC_SB_URL (local dev).'
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
	// Doppler integration requires SB_ prefix (Supabase blocks SB_ prefix)
	// Fallback to SB_* for local development
	const key =
		process.env["SB_PUBLISHABLE_KEY"] ||
		process.env["SB_PUBLISHABLE_KEY"] ||
		process.env["NEXT_PUBLIC_SB_PUBLISHABLE_KEY"]

	if (!key) {
		throw new Error(
			'Supabase publishable key environment variable is required. ' +
				'Set SB_PUBLISHABLE_KEY (Doppler/production) or SB_PUBLISHABLE_KEY/NEXT_PUBLIC_SB_PUBLISHABLE_KEY (local dev).'
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
 *
 * @example
 * ```typescript
 * import { SB_URL } from '@repo/shared/config/supabase'
 *
 * const client = createBrowserClient(SB_URL, SB_PUBLISHABLE_KEY)
 * ```
 */
export const SB_URL = (() => {
	// Allow builds to proceed without env vars when explicitly skipped
	if (process.env["SKIP_ENV_VALIDATION"] === 'true') {
		return (
			process.env["SB_URL"] ||
			process.env["SB_URL"] ||
			process.env["NEXT_PUBLIC_SB_URL"] ||
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
 *
 * @example
 * ```typescript
 * import { SB_PUBLISHABLE_KEY } from '@repo/shared/config/supabase'
 *
 * const client = createBrowserClient(SB_URL, SB_PUBLISHABLE_KEY)
 * ```
 */
export const SB_PUBLISHABLE_KEY = (() => {
	// Allow builds to proceed without env vars when explicitly skipped
	if (process.env["SKIP_ENV_VALIDATION"] === 'true') {
		return (
			process.env["SB_PUBLISHABLE_KEY"] ||
			process.env["SB_PUBLISHABLE_KEY"] ||
			process.env["NEXT_PUBLIC_SB_PUBLISHABLE_KEY"] ||
			''
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
 *
 * @example
 * ```typescript
 * import { assertSupabaseConfig, SB_URL, SB_PUBLISHABLE_KEY } from '@repo/shared/config/supabase'
 *
 * // Before creating client
 * assertSupabaseConfig()
 * const client = createBrowserClient(SB_URL, SB_PUBLISHABLE_KEY)
 * ```
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
