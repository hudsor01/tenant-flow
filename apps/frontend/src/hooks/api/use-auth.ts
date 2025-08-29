/**
 * React Query hooks for Authentication
 * Native TanStack Query implementation - connects to backend auth endpoints
 */
import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiGet, apiMutate } from '@/lib/utils/api-utils'
import { queryKeys } from '@/lib/react-query/query-keys'
import type {
	User,
	LoginCredentials,
	RegisterCredentials,
	AuthResponse,
	RefreshTokenRequest
} from '@repo/shared'

/**
 * Get current user profile - uses backend /auth/me endpoint
 */
export function useCurrentUser(options?: {
	enabled?: boolean
}): UseQueryResult<User> {
	return useQuery({
		queryKey: queryKeys.auth.profile(),
		queryFn: () => apiGet<User>('/api/auth/me'),
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: (failureCount, error) => {
			// Don't retry on 401 errors
			if (error instanceof Error && error.message.includes('401')) {
				return false
			}
			return failureCount < 3
		}
	})
}

/**
 * Login mutation - uses backend /auth/login endpoint
 */
export function useLogin(): UseMutationResult<
	AuthResponse,
	Error,
	LoginCredentials
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (credentials: LoginCredentials) =>
			apiMutate<AuthResponse>('POST', '/api/auth/login', credentials),
		onSuccess: data => {
			// Clear any cached data on successful login
			queryClient.clear()

			// Cache the user data if provided
			if (data.user) {
				queryClient.setQueryData(queryKeys.auth.profile(), data.user)
			}

			toast.success('Successfully logged in!')
		},
		onError: (error: Error) => {
			toast.error(`Login failed: ${error.message}`)
		}
	})
}

/**
 * Register mutation - uses backend /auth/register endpoint
 */
export function useRegister(): UseMutationResult<
	AuthResponse,
	Error,
	RegisterCredentials
> {
	return useMutation({
		mutationFn: (credentials: RegisterCredentials) =>
			apiMutate<AuthResponse>('POST', '/api/auth/register', credentials),
		onSuccess: data => {
			toast.success(data.message || 'Account created successfully!')
		},
		onError: (error: Error) => {
			toast.error(`Registration failed: ${error.message}`)
		}
	})
}

/**
 * Logout mutation - uses backend /auth/logout endpoint
 */
export function useLogout(): UseMutationResult<
	{ success: boolean; message: string },
	Error,
	void
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: () => apiMutate<{ success: boolean; message: string }>('POST', '/api/auth/logout', {}),
		onSuccess: () => {
			// Clear all cached data on logout
			queryClient.clear()
			toast.success('Successfully logged out!')
		},
		onError: (error: Error) => {
			// Still clear cache even if logout endpoint fails
			queryClient.clear()
			toast.error(`Logout failed: ${error.message}`)
		}
	})
}

/**
 * Refresh token mutation - uses backend /auth/refresh endpoint
 */
export function useRefreshToken(): UseMutationResult<
	AuthResponse,
	Error,
	RefreshTokenRequest
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (refreshData: RefreshTokenRequest) =>
			apiMutate<AuthResponse>('POST', '/api/auth/refresh', refreshData),
		onSuccess: data => {
			// Update cached user data if provided
			if (data.user) {
				queryClient.setQueryData(queryKeys.auth.profile(), data.user)
			}
		},
		onError: (error: Error) => {
			// On refresh token failure, user needs to login again
			queryClient.clear()
			console.error('Token refresh failed:', error.message)
		}
	})
}

/**
 * Helper hook to check if user is authenticated
 * Based on backend auth endpoint response
 */
export function useIsAuthenticated(): {
	isAuthenticated: boolean
	isLoading: boolean
	error: Error | null
} {
	const {
		data: user,
		isLoading,
		error
	} = useCurrentUser({
		enabled: true
	})

	return {
		isAuthenticated: !!user,
		isLoading,
		error
	}
}
