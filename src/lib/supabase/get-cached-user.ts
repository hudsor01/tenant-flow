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
import type { User } from '@supabase/supabase-js'
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
 * 1. If the QueryClient ref is set, reads ['auth', 'user'] from cache
 * 2. If cache hit with valid user, returns it directly (zero network calls)
 * 3. If cache miss, falls back to supabase.auth.getUser() (one network call, server-validated)
 */
export async function getCachedUser(): Promise<User | null> {
	if (queryClientRef) {
		const user = queryClientRef.getQueryData<User | null>([
			'auth',
			'user'
		])
		if (user) return user
	}

	const supabase = createClient()
	const {
		data: { user }
	} = await supabase.auth.getUser()
	return user
}
