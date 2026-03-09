'use client'

/**
 * Auth Query Hooks & Query Options
 * TanStack Query hooks for authentication with colocated query options
 *
 * Mutation hooks are in use-auth-mutations.ts.
 * authKeys MUST stay in this file per CLAUDE.md rule.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'

import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '#lib/frontend-logger'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { AuthSession } from '#types/auth'

// NOTE: No module-level Supabase client — each mutation/query creates its own
// to avoid persisting a single client across requests (AUTH-06)

// ============================================================================
// TYPES
// ============================================================================

/**
 * User type with Stripe integration (from database /api/v1/users/me endpoint)
 * Distinct from AuthUser in shared types which is the Supabase auth user
 */
export interface UserWithStripe {
	id: string
	email: string
	stripe_customer_id: string | null
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Query keys for auth operations
 * Hierarchical pattern for selective cache invalidation
 */
export const authKeys = {
	all: ['auth'] as const,
	session: () => [...authKeys.all, 'session'] as const,
	user: () => [...authKeys.all, 'user'] as const,
	signoutCheck: ['auth', 'signout-check'] as const,
	// User with Stripe data from database
	me: () => ['user', 'me'] as const,
	// Supabase auth-specific keys
	supabase: {
		all: ['supabase-auth'] as const,
		user: () => ['supabase-auth', 'user'] as const,
		session: () => ['supabase-auth', 'session'] as const
	}
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Auth query factory
 */
export const authQueries = {
	/**
	 * Base key for all auth queries
	 */
	all: () => ['auth'] as const,

	/**
	 * Auth session query
	 */
	session: () =>
		queryOptions({
			queryKey: authKeys.session(),
			queryFn: async (): Promise<AuthSession | null> => {
				const supabase = createClient()
				const { data, error } = await supabase.auth.getSession()
				if (error) throw error
				return data.session as AuthSession | null
			},
			...QUERY_CACHE_TIMES.DETAIL,
			retry: false // Auth failures shouldn't retry
		}),

	/**
	 * User with Stripe customer ID from database
	 */
	user: () =>
		queryOptions({
			queryKey: authKeys.me(),
			queryFn: async (): Promise<UserWithStripe> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')
				const { data, error } = await supabase
					.from('users')
					.select('id, email, stripe_customer_id')
					.eq('id', user.id)
					.single()
				if (error) throw error
				return {
					id: data.id,
					email: data.email,
					stripe_customer_id: data.stripe_customer_id
				}
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Supabase auth user (direct Supabase call - no NestJS)
	 */
	supabaseUser: () =>
		queryOptions({
			queryKey: authKeys.supabase.user(),
			queryFn: async () => {
				const user = await getCachedUser()
				return user
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Supabase auth session (direct Supabase call - no NestJS)
	 */
	supabaseSession: () =>
		queryOptions({
			queryKey: authKeys.supabase.session(),
			queryFn: async () => {
				const supabase = createClient()
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

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Enhanced cache invalidation utilities
 */
export function useAuthCacheUtils() {
	const queryClient = useQueryClient()

	return {
		// Invalidate all auth-related queries
		invalidateAuth: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.all })
		},

		// Invalidate specific auth query types
		invalidateSession: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.session() })
		},

		invalidateUser: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.user() })
		},

		// Clear auth data and all dependent queries
		clearAuthData: () => {
			// Get current user ID before clearing
			const currentUserId = queryClient.getQueryData<SupabaseUser>(
				authKeys.user()
			)?.id

			// Set auth data to null across all namespaces
			queryClient.setQueryData(authKeys.session(), null)
			queryClient.setQueryData(authKeys.user(), null)
			queryClient.setQueryData(authKeys.me(), null)

			// Invalidate all auth-related queries (covers authKeys.all namespace)
			queryClient.invalidateQueries({ queryKey: authKeys.all })
			// Also invalidate supabase-auth namespace
			queryClient.invalidateQueries({ queryKey: authKeys.supabase.all })

			// Invalidate all user-scoped queries (those containing the userId in their key)
			// This prevents cross-user data leakage without indiscriminately clearing public data
			if (currentUserId) {
				queryClient.invalidateQueries({
					predicate: query => {
						// Check if query key contains the user ID
						return query.queryKey.some(key => key === currentUserId)
					}
				})
			}

			// Clear localStorage cache to ensure fresh start
			if (typeof window !== 'undefined') {
				try {
					localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE')
					logger.info('Cleared auth cache and user-scoped queries on logout', {
						action: 'clear_auth_cache',
						metadata: { userId: currentUserId }
					})
				} catch (error) {
					logger.warn('Failed to clear offline cache', {
						action: 'clear_offline_cache_failed',
						metadata: {
							error: error instanceof Error ? error.message : String(error)
						}
					})
				}
			}
		},

		// Refresh auth state after critical operations
		refreshAuthState: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: authKeys.session() }),
				queryClient.invalidateQueries({ queryKey: authKeys.user() })
			])
		}
	}
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get current user from React Query cache (from AuthProvider)
 * Lightweight hook that doesn't trigger additional requests
 */
export function useCurrentUser() {
	const queryClient = useQueryClient()
	const sessionData = queryClient.getQueryData(authKeys.session()) as
		| Session
		| null
		| undefined
	const userData = queryClient.getQueryData(authKeys.user()) as
		| SupabaseUser
		| null
		| undefined

	return {
		user: userData || sessionData?.user || null,
		user_id: userData?.id || sessionData?.user?.id || null,
		session: sessionData,
		isAuthenticated: !!(userData || sessionData?.user)
	}
}

/**
 * Fetch current user with Stripe customer ID from database
 *
 * Returns user with:
 * - id: Auth user ID
 * - email: Auth user email
 * - stripe_customer_id: Stripe customer ID (null if none)
 */
export function useUser() {
	return useQuery(authQueries.user())
}

/**
 * Get Supabase auth user
 *
 * Returns the authenticated user from Supabase auth.
 * Use this when you only need auth user data (id, email, metadata).
 * For user data with Stripe info, use useUser() instead.
 */
export function useSupabaseUser() {
	return useQuery(authQueries.supabaseUser())
}
