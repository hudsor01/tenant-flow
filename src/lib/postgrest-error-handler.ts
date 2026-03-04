/**
 * PostgREST Error Handler
 *
 * Shared utility for handling PostgrestError from Supabase PostgREST calls.
 * Captures the error to Sentry and throws so TanStack Query registers the failure.
 *
 * IMPORTANT: This function does NOT show a toast. The single toast is shown by
 * handleMutationError in the mutation's onError callback. This prevents the
 * double-toast pattern where both handlePostgrestError and onError fire toasts.
 *
 * Usage:
 * ```typescript
 * const { data, error } = await supabase.from('properties').select()
 * if (error) handlePostgrestError(error, 'properties')
 * ```
 */

import * as Sentry from '@sentry/nextjs'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Handle a PostgREST error by capturing to Sentry and throwing.
 * No user-facing side effects (no toast) — callers handle UI feedback.
 * Returns never because it always throws the original error.
 *
 * @param error - The PostgrestError from a Supabase PostgREST call
 * @param domain - Human-readable domain context (e.g. 'properties', 'tenants')
 */
export function handlePostgrestError(
	error: PostgrestError,
	domain: string
): never {
	Sentry.captureException(
		new Error(`PostgREST error in ${domain}: ${error.message}`),
		{
			extra: {
				code: error.code,
				details: error.details,
				hint: error.hint,
				domain
			}
		}
	)

	throw error
}
