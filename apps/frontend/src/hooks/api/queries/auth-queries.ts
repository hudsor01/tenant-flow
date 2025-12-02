/**
 * Auth Query Options (TanStack Query v5 Pattern)
 *
 * Single source of truth for auth-related queries.
 * Reusable across components, server components, and prefetching.
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { AuthSession } from '@repo/shared/types/auth'
import { createClient } from '#utils/supabase/client'

// Create browser client for authentication
const supabase = createClient()

/**
 * User type with Stripe integration (from database)
 */
interface User {
	id: string
	email: string
	stripe_customer_id: string | null
}

/**
 * Query keys for auth operations
 * Hierarchical pattern for selective cache invalidation
 */
export const authKeys = {
	all: ['auth'] as const,
	session: () => [...authKeys.all, 'session'] as const,
	user: () => [...authKeys.all, 'user'] as const,
	// User with Stripe data from database
	me: ['user', 'me'] as const,
	// Supabase auth-specific keys
	supabase: {
		all: ['supabase-auth'] as const,
		user: () => ['supabase-auth', 'user'] as const,
		session: () => ['supabase-auth', 'session'] as const
	}
}

export const supabaseAuthKeys = authKeys.supabase

export const authQueries = {
	/**
	 * Base key for all auth queries
	 */
	all: () => ['auth'] as const,

	/**
	 * Auth session query
	 *
	 * @example
	 * const { data } = useQuery(authQueries.session())
	 */
	session: () =>
		queryOptions({
			queryKey: authKeys.session(),
			queryFn: () => clientFetch<AuthSession>('/api/v1/auth/session'),
			...QUERY_CACHE_TIMES.DETAIL,
			retry: false, // Auth failures shouldn't retry
		}),

	/**
	 * User with Stripe customer ID from database
	 *
	 * @example
	 * const { data } = useQuery(authQueries.user())
	 */
	user: () =>
		queryOptions({
			queryKey: authKeys.me,
			queryFn: () => clientFetch<User>('/api/v1/users/me'),
			retry: 1,
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Supabase auth user
	 *
	 * @example
	 * const { data } = useQuery(authQueries.supabaseUser())
	 */
	supabaseUser: () =>
		queryOptions({
			queryKey: authKeys.supabase.user(),
			queryFn: async () => {
				const {
					data: { user },
					error
				} = await supabase.auth.getUser()
				if (error) throw error
				return user
			},
			retry: 1,
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Supabase auth session
	 *
	 * @example
	 * const { data } = useQuery(authQueries.supabaseSession())
	 */
	supabaseSession: () =>
		queryOptions({
			queryKey: authKeys.supabase.session(),
			queryFn: async () => {
				const {
					data: { session },
					error
				} = await supabase.auth.getSession()
				if (error) throw error
				return session
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
}

// Re-export for backward compatibility
export const authQueryKeys = authKeys
