/**
 * Enhanced Error Handling for TanStack Query
 * 
 * Provides standardized error handling patterns, retry strategies,
 * and user-friendly error messages with recovery options.
 */

import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Standard error types for the application
 */
export interface AppError {
	type: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown'
	message: string
	code?: string | number
	details?: any
	retryable?: boolean
	userMessage?: string
}

/**
 * Error classification helper
 */
export function classifyError(error: any): AppError {
	// Network errors
	if (!navigator.onLine) {
		return {
			type: 'network',
			message: 'No internet connection',
			userMessage: 'Check your internet connection and try again',
			retryable: true,
		}
	}

	// HTTP errors
	if (error?.status || error?.response?.status) {
		const status = error.status || error.response.status

		if (status === 401) {
			return {
				type: 'auth',
				message: 'Authentication required',
				userMessage: 'Please log in to continue',
				code: status,
				retryable: false,
			}
		}

		if (status === 403) {
			return {
				type: 'auth',
				message: 'Access forbidden',
				userMessage: 'You do not have permission to perform this action',
				code: status,
				retryable: false,
			}
		}

		if (status === 404) {
			return {
				type: 'client',
				message: 'Resource not found',
				userMessage: 'The requested resource was not found',
				code: status,
				retryable: false,
			}
		}

		if (status === 408 || status === 429) {
			return {
				type: 'network',
				message: status === 408 ? 'Request timeout' : 'Too many requests',
				userMessage: status === 408 ? 'Request timed out. Please try again' : 'Too many requests. Please wait and try again',
				code: status,
				retryable: true,
			}
		}

		if (status >= 400 && status < 500) {
			return {
				type: 'validation',
				message: 'Invalid request',
				userMessage: 'Please check your input and try again',
				code: status,
				retryable: false,
			}
		}

		if (status >= 500) {
			return {
				type: 'server',
				message: 'Server error',
				userMessage: 'Something went wrong on our end. Please try again later',
				code: status,
				retryable: true,
			}
		}
	}

	// Supabase specific errors
	if (error?.message?.includes('JWT')) {
		return {
			type: 'auth',
			message: 'Invalid authentication token',
			userMessage: 'Your session has expired. Please log in again',
			retryable: false,
		}
	}

	if (error?.message?.includes('Row Level Security')) {
		return {
			type: 'auth',
			message: 'Access denied by security policy',
			userMessage: 'You do not have permission to access this data',
			retryable: false,
		}
	}

	// Generic network errors
	if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
		return {
			type: 'network',
			message: 'Network error',
			userMessage: 'Unable to connect to the server. Please check your connection',
			retryable: true,
		}
	}

	// Validation errors (Zod, etc.)
	if (error?.name === 'ZodError' || error?.issues) {
		return {
			type: 'validation',
			message: 'Validation error',
			userMessage: 'Please check your input and try again',
			details: error.issues,
			retryable: false,
		}
	}

	// Default unknown error
	return {
		type: 'unknown',
		message: error?.message || 'An unexpected error occurred',
		userMessage: 'Something went wrong. Please try again',
		retryable: true,
	}
}

/**
 * Smart retry function based on error type
 */
export function createSmartRetry(maxRetries = 2) {
	return (failureCount: number, error: any) => {
		const appError = classifyError(error)
		
		// Don't retry non-retryable errors
		if (!appError.retryable) {
			return false
		}

		// Don't exceed max retries
		if (failureCount >= maxRetries) {
			return false
		}

		// Exponential backoff for network errors
		if (appError.type === 'network' || appError.type === 'server') {
			return true
		}

		return false
	}
}

/**
 * Error boundary for React Query errors
 */
export function handleQueryError(error: any, context?: { queryKey?: unknown[] }) {
	const appError = classifyError(error)
	
	// Log error for debugging
	console.error('Query Error:', {
		error: appError,
		queryKey: context?.queryKey,
		originalError: error,
	})

	// Show user-friendly toast notification
	toast.error(appError.userMessage || appError.message, {
		action: appError.retryable ? {
			label: 'Retry',
			onClick: () => {
				// Trigger retry logic
				if (context?.queryKey) {
					// This would need to be implemented based on your specific needs
					console.log('Retry triggered for:', context.queryKey)
				}
			},
		} : undefined,
	})
}

/**
 * Error boundary for React Query mutations
 */
