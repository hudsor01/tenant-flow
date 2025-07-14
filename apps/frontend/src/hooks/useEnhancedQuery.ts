/**
 * Enhanced Query Hooks with Integrated Error Handling
 * 
 * Provides wrapper hooks that integrate our error handling system
 * with TanStack Query hooks for consistent error management.
 */

import React, { useCallback } from 'react'
import { 
	useQuery, 
	useMutation, 
	useQueryClient,
	type UseQueryOptions,
	type UseMutationOptions,
	type QueryKey
} from '@tanstack/react-query'
import { classifyError, useErrorHandler, createSmartRetry } from '@/lib/error-handling'
import { toast } from 'sonner'

/**
 * Enhanced useQuery with integrated error handling
 */
export function useEnhancedQuery<
	TQueryFnData = unknown,
	TError = Error,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey
>(
	options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
		showErrorToast?: boolean
		errorMessage?: string
	}
) {
	const { handleError } = useErrorHandler()
	const { showErrorToast = true, errorMessage, ...queryOptions } = options

	return useQuery({
		...queryOptions,
		retry: queryOptions.retry ?? createSmartRetry(),
		throwOnError: false, // Handle errors gracefully
		onError: (error: any) => {
			const appError = handleError(error)
			
			if (showErrorToast) {
				toast.error(errorMessage || appError.userMessage)
			}
			
			// Call original onError if provided
			if (queryOptions.onError) {
				queryOptions.onError(error)
			}
		},
	})
}

/**
 * Enhanced useMutation with integrated error handling
 */
export function useEnhancedMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown
>(
	options: UseMutationOptions<TData, TError, TVariables, TContext> & {
		showErrorToast?: boolean
		showSuccessToast?: boolean
		successMessage?: string
		errorMessage?: string
	}
) {
	const { handleError } = useErrorHandler()
	const { 
		showErrorToast = true, 
		showSuccessToast = false,
		successMessage,
		errorMessage,
		...mutationOptions 
	} = options

	return useMutation({
		...mutationOptions,
		retry: mutationOptions.retry ?? createSmartRetry(1),
		throwOnError: false,
		onSuccess: (data, variables, context) => {
			if (showSuccessToast && successMessage) {
				toast.success(successMessage)
			}
			
			// Call original onSuccess if provided
			if (mutationOptions.onSuccess) {
				mutationOptions.onSuccess(data, variables, context)
			}
		},
		onError: (error: any, variables, context) => {
			const appError = handleError(error)
			
			if (showErrorToast) {
				toast.error(errorMessage || appError.userMessage)
			}
			
			// Call original onError if provided
			if (mutationOptions.onError) {
				mutationOptions.onError(error, variables, context)
			}
		},
	})
}

/**
 * Hook for handling offline/online states
 */
export function useNetworkStatus() {
	const queryClient = useQueryClient()

	const handleOnline = useCallback(() => {
		// Refetch all queries when back online
		queryClient.refetchQueries()
		toast.success('Connection restored')
	}, [queryClient])

	const handleOffline = useCallback(() => {
		// Pause queries when offline
		queryClient.getQueryCache().getAll().forEach(query => {
			if (query.state.fetchStatus === 'fetching') {
				query.cancel()
			}
		})
		toast.warning('You are offline. Some features may not work.')
	}, [queryClient])

	// Set up event listeners
	React.useEffect(() => {
		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [handleOnline, handleOffline])

	return {
		isOnline: navigator.onLine,
		handleOnline,
		handleOffline,
	}
}

/**
 * Hook for retrying failed queries
 */
export function useRetryQuery() {
	const queryClient = useQueryClient()

	const retryQuery = useCallback((queryKey: QueryKey) => {
		return queryClient.refetchQueries({ queryKey })
	}, [queryClient])

	const retryAllFailedQueries = useCallback(() => {
		const failedQueries = queryClient.getQueryCache().getAll().filter(
			query => query.state.status === 'error'
		)
		
		const retryPromises = failedQueries.map(query => 
			queryClient.refetchQueries({ queryKey: query.queryKey })
		)
		
		return Promise.allSettled(retryPromises)
	}, [queryClient])

	const clearErrors = useCallback(() => {
		queryClient.getQueryCache().getAll().forEach(query => {
			if (query.state.status === 'error') {
				queryClient.resetQueries({ queryKey: query.queryKey })
			}
		})
	}, [queryClient])

	return {
		retryQuery,
		retryAllFailedQueries,
		clearErrors,
	}
}

/**
 * Hook for graceful degradation
 */
export function useGracefulDegradation<T>(
	primaryQueryOptions: UseQueryOptions<T>,
	fallbackData?: T,
	fallbackQueryOptions?: UseQueryOptions<T>
) {
	const primary = useEnhancedQuery({
		...primaryQueryOptions,
		showErrorToast: false, // Don't show error for primary query
	})

	const fallback = useEnhancedQuery({
		...fallbackQueryOptions,
		enabled: primary.isError && !!fallbackQueryOptions,
		showErrorToast: false, // Only show error if both fail
	})

	// Return primary data if available, otherwise fallback data
	return {
		data: primary.data ?? fallback.data ?? fallbackData,
		isLoading: primary.isLoading || (primary.isError && fallback.isLoading),
		isError: primary.isError && (fallback.isError || !fallbackQueryOptions),
		error: fallback.error || primary.error,
		refetch: primary.refetch,
	}
}

