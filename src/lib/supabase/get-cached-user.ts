/**
 * Cached user accessor for non-React contexts (queryFn, mutationFn).
 *
 * Reads from the TanStack Query cache (same key AuthProvider populates)
 * to avoid redundant supabase.auth.getUser() network round-trips.
 *
 * Usage:
 *   const user = await getCachedUser()
 *   if (!user) throw new Error('Not authenticated')
 */

import type { QueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from './client'

let queryClientRef: QueryClient | null = null

/**
 * Register the QueryClient reference so getCachedUser can read the auth cache.
 * Called once from AuthStoreProvider on mount.
 */
export function setQueryClientRef(qc: QueryClient) {
	queryClientRef = qc
}

/**
 * Get the current authenticated user, preferring the TanStack Query cache.
 *
 * 1. If the QueryClient ref is set, reads ['auth', 'session'] from cache
 * 2. If cache hit with valid session, returns session.user (zero network calls)
 * 3. If cache miss, falls back to supabase.auth.getUser() (one network call)
 */
export async function getCachedUser(): Promise<User | null> {
	if (queryClientRef) {
		const session = queryClientRef.getQueryData<Session | null>([
			'auth',
			'session'
		])
		if (session?.user) return session.user
	}

	const supabase = createClient()
	const {
		data: { user }
	} = await supabase.auth.getUser()
	return user
}
