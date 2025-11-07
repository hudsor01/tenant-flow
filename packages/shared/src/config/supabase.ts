/**
 * Supabase Configuration
 * Centralized Supabase URL and key configuration with build-time validation.
 */

/**
 * Validates and returns the Supabase URL from environment variables.
 * Prefers SUPABASE_URL for server contexts, falls back to NEXT_PUBLIC_SUPABASE_URL for browser builds.
 * Throws an error at build time if neither environment variable is present.
 */
function getSupabaseUrl(): string {
	// Prefer server env var, fall back to Next.js public env var
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL

	if (!url) {
		throw new Error(
			'SUPABASE_URL environment variable is required. ' +
				'Please set it in your environment variables (or NEXT_PUBLIC_SUPABASE_URL for browser builds).'
		)
	}

	return url
}

/**
 * Validates and returns the Supabase publishable key from environment variables.
 * Prefers SUPABASE_PUBLISHABLE_KEY for server contexts, falls back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for browser builds.
 * Throws an error at build time if neither environment variable is present.
 */
function getSupabasePublishableKey(): string {
	// Prefer server env var, fall back to Next.js public env var
	const key =
		process.env.SUPABASE_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

	if (!key) {
		throw new Error(
			'SUPABASE_PUBLISHABLE_KEY environment variable is required. ' +
				'Please set it in your environment variables (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for browser builds).'
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
 * import { SUPABASE_URL } from '@repo/shared/config/supabase'
 *
 * const client = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
 * ```
 */
export const SUPABASE_URL = (() => {
	// Allow builds to proceed without env vars when explicitly skipped
	if (process.env.SKIP_ENV_VALIDATION === 'true') {
		return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
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
 * import { SUPABASE_PUBLISHABLE_KEY } from '@repo/shared/config/supabase'
 *
 * const client = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
 * ```
 */
export const SUPABASE_PUBLISHABLE_KEY = (() => {
	// Allow builds to proceed without env vars when explicitly skipped
	if (process.env.SKIP_ENV_VALIDATION === 'true') {
		return (
			process.env.SUPABASE_PUBLISHABLE_KEY ||
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
			''
		)
	}
	return getSupabasePublishableKey()
})()
