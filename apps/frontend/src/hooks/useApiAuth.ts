// Updated: useApiAuth now uses our new tRPC backend routers

import { trpc } from '@/lib/trpcClient'
import { handleApiError } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'

// Authentication status hook (renamed to match auth router endpoint)
export function useAuthStatus() {
	return trpc.auth.me.useQuery(undefined, {
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: 'always',
		staleTime: 5 * 60 * 1000,
	})
}

// Login mutation
export function useLogin() {
	const utils = trpc.useUtils()
	const router = useRouter()

	return trpc.auth.login.useMutation({
		onSuccess: (response) => {
			utils.auth.me.invalidate()
			toast.success('Logged in successfully')
			router.navigate({ to: '/dashboard' })
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Register mutation
export function useRegister() {
	const utils = trpc.useUtils()
	const router = useRouter()

	return trpc.auth.register.useMutation({
		onSuccess: (response) => {
			utils.auth.me.invalidate()
			toast.success('Account created successfully')
			router.navigate({ to: '/dashboard' })
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Logout mutation
export function useLogout() {
	const utils = trpc.useUtils()
	const router = useRouter()

	return trpc.auth.logout.useMutation({
		onSuccess: () => {
			utils.auth.me.invalidate()
			utils.invalidate() // Invalidate all queries
			toast.success('Logged out successfully')
			router.navigate({ to: '/login' })
		}
	})
}

// Token refresh mutation (usually called automatically)
export function useRefreshToken() {
	const utils = trpc.useUtils()

	return trpc.auth.refreshToken.useMutation({
		onSuccess: (response) => {
			utils.auth.me.invalidate()
			toast.success('Session refreshed')
		},
		onError: () => {
			utils.auth.me.invalidate()
			utils.invalidate() // Clear all queries
			toast.error('Session expired, please log in again')
		}
	})
}

// Update profile mutation
export function useUpdateProfile() {
	const utils = trpc.useUtils()

	return trpc.auth.updateProfile.useMutation({
		onSuccess: (response) => {
			utils.auth.me.invalidate()
			toast.success('Profile updated successfully')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Combined auth hook with all operations
export function useAuth() {
	const authStatus = useAuthStatus()
	const login = useLogin()
	const register = useRegister()
	const logout = useLogout()
	const refresh = useRefreshToken()
	const updateProfile = useUpdateProfile()

	return {
		// Status
		isAuthenticated: !!authStatus.data,
		user: authStatus.data ?? null,
		isLoading: authStatus.isLoading,

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
		isUpdatingProfile: updateProfile.isPending,
	}
}

// Hook for protected routes
export function useRequireAuth() {
	const { isAuthenticated, isLoading } = useAuth()
	const router = useRouter()

	// Redirect to login if not authenticated
	if (!isLoading && !isAuthenticated) {
		router.navigate({ to: '/login' })
		return false
	}

	return isAuthenticated
}

// Additional auth hooks for convenience
export function useMe() {
	return trpc.auth.me.useQuery(undefined, {
		retry: false,
		staleTime: 5 * 60 * 1000,
	})
}

export function useForgotPassword() {
	return trpc.auth.forgotPassword.useMutation({
		onSuccess: () => {
			toast.success('Password reset email sent if account exists')
		},
		onError: (error) => {
			toast.error(handleApiError(error))
		}
	})
}

export function useResetPassword() {
	const router = useRouter()

	return trpc.auth.resetPassword.useMutation({
		onSuccess: () => {
			toast.success('Password successfully reset')
			router.navigate({ to: '/login' })
		},
		onError: (error) => {
			toast.error(handleApiError(error))
		}
	})
}

export function useChangePassword() {
	return trpc.auth.changePassword.useMutation({
		onSuccess: () => {
			toast.success('Password successfully changed')
		},
		onError: (error) => {
			toast.error(handleApiError(error))
		}
	})
}
