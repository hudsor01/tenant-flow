/**
 * Supabase Configuration
 * Centralized Supabase URL and key configuration with build-time validation.
 */

/**
 * Validates and returns the Supabase URL from environment variables.
 * Throws an error at build time if NEXT_PUBLIC_SUPABASE_URL is missing.
 */
function getSupabaseUrl(): string {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL

	if (!url) {
		throw new Error(
			'NEXT_PUBLIC_SUPABASE_URL environment variable is required. ' +
				'Please set it in your environment variables.'
		)
	}

	return url
}

/**
 * Validates and returns the Supabase publishable key from environment variables.
 * Throws an error at build time if NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.
 */
function getSupabasePublishableKey(): string {
	const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

	if (!key) {
		throw new Error(
			'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable is required. ' +
				'Please set it in your environment variables.'
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
export const SUPABASE_URL = getSupabaseUrl()

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
export const SUPABASE_PUBLISHABLE_KEY = getSupabasePublishableKey()
