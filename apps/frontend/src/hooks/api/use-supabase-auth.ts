/**
 * Native Supabase Auth hooks using React Query
 * Direct integration without backend API layer
 */
import { createClient } from '#lib/supabase/client'
import type { LoginCredentials, SignupFormData } from '@repo/shared/types/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'

const supabase = createClient()

/**
 * Query keys for Supabase auth operations
 */
export const supabaseAuthKeys = {
	all: ['supabase-auth'] as const,
	user: () => [...supabaseAuthKeys.all, 'user'] as const,
	session: () => [...supabaseAuthKeys.all, 'session'] as const
}

/**
 * Hook to get current user from Supabase
 */
export function useSupabaseUser() {
	return useQuery({
		queryKey: supabaseAuthKeys.user(),
		queryFn: async () => {
			const {
				data: { user },
				error
			} = await supabase.auth.getUser()
			if (error) throw error
			return user
		},
		...QUERY_CACHE_TIMES.DETAIL, // Consider fresh for 5 minutes
		retry: 1
	})
}

/**
 * Hook to get current session from Supabase
 */
export function useSupabaseSession() {
	return useQuery({
		queryKey: supabaseAuthKeys.session(),
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

/**
 * Hook for login mutation
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
			queryClient.invalidateQueries({ queryKey: supabaseAuthKeys.all })

			// Show success message
			handleMutationSuccess('Login', `Logged in as ${data.user.email}`)

			// Redirect to dashboard
			router.push('/manage')
		},
		onError: (error: Error) => handleMutationError(error, 'Login')
	})
}

/**
 * Hook for signup mutation
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
						firstName,
						lastName,
						company: company || null
					}
				}
			})

			if (error) throw error
			return authData
		},
		onSuccess: data => {
			// Invalidate and refetch user queries
			queryClient.invalidateQueries({ queryKey: supabaseAuthKeys.all })

			if (!data.user?.confirmed_at) {
				toast.success('Account created!', {
					description: 'Please check your email to confirm your account.'
				})
				router.push('/auth/confirm-email')
			} else {
				toast.success('Welcome to TenantFlow!', {
					description: 'Your account has been created successfully.'
				})
				router.push('/manage')
			}
		},
		onError: (error: Error) => handleMutationError(error, 'Signup')
	})
}

/**
 * Hook for logout mutation
 */
export function useSupabaseLogout() {
	const queryClient = useQueryClient()
	const router = useRouter()

	return useMutation({
		mutationFn: async () => {
			const { error } = await supabase.auth.signOut()
			if (error) throw error
		},
		onSuccess: () => {
			// Clear all queries
			queryClient.clear()

			handleMutationSuccess('Logout')
			router.push('/login')
		},
		onError: (error: Error) => handleMutationError(error, 'Logout')
	})
}

/**
 * Hook for password reset request
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
 * Hook to update user profile
 */
export function useSupabaseUpdateProfile() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (updates: {
			firstName?: string
			lastName?: string
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
			queryClient.invalidateQueries({ queryKey: supabaseAuthKeys.user() })
			handleMutationSuccess('Update profile')
		},
		onError: (error: Error) => handleMutationError(error, 'Update profile')
	})
}

/**
 * Hook to change user password
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

/**
 * Hook for prefetching Supabase user
 */
export function usePrefetchSupabaseUser() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: supabaseAuthKeys.user(),
			queryFn: async () => {
				const {
					data: { user },
					error
				} = await supabase.auth.getUser()
				if (error) throw error
				return user
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

/**
 * Hook for prefetching Supabase session
 */
export function usePrefetchSupabaseSession() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: supabaseAuthKeys.session(),
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
}