export function handleMutationError(error: any, variables?: any, context?: any) {
	const appError = classifyError(error)
	
	// Log error for debugging
	console.error('Mutation Error:', {
		error: appError,
		variables,
		context,
		originalError: error,
	})

	// Show user-friendly toast notification
	toast.error(appError.userMessage || appError.message, {
		action: appError.retryable ? {
			label: 'Retry',
			onClick: () => {
				// Trigger retry logic - would need to be implemented
				console.log('Retry triggered for mutation')
			},
		} : undefined,
	})
}

/**
 * Enhanced QueryClient with global error handling
 */
export function createEnhancedQueryClient(): QueryClient {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				handleQueryError(error, { queryKey: query.queryKey })
			},
		}),
		mutationCache: new MutationCache({
			onError: (error, variables, context, mutation) => {
				handleMutationError(error, variables, context)
			},
		}),
		defaultOptions: {
			queries: {
				// Smart retry strategy
				retry: createSmartRetry(2),
				// Retry delay with exponential backoff
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
				// Enhanced error handling
				throwOnError: false, // Handle errors gracefully
				// Background sync optimizations
				refetchOnWindowFocus: false,
				refetchOnReconnect: 'always',
				// Default cache configuration
				staleTime: 2 * 60 * 1000, // 2 minutes
				gcTime: 10 * 60 * 1000, // 10 minutes
			},
			mutations: {
				// Retry mutations once on network/server errors
				retry: createSmartRetry(1),
				// Retry delay for mutations
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
				// Enhanced error handling
				throwOnError: false,
			},
		},
	})
}

/**
 * Hook for handling specific query/mutation errors
 */
import { useCallback } from 'react'

export function useErrorHandler() {
	const handleError = useCallback((error: any, context?: any) => {
		const appError = classifyError(error)
		
		// Custom error handling logic can be added here
		switch (appError.type) {
			case 'auth':
				// Redirect to login or refresh token
				console.log('Auth error - redirect to login')
				break
			case 'network':
				// Maybe show offline indicator
				console.log('Network error - show offline indicator')
				break
			case 'validation':
				// Focus on invalid field
				console.log('Validation error - focus invalid field')
				break
			default:
				// Generic error handling
				break
		}

		return appError
	}, [])

	const showError = useCallback((message: string, options?: { action?: { label: string; onClick: () => void } }) => {
		toast.error(message, options)
	}, [])

	const showSuccess = useCallback((message: string) => {
		toast.success(message)
	}, [])

	return {
		handleError,
		showError,
		showSuccess,
	}
}

/**
 * Error recovery utilities
 */
export const errorRecovery = {
	/**
	 * Retry a failed query
	 */
	retryQuery: (queryClient: QueryClient, queryKey: unknown[]) => {
		queryClient.refetchQueries({ queryKey })
	},

	/**
	 * Reset error state
	 */
	resetError: (queryClient: QueryClient, queryKey?: unknown[]) => {
		if (queryKey) {
			queryClient.resetQueries({ queryKey })
		} else {
			queryClient.resetQueries()
		}
	},

	/**
	 * Clear all errors and refetch
	 */
	clearAndRefetch: (queryClient: QueryClient) => {
		queryClient.clear()
		queryClient.refetchQueries()
	},

	/**
	 * Invalidate and refetch specific data
	 */
	invalidateAndRefetch: (queryClient: QueryClient, queryKey: unknown[]) => {
		queryClient.invalidateQueries({ queryKey })
	},
}

/**
 * Error boundary component props
 */
export interface ErrorBoundaryProps {
	fallback?: React.ComponentType<{ error: AppError; retry: () => void }>
	onError?: (error: AppError) => void
}

/**
 * Network status utilities
 */
export const networkStatus = {
	/**
	 * Check if currently online
	 */
	isOnline: () => navigator.onLine,

	/**
	 * Add network status listeners
	 */
	addListeners: (onOnline: () => void, onOffline: () => void) => {
		window.addEventListener('online', onOnline)
		window.addEventListener('offline', onOffline)
		
		return () => {
			window.removeEventListener('online', onOnline)
			window.removeEventListener('offline', onOffline)
		}
	},

	/**
	 * Pause queries when offline
	 */
	pauseQueriesWhenOffline: (queryClient: QueryClient) => {
		const handleOffline = () => {
			queryClient.getQueryCache().getAll().forEach(query => {
				query.state.fetchStatus = 'paused'
			})
		}

		const handleOnline = () => {
			queryClient.refetchQueries()
		}

		return networkStatus.addListeners(handleOnline, handleOffline)
	},
}