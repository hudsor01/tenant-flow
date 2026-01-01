'use client'

/**
 * Auth Hooks & Query Options
 * TanStack Query hooks for authentication with colocated query options
 *
 * Combines functionality from:
 * - Auth cache utilities
 * - User with Stripe customer ID queries
 * - Supabase auth operations
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '#lib/supabase/client'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { logger } from '@repo/shared/lib/frontend-logger'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { LoginCredentials, SignupFormData, AuthSession } from '@repo/shared/types/auth'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'

// Create browser client for authentication
const supabase = createClient()

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
			queryFn: () => apiRequest<AuthSession>('/api/v1/auth/session'),
			...QUERY_CACHE_TIMES.DETAIL,
			retry: false // Auth failures shouldn't retry
		}),

	/**
	 * User with Stripe customer ID from database
	 */
	user: () =>
		queryOptions({
			queryKey: authKeys.me,
			queryFn: () => apiRequest<UserWithStripe>('/api/v1/users/me'),
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Supabase auth user (direct Supabase call - no NestJS)
	 */
	supabaseUser: () =>
		queryOptions({
			queryKey: authKeys.supabase.user(),
			queryFn: async () => {
				const supabase = createClient()
				const {
					data: { user },
					error
				} = await supabase.auth.getUser()
				if (error) throw error
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
			queryClient.invalidateQueries({ queryKey: ['auth'] })
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

			// Set auth data to null
			queryClient.setQueryData(authKeys.session(), null)
			queryClient.setQueryData(authKeys.user(), null)

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

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Sign out mutation with comprehensive cache clearing
 */
export function useSignOutMutation() {
	const { clearAuthData } = useAuthCacheUtils()

	return useMutation({
		mutationKey: mutationKeys.auth.logout,
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
export function useSupabaseLoginMutation() {
	const queryClient = useQueryClient()
	const router = useRouter()

	return useMutation({
		mutationKey: mutationKeys.auth.login,
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
export function useSupabaseSignupMutation() {
	const queryClient = useQueryClient()
	const router = useRouter()

	return useMutation({
		mutationKey: mutationKeys.auth.signup,
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
export function useSupabasePasswordResetMutation() {
	return useMutation({
		mutationKey: mutationKeys.auth.resetPassword,
		mutationFn: async (email: string) => {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`
			})
			if (error) throw error
		},
		onSuccess: () =>
			handleMutationSuccess(
				'Password reset',
				'Please check your email for instructions'
			),
		onError: (error: Error) => handleMutationError(error, 'Password reset')
	})
}

/**
 * Update user profile mutation
 */
export function useSupabaseUpdateProfileMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.auth.updateProfile,
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
export function useChangePasswordMutation() {
	return useMutation({
		mutationKey: mutationKeys.auth.updatePassword,
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
			handleMutationSuccess(
				'Change password',
				'Your password has been updated successfully'
			)
		},
		onError: (error: Error) => {
			handleMutationError(error, 'Change password')
		}
	})
}

