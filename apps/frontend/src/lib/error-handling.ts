/**
 * Enhanced Error Handling for TanStack Query
 * 
 * Provides standardized error handling patterns, retry strategies,
 * and user-friendly error messages with recovery options.
 */

import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ZodError } from 'zod'
import { logger } from './logger'

/**
 * HTTP Response error structure
 */
export interface HttpErrorResponse {
	status?: number
	statusText?: string
	message?: string
	response?: {
		status: number
		statusText?: string
		data?: Record<string, string | number | boolean | null>
	}
}

/**
 * Network/Fetch error structure
 */
export interface NetworkError extends Error {
	code?: string
	type?: string
}

/**
 * Combined error types that can be thrown
 */
export type PossibleError = 
	| Error 
	| HttpErrorResponse 
	| NetworkError 
	| ZodError 
	| { message: string; [key: string]: string | number | boolean | null }
	| Record<string, string | number | boolean | null>

/**
 * Standard error types for the application
 */
export interface AppError {
	type: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown'
	message: string
	code?: string | number
	details?: Record<string, string | number | boolean | null> | ZodError['issues']
	retryable?: boolean
	userMessage?: string
}

/**
 * Type guard to check if error has HTTP status
 */
function hasHttpStatus(error: PossibleError): error is HttpErrorResponse {
	return (
		typeof error === 'object' &&
		error !== null &&
		(('status' in error && typeof error.status === 'number') ||
		 ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response))
	)
}


/**
 * Type guard to check if error is a ZodError
 */
function isZodError(error: PossibleError): error is ZodError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'name' in error &&
		error.name === 'ZodError' &&
		'issues' in error &&
		Array.isArray(error.issues)
	)
}

/**
 * Type guard to check if error has a message property
 */
function hasMessage(error: PossibleError): error is { message: string } {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof error.message === 'string'
	)
}

/**
 * Error classification helper
 */
export function classifyError(error: PossibleError): AppError {
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
	if (hasHttpStatus(error)) {
		const status = error.status || error.response?.status
		
		if (!status) {
			return {
				type: 'unknown',
				message: 'HTTP error without status code',
				userMessage: 'Something went wrong. Please try again',
				retryable: true,
			}
		}

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
	if (hasMessage(error) && error.message.includes('JWT')) {
		return {
			type: 'auth',
			message: 'Invalid authentication token',
			userMessage: 'Your session has expired. Please log in again',
			retryable: false,
		}
	}

	if (hasMessage(error) && error.message.includes('Row Level Security')) {
		return {
			type: 'auth',
			message: 'Access denied by security policy',
			userMessage: 'You do not have permission to access this data',
			retryable: false,
		}
	}

	// Generic network errors
	if (hasMessage(error) && (error.message.includes('fetch') || error.message.includes('network'))) {
		return {
			type: 'network',
			message: 'Network error',
			userMessage: 'Unable to connect to the server. Please check your connection',
			retryable: true,
		}
	}

	// Validation errors (Zod, etc.)
	if (isZodError(error)) {
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
		message: hasMessage(error) ? error.message : 'An unexpected error occurred',
		userMessage: 'Something went wrong. Please try again',
		retryable: true,
	}
}

/**
 * Smart retry function based on error type
 */
export function createSmartRetry(maxRetries = 2) {
	return (failureCount: number, error: PossibleError) => {
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
export function handleQueryError(error: PossibleError, context?: { queryKey?: readonly (string | number)[] }) {
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
					logger.debug('Retry triggered for query', undefined, { queryKey: context.queryKey })
				}
			},
		} : undefined,
	})
}

/**
 * Error boundary for React Query mutations
 */
export function handleMutationError(error: PossibleError, variables?: Record<string, string | number | boolean | null>, context?: Record<string, string | number | boolean | null>) {
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
				logger.debug('Retry triggered for mutation')
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
				handleQueryError(error, { queryKey: query.queryKey as (string | number)[] })
			},
		}),
		mutationCache: new MutationCache({
			onError: (error, variables, context) => {
				handleMutationError(
					error, 
					variables as Record<string, string | number | boolean | null>, 
					context as Record<string, string | number | boolean | null>
				)
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
	const handleError = useCallback((error: PossibleError, _context?: Record<string, string | number | boolean | null>) => {
		const appError = classifyError(error)
		
		// Custom error handling logic can be added here
		switch (appError.type) {
			case 'auth':
				// Redirect to login or refresh token
				logger.info('Auth error - redirecting to login', undefined, { errorType: appError.type })
				break
			case 'network':
				// Maybe show offline indicator
				logger.info('Network error - showing offline indicator', undefined, { errorType: appError.type })
				break
			case 'validation':
				// Focus on invalid field
				logger.info('Validation error - focusing invalid field', undefined, { errorType: appError.type })
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
	retryQuery: (queryClient: QueryClient, queryKey: readonly (string | number)[]) => {
		queryClient.refetchQueries({ queryKey })
	},

	/**
	 * Reset error state
	 */
	resetError: (queryClient: QueryClient, queryKey?: readonly (string | number)[]) => {
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
	invalidateAndRefetch: (queryClient: QueryClient, queryKey: readonly (string | number)[]) => {
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