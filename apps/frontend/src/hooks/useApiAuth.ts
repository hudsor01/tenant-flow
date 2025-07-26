// Frontend UI layer over tRPC backend auth logic
// This file handles UI concerns: navigation, notifications, combined state

import { useState } from 'react'
import { handleApiError } from '../lib/utils'
import { toast } from 'sonner'
import { toastMessages } from '../lib/toast-messages'
import { useRouter } from '@tanstack/react-router'
import { supabase } from '../lib/clients'
import type { User } from '@tenantflow/shared'
import { trpc } from '@/lib/utils/trpc'

// Backend returns a subset of User fields, map to full User type
type BackendUser = {
	id: string
	email: string
	name?: string
	role: 'ADMIN' | 'OWNER' | 'TENANT' | 'MANAGER'
	phone?: string
	avatarUrl?: string
	emailVerified: boolean
	createdAt: string
	updatedAt: string
}

// Simple inline user data transform since we removed the data-transforms utility
const transformUserData = (user: BackendUser | null): User | null => {
	if (!user) return null
	return {
		...user,
		// Add missing fields with defaults
		supabaseId: '', // Will be populated by auth context
		stripeCustomerId: null,
		bio: null,
		name: user.name || null,
		phone: user.phone || null,
		avatarUrl: user.avatarUrl || null,
		// Parse dates
		createdAt: new Date(user.createdAt),
		updatedAt: new Date(user.updatedAt)
	}
}

// Re-export the core auth status hook  
export const useAuthStatus = () => trpc.auth.me.useQuery()

// Login with UI feedback and navigation
export function useLogin() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async (credentials: { email: string; password: string }) => {
		setIsLoading(true)
		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.signInWithPassword({
				email: credentials.email,
				password: credentials.password
			})

			if (error) throw error

			toast.success(toastMessages.success.signedIn)
			router.navigate({ to: '/dashboard' })
		} catch (error) {
			toast.error(handleApiError(error as Error))
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading
	}
}

// Register with UI feedback and navigation
export function useRegister() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async (credentials: { email: string; password: string; name?: string }) => {
		setIsLoading(true)
		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.signUp({
				email: credentials.email,
				password: credentials.password,
				options: {
					data: {
						name: credentials.name || ''
					}
				}
			})

			if (error) throw error

			toast.success(toastMessages.success.created('account'))
			// Note: User may need to confirm email before accessing dashboard
			router.navigate({ to: '/dashboard' })
		} catch (error) {
			toast.error(handleApiError(error as Error))
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading
	}
}

// Logout with UI feedback and navigation
export function useLogout() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async () => {
		setIsLoading(true)
		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.signOut()
			if (error) throw error

			toast.success(toastMessages.success.signedOut)
			router.navigate({ to: '/auth/login' })
		} catch (error) {
			toast.error(handleApiError(error as Error))
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading
	}
}

// Token refresh (handled automatically by Supabase)
export function useRefreshToken() {
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async () => {
		setIsLoading(true)
		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.refreshSession()
			if (error) throw error

			// Silent refresh, no toast needed
		} catch (error) {
			console.error('Token refresh failed:', error)
			toast.error(toastMessages.error.sessionExpired)
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading
	}
}

// Update profile with UI feedback
export function useUpdateProfile() {
	const trpcUpdateProfile = trpc.auth.updateProfile.useMutation()

	const mutate = (
		variables: Parameters<typeof trpcUpdateProfile.mutate>[0]
	) => {
		trpcUpdateProfile.mutate(variables, {
			onSuccess: () => {
				toast.success(toastMessages.success.updated('profile'))
			},
			onError: (error: unknown) => {
				toast.error(handleApiError(error as unknown as Error))
			}
		})
	}

	return {
		...trpcUpdateProfile,
		mutate
	}
}

// Combined auth hook with all operations
export function useAuth() {
	const authStatus = useAuthStatus()
	const login = useLogin()
	const register = useRegister()
	const logout = useLogout()
	const refresh = useRefreshToken()
	const updateProfile = useUpdateProfile()

	// Get token from Supabase session instead of localStorage
	const getToken = async () => {
		if (!supabase) return null
		const { data: { session } } = await supabase.auth.getSession()
		return session?.access_token || null
	}

	// Transform user data to ensure dates are strings
	const transformedUser = authStatus.data ? transformUserData(authStatus.data) : null

	return {
		// Status
		isAuthenticated: !!authStatus.data,
		user: transformedUser,
		isLoading: authStatus.isLoading,

		// Token access
		getToken,

		// Actions
		login: login.mutate,
		register: register.mutate,
		logout: logout.mutate,
		refresh: refresh.mutate,
		updateProfile: updateProfile.mutate,

		// States
		isLoggingIn: login.isPending,
		isRegistering: register.isPending,
		isLoggingOut: logout.isPending,
		isRefreshing: refresh.isPending,
		isUpdatingProfile: updateProfile.isPending
	}
}

// Hook for protected routes
export function useRequireAuth() {
	const { isAuthenticated, isLoading } = useAuth()
	const router = useRouter()

	// Redirect to login if not authenticated
	if (!isLoading && !isAuthenticated) {
		router.navigate({ to: '/auth/login' })
		return false
	}

	return isAuthenticated
}

// Additional UI-enhanced auth hooks
export function useForgotPassword() {
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async (email: string) => {
		setIsLoading(true)
		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`
			})

			if (error) throw error

			toast.success(toastMessages.info.emailSent)
		} catch (error) {
			toast.error(handleApiError(error as Error))
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading
	}
}

export function useResetPassword() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async (newPassword: string) => {
		setIsLoading(true)
		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.updateUser({
				password: newPassword
			})

			if (error) throw error

			toast.success(toastMessages.success.passwordChanged)
			router.navigate({ to: '/auth/login' })
		} catch (error) {
			toast.error(handleApiError(error as Error))
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading
	}
}

export function useChangePassword() {
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async (newPassword: string) => {
		setIsLoading(true)
		try {
			if (!supabase) {
				throw new Error('Authentication service is not available')
			}

			const { error } = await supabase.auth.updateUser({
				password: newPassword
			})

			if (error) throw error

			toast.success(toastMessages.success.passwordChanged)
		} catch (error) {
			toast.error(handleApiError(error as Error))
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading
	}
}
