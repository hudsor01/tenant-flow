'use client'

/**
 * Auth Mutation Hooks
 * TanStack Query mutation hooks for authentication operations
 *
 * Split from use-auth.ts for the 300-line file size rule.
 * Query hooks and authKeys remain in use-auth.ts per CLAUDE.md rule.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { logger } from '#lib/frontend-logger.js'
import type { LoginCredentials, SignupFormData } from '#types/auth'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import { authKeys, useAuthCacheUtils } from './use-auth'

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
			const supabase = createClient()
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
			const supabase = createClient()
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
			const supabase = createClient()
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
			const supabase = createClient()
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/update-password`
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
			const supabase = createClient()
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
			const supabase = createClient()
			// First verify current password by attempting to sign in
			const user = await getCachedUser()
			if (!user?.email) {
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
