/**
 * Current User Hook with Stripe Integration
 *
 * Fetches current user data including Stripe customer ID from the database
 * Used for Customer Portal access and subscription management
 *
 * Pattern: Follows TenantFlow's standard TanStack Query hook pattern
 * Reference: apps/frontend/src/hooks/api/use-tenant.ts
 */

import { API_BASE_URL } from '#lib/api-config'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
		queryFn: async (): Promise<User> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch current user')
			}
			return res.json()
		},
		staleTime: 5 * 60 * 1000,
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
			queryFn: async (): Promise<User> => {
				const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
					credentials: 'include'
				})
				if (!res.ok) {
					throw new Error('Failed to fetch current user')
				}
				return res.json()
			},
			staleTime: 5 * 60 * 1000
		})
	}
}
