/**
 * Current User Hook with Stripe Integration
 *
 * Fetches current user data including Stripe customer ID from the database
 * Used for Customer Portal access and subscription management
 *
 * Pattern: Follows TenantFlow's standard TanStack Query hook pattern
 * Reference: apps/frontend/src/hooks/api/use-tenant.ts
 */

import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../../lib/api-client'

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
		queryFn: () => usersApi.getCurrentUser(),
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: 1
	})
}
