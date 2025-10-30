/**
 * Native Supabase Auth hooks using React Query
 * Direct integration without backend API layer
 */
import { createClient } from '#lib/supabase/client'
import type { LoginCredentials, SignupFormData } from '@repo/shared/types/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
		staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
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
		staleTime: 5 * 60 * 1000 // Consider fresh for 5 minutes
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
			toast.success('Welcome back!', {
				description: `Logged in as ${data.user.email}`
			})

			// Redirect to dashboard
			router.push('/manage')
		},
		onError: (error: Error) => {
			toast.error('Login failed', {
				description: error.message
			})
		}
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
		onError: (error: Error) => {
			toast.error('Signup failed', {
				description: error.message
			})
		}
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

			toast.success('Logged out successfully')
			router.push('/login')
		},
		onError: (error: Error) => {
			toast.error('Logout failed', {
				description: error.message
			})
		}
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
		onSuccess: () => {
			toast.success('Password reset email sent', {
				description: 'Please check your email for instructions.'
			})
		},
		onError: (error: Error) => {
			toast.error('Password reset failed', {
				description: error.message
			})
		}
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
			toast.success('Profile updated successfully')
		},
		onError: (error: Error) => {
			toast.error('Profile update failed', {
				description: error.message
			})
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
			staleTime: 5 * 60 * 1000
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
			staleTime: 5 * 60 * 1000
		})
	}
}
