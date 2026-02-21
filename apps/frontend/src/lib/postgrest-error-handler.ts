/**
 * PostgREST Error Handler
 *
 * Shared utility for handling PostgrestError from Supabase PostgREST calls.
 * Shows a domain-specific toast notification and captures the full error to Sentry.
 * Always throws so TanStack Query registers the mutation/query as failed.
 *
 * Usage:
 * ```typescript
 * const { data, error } = await supabase.from('properties').select()
 * if (error) handlePostgrestError(error, 'properties')
 * ```
 */

import * as Sentry from '@sentry/nextjs'
import type { PostgrestError } from '@supabase/supabase-js'
import { toast } from 'sonner'

/**
 * Map PostgrestError codes to user-friendly messages
 */
function getErrorMessage(error: PostgrestError): string {
	switch (error.code) {
		case '23505':
			return 'This record already exists'
		case '23503':
			return 'Cannot complete: related record is in use'
		case '42501':
			return 'You do not have permission for this action'
		case 'PGRST116':
			return 'Record not found'
		default:
			return error.message
	}
}

/**
 * Handle a PostgREST error by showing a toast and capturing to Sentry.
 * Returns never because it always throws the original error.
 *
 * @param error - The PostgrestError from a Supabase PostgREST call
 * @param domain - Human-readable domain context (e.g. 'properties', 'tenants')
 */
export function handlePostgrestError(
	error: PostgrestError,
	domain: string
): never {
	const friendlyMessage = getErrorMessage(error)

	toast.error(`Failed to update ${domain}: ${friendlyMessage}`)

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
