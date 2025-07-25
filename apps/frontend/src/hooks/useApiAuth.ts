// Frontend UI layer over tRPC backend auth logic
// This file handles UI concerns: navigation, notifications, combined state

import { useState } from 'react'
import { handleApiError } from '../lib/utils'
import { toast } from 'sonner'
import { toastMessages } from '../lib/toast-messages'
import { useRouter } from '@tanstack/react-router'
import { supabase } from '../lib/api'
import type { User } from '@tenantflow/shared'
import {
	useMe,
	useLogin as useTrpcLogin,
	useRegister as useTrpcRegister,
	useLogout as useTrpcLogout,
	useRefreshToken as useTrpcRefreshToken,
	useUpdateProfile as useTrpcUpdateProfile,
	useForgotPassword as useTrpcForgotPassword,
	useResetPassword as useTrpcResetPassword,
	useChangePassword as useTrpcChangePassword
} from './trpc/useAuth'

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
export const useAuthStatus = useMe

// Login with UI feedback and navigation
export function useLogin() {
	const router = useRouter()
	const trpcLogin = useTrpcLogin()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async (variables: Parameters<typeof trpcLogin.mutateAsync>[0]) => {
		setIsLoading(true)
		try {
			await trpcLogin.mutateAsync(variables)
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
		isPending: isLoading,
		mutateAsync: trpcLogin.mutateAsync
	}
}

// Register with UI feedback and navigation
export function useRegister() {
	const router = useRouter()
	const trpcRegister = useTrpcRegister()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async (variables: Parameters<typeof trpcRegister.mutateAsync>[0]) => {
		setIsLoading(true)
		try {
			await trpcRegister.mutateAsync(variables)
			toast.success(toastMessages.success.created('account'))
			router.navigate({ to: '/dashboard' })
		} catch (error) {
			toast.error(handleApiError(error as Error))
		} finally {
			setIsLoading(false)
		}
	}

	return {
		mutate,
		isPending: isLoading,
		mutateAsync: trpcRegister.mutateAsync
	}
}

// Logout with UI feedback and navigation
export function useLogout() {
	const router = useRouter()
	const trpcLogout = useTrpcLogout()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async () => {
		setIsLoading(true)
		try {
			await trpcLogout.mutateAsync()
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
		isPending: isLoading,
		mutateAsync: trpcLogout.mutateAsync
	}
}

// Token refresh (usually automatic, minimal UI feedback)
export function useRefreshToken() {
	const trpcRefreshToken = useTrpcRefreshToken()
	const [isLoading, setIsLoading] = useState(false)

	const mutate = async () => {
		setIsLoading(true)
		try {
			await trpcRefreshToken.mutateAsync()
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
		isPending: isLoading,
		mutateAsync: trpcRefreshToken.mutateAsync
	}
}

// Update profile with UI feedback
export function useUpdateProfile(): {
	mutate: (variables: Parameters<ReturnType<typeof useTrpcUpdateProfile>['mutate']>[0]) => void;
	isPending: boolean;
	error: unknown;
} {
	const trpcUpdateProfile = useTrpcUpdateProfile()

	const mutate = (
		variables: Parameters<typeof trpcUpdateProfile.mutate>[0]
	) => {
		trpcUpdateProfile.mutate(variables, {
			onSuccess: () => {
				toast.success(toastMessages.success.updated('profile'))
			},
			onError: (error) => {
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
	const transformedUser = authStatus.data ? transformUserData(authStatus.data as BackendUser) : null

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
	const trpcForgotPassword = useTrpcForgotPassword()

	const mutate = async (email: string) => {
		try {
			await trpcForgotPassword.mutateAsync(email)
			toast.success(toastMessages.info.emailSent)
		} catch (error) {
			toast.error(handleApiError(error as Error))
		}
	}

	return {
		mutate,
		mutateAsync: trpcForgotPassword.mutateAsync
	}
}

export function useResetPassword() {
	const router = useRouter()
	const trpcResetPassword = useTrpcResetPassword()

	const mutate = async (newPassword: string) => {
		try {
			await trpcResetPassword.mutateAsync(newPassword)
			toast.success(toastMessages.success.passwordChanged)
			router.navigate({ to: '/auth/login' })
		} catch (error) {
			toast.error(handleApiError(error as Error))
		}
	}

	return {
		mutate,
		mutateAsync: trpcResetPassword.mutateAsync
	}
}

export function useChangePassword() {
	const trpcChangePassword = useTrpcChangePassword()

	const mutate = async (newPassword: string) => {
		try {
			await trpcChangePassword.mutateAsync(newPassword)
			toast.success(toastMessages.success.passwordChanged)
		} catch (error) {
			toast.error(handleApiError(error as Error))
		}
	}

	return {
		mutate,
		mutateAsync: trpcChangePassword.mutateAsync
	}
}
