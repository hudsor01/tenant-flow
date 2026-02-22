/**
 * PostgREST Feature Flag
 *
 * Controls whether hooks use Supabase PostgREST direct or NestJS API.
 * Set NEXT_PUBLIC_USE_POSTGREST=true in Vercel environment variables to enable.
 * Removing or setting to any other value falls back to NestJS.
 *
 * This flag allows instant rollback without a redeploy if a regression is found.
 */

/**
 * Returns true when direct Supabase PostgREST calls should be used.
 * Returns false when NestJS API calls should be used (legacy path).
 */
export function isPostgrestEnabled(): boolean {
	return process.env.NEXT_PUBLIC_USE_POSTGREST === 'true'
}
