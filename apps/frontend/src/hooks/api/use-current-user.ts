/**
 * Current User Hook with Stripe Integration
 *
 * Fetches current user data including Stripe customer ID from the database
 * Used for Customer Portal access and subscription management
 *
 * Pattern: Follows TenantFlow's standard TanStack Query hook pattern
 * Reference: apps/frontend/src/hooks/api/use-tenant.ts
 */

import { clientFetch } from '#lib/api/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants'

/**
 * User type returned from API
 */
interface User {
	id: string
	email: string
	stripeCustomerId: string | null
}

/**
 * Query keys for current user data
 */
export const userKeys = {
	all: ['user'] as const,
	me: ['user', 'me'] as const
}

/**
 * Fetch current user with Stripe customer ID
 *
 * Returns user with:
 * - id: Auth user ID
 * - email: Auth user email
 * - stripeCustomerId: Stripe customer ID (null if none)
 *
 * @example
 * const { data: user } = useUser()
 * if (user?.stripeCustomerId) {
 *   // Show Customer Portal
 * }
 */
export function useUser() {
	return useQuery({
		queryKey: userKeys.me,
		queryFn: () => clientFetch<User>('/api/v1/users/me'),
		...QUERY_CACHE_TIMES.DETAIL,
		gcTime: 10 * 60 * 1000,
		retry: 1
	})
}

/**
 * Hook for prefetching current user
 */
export function usePrefetchUser() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: userKeys.me,
			queryFn: () => clientFetch<User>('/api/v1/users/me'),
			...QUERY_CACHE_TIMES.DETAIL,
		})
	}
}
