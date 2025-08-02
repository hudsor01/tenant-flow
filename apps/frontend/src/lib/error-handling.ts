/**
 * Enhanced Error Handling for TanStack Query
 * 
 * Provides standardized error handling patterns, retry strategies,
 * and user-friendly error messages with recovery options.
 */

import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ZodError } from 'zod'
import { 
  classifyError,
  createNetworkError,
  type StandardError
} from '@tenantflow/shared'
import { ERROR_TYPES } from '@tenantflow/shared/utils/errors'
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
 * Enhanced error classification using shared utilities
 */
export function classifyErrorToStandard(error: PossibleError): StandardError {
	// Handle offline state
	if (!navigator.onLine) {
		return createNetworkError('No internet connection', undefined, {
			context: { isOnline: false }
		})
	}

	// Handle HTTP errors
	if (hasHttpStatus(error)) {
		const status = error.status || error.response?.status
		const statusText = error.statusText || error.response?.statusText
		const message = hasMessage(error) ? error.message : 'HTTP error occurred'
		
		return createNetworkError(message, status, {
			statusText,
			context: { originalError: error }
		})
	}

	// Handle Zod validation errors
	if (isZodError(error)) {
		// Skip Zod validation error handling due to version mismatch
		// Fall back to generic error classification
		return classifyError(error)
	}

	// Use shared classification for other errors
	return classifyError(error)
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
		if (appError.type === ERROR_TYPES.NETWORK_ERROR || appError.type === ERROR_TYPES.SERVER_ERROR) {
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
	toast.error(appError.message, {
		action: [ERROR_TYPES.NETWORK_ERROR, ERROR_TYPES.SERVER_ERROR].includes(appError.type as typeof ERROR_TYPES.NETWORK_ERROR | typeof ERROR_TYPES.SERVER_ERROR) ? {
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
import type { AppError } from '@tenantflow/shared/types/errors'

export function useErrorHandler() {
	const handleError = useCallback((error: PossibleError, _context?: Record<string, string | number | boolean | null>) => {
		const appError = classifyError(error)
		
		// Custom error handling logic can be added here
		switch (appError.type) {
			case ERROR_TYPES.AUTH_ERROR:
				// Redirect to login or refresh token
				logger.info('Auth error - redirecting to login', undefined, { errorType: appError.type })
				break
			case ERROR_TYPES.NETWORK_ERROR:
				// Maybe show offline indicator
				logger.info('Network error - showing offline indicator', undefined, { errorType: appError.type })
				break
			case ERROR_TYPES.VALIDATION_ERROR:
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
		void queryClient.refetchQueries({ queryKey })
	},

	/**
	 * Reset error state
	 */
	resetError: (queryClient: QueryClient, queryKey?: readonly (string | number)[]) => {
		if (queryKey) {
			void queryClient.resetQueries({ queryKey })
		} else {
			void queryClient.resetQueries()
		}
	},

	/**
	 * Clear all errors and refetch
	 */
	clearAndRefetch: (queryClient: QueryClient) => {
		queryClient.clear()
		void queryClient.refetchQueries()
	},

	/**
	 * Invalidate and refetch specific data
	 */
	invalidateAndRefetch: (queryClient: QueryClient, queryKey: readonly (string | number)[]) => {
		void queryClient.invalidateQueries({ queryKey })
	},
}

/**
 * Error boundary component props
 */
export interface ErrorBoundaryProps {
	fallback?: React.ComponentType<{ error: AppError & { retryable?: boolean; userMessage?: string }; retry: () => void }>
	onError?: (error: AppError & { retryable?: boolean; userMessage?: string }) => void
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
			void queryClient.refetchQueries()
		}

		return networkStatus.addListeners(handleOnline, handleOffline)
	},
}