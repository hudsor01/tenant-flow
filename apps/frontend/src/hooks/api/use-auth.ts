'use client'

import { createClient } from '@/utils/supabase/client'
import { logger } from '@repo/shared'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'

// Create browser client for authentication
const supabaseClient = createClient()

// Query keys for auth
export const authQueryKeys = {
	session: ['auth', 'session'] as const,
	user: ['auth', 'user'] as const
}

// Get current session with TanStack Query
export function useAuthSession(options: { throwOnError?: boolean } = {}) {
	return useQuery({
		queryKey: authQueryKeys.session,
		queryFn: async () => {
			const { data: { session }, error } = await supabaseClient.auth.getSession()
			if (error) {
				logger.error('Failed to get auth session', {
					action: 'get_session_error',
					metadata: { error: error.message }
				})
				throw error
			}
			return session
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1,
		refetchOnWindowFocus: true,
		throwOnError: options.throwOnError ?? false
	})
}

// Get current user with TanStack Query
export function useAuthUser(options: { throwOnError?: boolean } = {}) {
	return useQuery({
		queryKey: authQueryKeys.user,
		queryFn: async () => {
			const { data: { user }, error } = await supabaseClient.auth.getUser()
			if (error) {
				logger.error('Failed to get auth user', {
					action: 'get_user_error',
					metadata: { error: error.message }
				})
				throw error
			}
			return user
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1,
		refetchOnWindowFocus: true,
		throwOnError: options.throwOnError ?? false
	})
}

// Hook to set up auth state change listener
export function useAuthStateListener() {
	const queryClient = useQueryClient()

	useEffect(() => {
		const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
			async (event: AuthChangeEvent, session: Session | null) => {
				// Update session query cache
				queryClient.setQueryData(authQueryKeys.session, session)

				// Update user query cache
				if (session?.user) {
					queryClient.setQueryData(authQueryKeys.user, session.user)
				} else {
					queryClient.setQueryData(authQueryKeys.user, null)
				}

				// Invalidate related queries on auth change
				if (event === 'SIGNED_IN') {
					queryClient.invalidateQueries({ queryKey: ['dashboard'] })
					queryClient.invalidateQueries({ queryKey: ['properties'] })
					queryClient.invalidateQueries({ queryKey: ['billing'] })
				} else if (event === 'SIGNED_OUT') {
					queryClient.clear() // Clear all queries on sign out
				}

				// Log auth events for debugging
				if (process.env.NODE_ENV === 'development') {
					logger.info('Auth state changed', {
						action: 'auth_state_change',
						metadata: { event, userId: session?.user?.id }
					})
				}
			}
		)

		return () => subscription.unsubscribe()
	}, [queryClient])
}

// Derived auth state hooks
export function useIsAuthenticated() {
	const { data: session, isLoading } = useAuthSession()
	return {
		isAuthenticated: !!session?.user,
		isLoading,
		session
	}
}

export function useRequireAuth() {
	const { isAuthenticated, isLoading, session } = useIsAuthenticated()

	return {
		isAuthenticated,
		isLoading,
		session,
		user: session?.user ?? null
	}
}

// Enhanced cache invalidation utilities
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
			// Clear all user-specific data
			queryClient.invalidateQueries({
				predicate: (query) => {
					const queryKey = query.queryKey[0] as string
					return ['dashboard', 'properties', 'tenants', 'maintenance', 'billing', 'payment'].includes(queryKey)
				}
			})
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

// Auth mutations for better cache management
export function useSignOut() {
	const { clearAuthData } = useAuthCacheUtils()

	return useMutation({
		mutationFn: async () => {
			const { error } = await supabaseClient.auth.signOut()
			if (error) throw error
		},
		onSuccess: () => {
			// Clear all cached data on sign out
			clearAuthData()
			logger.info('User signed out successfully', {
				action: 'sign_out_success'
			})
		},
		onError: (error) => {
			logger.error('Sign out failed', {
				action: 'sign_out_error',
				metadata: { error: error.message }
			})
		}
	})
}