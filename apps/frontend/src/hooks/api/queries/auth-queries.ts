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
			queryKey: [...authQueries.all(), 'session'],
			queryFn: () => clientFetch<AuthSession>('/api/v1/auth/session'),
			...QUERY_CACHE_TIMES.DETAIL,
			retry: false, // Auth failures shouldn't retry
		})
}