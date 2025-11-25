'use client'

/**
 * Consolidated Auth Hooks
 *
 * Combines functionality from:
 * - use-auth.ts (cache utils, sign out)
 * - use-current-user.ts (user with Stripe customer ID)
 * - use-supabase-auth.ts (Supabase auth operations)
 *
 * Single source of truth for all authentication operations
 */

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { clientFetch } from '#lib/api/client'
import { authQueryKeys as authProviderKeys } from '#providers/auth-provider'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { LoginCredentials, SignupFormData } from '@repo/shared/types/auth'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

// Create browser client for authentication
const supabase = getSupabaseClientInstance()

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

// Use provider keys for compatibility
const authQueryKeys = authProviderKeys

// Single source of truth for auth query configurations
export const authQueries = {
	session: () =>
		queryOptions({
			queryKey: authQueryKeys.session,
			queryFn: async () => {
				const {
					data: { session },
					error
				} = await supabase.auth.getSession()
				if (error) throw error
				return session
			},
			...QUERY_CACHE_TIMES.DETAIL
		}),
	user: () =>
		queryOptions({
			queryKey: authKeys.me,
			queryFn: () => clientFetch<User>('/api/v1/users/me'),
			retry: 1,
			...QUERY_CACHE_TIMES.DETAIL
		}),
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
			// Get current user ID before clearing
			const currentUserId = queryClient.getQueryData<SupabaseUser>(authQueryKeys.user)?.id

			// Set auth data to null
			queryClient.setQueryData(authQueryKeys.session, null)
			queryClient.setQueryData(authQueryKeys.user, null)

			// Invalidate all auth-related queries
			queryClient.invalidateQueries({ queryKey: ['auth'] })

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
				queryClient.invalidateQueries({ queryKey: authQueryKeys.session }),
				queryClient.invalidateQueries({ queryKey: authQueryKeys.user })
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
	const sessionData = queryClient.getQueryData(authQueryKeys.session) as
		| Session
		| null
		| undefined
	const userData = queryClient.getQueryData(authQueryKeys.user) as
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
 *
 * @example
 * const { data: user } = useUser()
 * if (user?.stripe_customer_id) {
 *   // Show Customer Portal
 * }
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
 *
 * @example
 * const { data: user } = useSupabaseUser()
 * if (user?.id) {
 *   // User is authenticated
 * }
 */
export function useSupabaseUser() {
	return useQuery(authQueries.supabaseUser())
}

/**
 * Sign out mutation with comprehensive cache clearing
 */
export function useSignOut() {
	const { clearAuthData } = useAuthCacheUtils()

	return useMutation({
		mutationFn: async () => {
			const { error } = await supabase.auth.signOut()
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

/**
 * Login mutation
 */
export function useSupabaseLogin() {
	const queryClient = useQueryClient()
	const router = useRouter()

	return useMutation({
		mutationFn: async (credentials: LoginCredentials) => {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: credentials.email,
				password: credentials.password
			})

			if (error) throw error
			return data
		},
		onSuccess: data => {
			// Invalidate and refetch user queries
			queryClient.invalidateQueries({ queryKey: authKeys.supabase.all })

			// Show success message
			handleMutationSuccess('Login', `Logged in as ${data.user.email}`)

			// Redirect to dashboard
			router.push('/')
		},
		onError: (error: Error) => handleMutationError(error, 'Login')
	})
}

/**
 * Signup mutation
 */
export function useSupabaseSignup() {
	const queryClient = useQueryClient()
	const router = useRouter()

	return useMutation({
		mutationFn: async (data: SignupFormData) => {
			const { email, password, firstName, lastName, company } = data

			const { data: authData, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						first_name: firstName,
						last_name: lastName,
						company: company || null
					}
				}
			})

			if (error) throw error
			return authData
		},
		onSuccess: data => {
			// Invalidate and refetch user queries
			queryClient.invalidateQueries({ queryKey: authKeys.supabase.all })

			if (!data.user?.confirmed_at) {
				toast.success('Account created!', {
					description: 'Please check your email to confirm your account.'
				})
				router.push('/auth/confirm-email')
			} else {
				toast.success('Welcome to TenantFlow!', {
					description: 'Your account has been created successfully.'
				})
				router.push('/')
			}
		},
		onError: (error: Error) => handleMutationError(error, 'Signup')
	})
}

/**
 * Password reset request mutation
 */
export function useSupabasePasswordReset() {
	return useMutation({
		mutationFn: async (email: string) => {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`
			})
			if (error) throw error
		},
		onSuccess: () => handleMutationSuccess('Password reset', 'Please check your email for instructions'),
		onError: (error: Error) => handleMutationError(error, 'Password reset')
	})
}

/**
 * Update user profile mutation
 */
export function useSupabaseUpdateProfile() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (updates: {
			first_name?: string
			last_name?: string
			phone?: string
			company?: string
		}) => {
			const { data, error } = await supabase.auth.updateUser({
				data: updates
			})
			if (error) throw error
			return data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: authKeys.supabase.user() })
			handleMutationSuccess('Update profile')
		},
		onError: (error: Error) => handleMutationError(error, 'Update profile')
	})
}

/**
 * Change password mutation
 */
export function useChangePassword() {
	return useMutation({
		mutationFn: async ({
			currentPassword,
			newPassword
		}: {
			currentPassword: string
			newPassword: string
		}) => {
			// First verify current password by attempting to sign in
			const {
				data: { user },
				error: userError
			} = await supabase.auth.getUser()
			if (userError || !user?.email) {
				throw new Error('User not authenticated')
			}

			// Verify current password
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: currentPassword
			})

			if (signInError) {
				throw new Error('Current password is incorrect')
			}

			// Update to new password
			const { data, error } = await supabase.auth.updateUser({
				password: newPassword
			})

			if (error) throw error
			return data
		},
		onSuccess: () => {
			handleMutationSuccess('Change password', 'Your password has been updated successfully')
		},
		onError: (error: Error) => {
			handleMutationError(error, 'Change password')
		}
	})
}

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Hook for prefetching auth session
 */
export function usePrefetchAuthSession() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(authQueries.session())
	}
}

/**
 * Hook for prefetching current user (with Stripe data)
 */
export function usePrefetchUser() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: authKeys.me,
			queryFn: () => clientFetch<User>('/api/v1/users/me'),
			...QUERY_CACHE_TIMES.DETAIL,
		})
	}
}

/**
 * Hook for prefetching Supabase user
 */
export function usePrefetchSupabaseUser() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(authQueries.supabaseUser())
	}
}

/**
 * Hook for prefetching Supabase session
 */
export function usePrefetchSupabaseSession() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(authQueries.supabaseSession())
	}
}
