'use client'

import { createClient } from '@/lib/supabase/client'
import { authQueryKeys as authProviderKeys } from '@/providers/auth-provider'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { Session, User } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// Create browser client for authentication
const supabaseClient = createClient()

/**
 * Query keys for auth operations
 * Hierarchical pattern for selective cache invalidation
 */
export const authKeys = {
	all: ['auth'] as const,
	session: () => [...authKeys.all, 'session'] as const,
	user: () => [...authKeys.all, 'user'] as const
}

// Use provider keys for compatibility
const authQueryKeys = authProviderKeys

// Enhanced cache invalidation utilities (keep React Query benefits)
export function useAuthCacheUtils() {
	const queryClient = useQueryClient()

	return {
		// Invalidate all auth-related queries
		invalidateAuth: () => {
			queryClient.invalidateQueries({ queryKey: ['auth'] })
		},

		// Invalidate specific auth query types
		invalidateSession: () => {
			queryClient.invalidateQueries({ queryKey: authQueryKeys.session })
		},

		invalidateUser: () => {
			queryClient.invalidateQueries({ queryKey: authQueryKeys.user })
		},

		// Clear auth data and all dependent queries
		clearAuthData: () => {
			queryClient.setQueryData(authQueryKeys.session, null)
			queryClient.setQueryData(authQueryKeys.user, null)

			// CRITICAL: Clear ALL user-specific data to prevent cross-user data leakage
			// This ensures new users don't see cached data from previous sessions
			queryClient.invalidateQueries({
				predicate: query => {
					const queryKey = query.queryKey[0] as string
					return [
						'dashboard',
						'properties',
						'tenants',
						'maintenance',
						'billing',
						'payment',
						'leases',
						'units',
						'analytics'
					].includes(queryKey)
				}
			})

			// Also clear localStorage cache to ensure fresh start
			if (typeof window !== 'undefined') {
				try {
					localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE')
					logger.info('Cleared offline cache on logout', {
						action: 'clear_offline_cache'
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
				queryClient.invalidateQueries({ queryKey: authQueryKeys.session }),
				queryClient.invalidateQueries({ queryKey: authQueryKeys.user })
			])
		}
	}
}

// Auth mutations for better cache management (keep React Query mutation benefits)
export function useSignOut() {
	const { clearAuthData } = useAuthCacheUtils()

	return useMutation({
		mutationFn: async () => {
			const { error } = await supabaseClient.auth.signOut()
			if (error) throw error
		},
		onSuccess: () => {
			// CRITICAL: Clear all cached data to prevent data leakage between users
			clearAuthData()

			// Auth state will be automatically handled by onAuthStateChange in AuthProvider
			logger.info('User signed out successfully - all cache cleared', {
				action: 'sign_out_success'
			})
		},
		onError: error => {
			logger.error('Sign out failed', {
				action: 'sign_out_error',
				metadata: { error: error.message }
			})
		}
	})
}

// Simple auth hook that aligns with official Supabase patterns but keeps React Query benefits
export function useCurrentUser() {
	const queryClient = useQueryClient()
	const sessionData = queryClient.getQueryData(authQueryKeys.session) as
		| Session
		| null
		| undefined
	const userData = queryClient.getQueryData(authQueryKeys.user) as
		| User
		| null
		| undefined

	return {
		user: userData || sessionData?.user || null,
		userId: userData?.id || sessionData?.user?.id || null,
		session: sessionData,
		isAuthenticated: !!(userData || sessionData?.user)
	}
}

/**
 * Hook for prefetching auth session
 */
export function usePrefetchAuthSession() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: authQueryKeys.session,
			staleTime: 5 * 60 * 1000
		})
	}
}
