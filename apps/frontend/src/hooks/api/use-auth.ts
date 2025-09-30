'use client'

import { authQueryKeys } from '@/stores/auth-provider'
import { createClient } from '@/utils/supabase/client'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { Session, User } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// Create browser client for authentication
const supabaseClient = createClient()

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

// Auth mutations for better cache management (keep React Query mutation benefits)
export function useSignOut() {
	return useMutation({
		mutationFn: async () => {
			const { error } = await supabaseClient.auth.signOut()
			if (error) throw error
		},
		onSuccess: () => {
			// Auth state will be automatically handled by onAuthStateChange in AuthProvider
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

// Simple auth hook that aligns with official Supabase patterns but keeps React Query benefits
export function useCurrentUser() {
	const queryClient = useQueryClient()
	const sessionData = queryClient.getQueryData(authQueryKeys.session) as Session | null | undefined
	const userData = queryClient.getQueryData(authQueryKeys.user) as User | null | undefined

	return {
		user: userData || sessionData?.user || null,
		userId: userData?.id || sessionData?.user?.id || null,
		session: sessionData,
		isAuthenticated: !!(userData || sessionData?.user)
	}
}