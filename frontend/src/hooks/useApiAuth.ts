import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, TokenManager } from '@/lib/api'
import { handleApiError } from '@/lib/utils'
import type { AuthCredentials, RegisterData, AuthResponse } from '@/types/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

// Authentication status hook
export function useAuthStatus() {
	return useQuery({
		queryKey: ['auth', 'status'],
		queryFn: async () => {
			const token = TokenManager.getAccessToken()
			if (!token) {
				return { isAuthenticated: false, user: null }
			}

			try {
				// Fetch user profile to verify token and get user data
				const userProfile = await apiClient.users.me()
				return {
					isAuthenticated: true,
					user: userProfile
				}
			} catch {
				// Token is invalid, clear it
				TokenManager.clearTokens()
				return { isAuthenticated: false, user: null }
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false
	})
}

// Login mutation
export function useLogin() {
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	return useMutation({
		mutationFn: (credentials: AuthCredentials) =>
			apiClient.auth.login(credentials),
		onSuccess: (response: AuthResponse) => {
			// Update auth status cache
			queryClient.setQueryData(['auth', 'status'], {
				isAuthenticated: true,
				user: response.user
			})

			// Invalidate all queries to refetch with new auth context
			queryClient.invalidateQueries()

			toast.success('Logged in successfully')
			navigate('/dashboard')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Register mutation
export function useRegister() {
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	return useMutation({
		mutationFn: (data: RegisterData) => apiClient.auth.register(data),
		onSuccess: (response: AuthResponse) => {
			// Update auth status cache
			queryClient.setQueryData(['auth', 'status'], {
				isAuthenticated: true,
				user: response.user
			})

			// Invalidate all queries to refetch with new auth context
			queryClient.invalidateQueries()

			toast.success('Account created successfully')
			navigate('/dashboard')
		},
		onError: error => {
			toast.error(handleApiError(error))
		}
	})
}

// Logout mutation
export function useLogout() {
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	return useMutation({
		mutationFn: () => {
			// Clear tokens
			apiClient.auth.logout()
			return Promise.resolve()
		},
		onSuccess: () => {
			// Update auth status cache
			queryClient.setQueryData(['auth', 'status'], {
				isAuthenticated: false,
				user: null
			})

			// Clear all cached queries
			queryClient.clear()

			toast.success('Logged out successfully')
			navigate('/login')
		}
	})
}

// Token refresh mutation (usually called automatically)
export function useRefreshToken() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => {
			const refreshToken = TokenManager.getRefreshToken()
			if (!refreshToken) {
				throw new Error('No refresh token available')
			}
			return apiClient.auth.refresh(refreshToken)
		},
		onSuccess: (response: AuthResponse) => {
			// Update auth status cache
			queryClient.setQueryData(['auth', 'status'], {
				isAuthenticated: true,
				user: response.user
			})

			toast.success('Session refreshed')
		},
		onError: () => {
			// Refresh failed, logout user
			TokenManager.clearTokens()
			queryClient.setQueryData(['auth', 'status'], {
				isAuthenticated: false,
				user: null
			})
			queryClient.clear()

			toast.error('Session expired, please log in again')
		}
	})
}

// Update profile mutation
export function useUpdateProfile() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: { name: string; phone?: string; bio?: string; avatarUrl?: string }) =>
			apiClient.http.patch('/users/profile', data),
		onSuccess: (response) => {
			// Update auth status cache with new user data
			queryClient.setQueryData(['auth', 'status'], (old: { isAuthenticated: boolean; user: unknown } | undefined) => {
				const currentUser = (old?.user as Record<string, unknown>) || {}
				return {
					...old,
					user: { ...currentUser, ...response }
				}
			})

			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: ['users'] })
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
		isAuthenticated: authStatus.data?.isAuthenticated ?? false,
		user: authStatus.data?.user ?? null,
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

		// Utilities
		getToken: () => TokenManager.getAccessToken(),
		clearTokens: () => TokenManager.clearTokens()
	}
}

// Hook for protected routes
export function useRequireAuth() {
	const { isAuthenticated, isLoading } = useAuth()
	const navigate = useNavigate()

	// Redirect to login if not authenticated
	if (!isLoading && !isAuthenticated) {
		navigate('/login')
		return false
	}

	return isAuthenticated
}
