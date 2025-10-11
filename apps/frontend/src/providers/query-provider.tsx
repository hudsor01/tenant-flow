'use client'

import { trackMutationError, trackQueryError } from '@/lib/error-analytics'
import {
	createErrorBoundaryFallback,
	showErrorToast
} from '@/lib/error-handler'
import {
	adaptiveRetryDelay,
	defaultMutationRetry,
	defaultQueryRetry
} from '@/lib/query-retry-strategies'
import { logger } from '@repo/shared/lib/frontend-logger'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { DehydratedState } from '@tanstack/react-query'
import {
	HydrationBoundary,
	QueryClient,
	QueryClientProvider,
	QueryErrorResetBoundary
} from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

// Dynamically import DevTools for development only
const ReactQueryDevtools = dynamic(
	() =>
		import('@tanstack/react-query-devtools').then(
			mod => mod.ReactQueryDevtools
		),
	{
		ssr: false
	}
)

interface QueryProviderProps {
	children: ReactNode
	dehydratedState?: DehydratedState
}

// Create localStorage persister for offline cache support
// Uses @tanstack/query-sync-storage-persister for reliable synchronous storage
function createLocalStoragePersister() {
	if (typeof window === 'undefined') {
		return undefined
	}

	return createSyncStoragePersister({
		storage: window.localStorage,
		key: 'REACT_QUERY_OFFLINE_CACHE'
	})
}

export function QueryProvider({
	children,
	dehydratedState
}: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Structural sharing for automatic re-render optimization
						structuralSharing: true,

						// Stale time - data is fresh for 5 minutes
						staleTime: 5 * 60 * 1000,

						// Cache time - unused data kept in cache for 10 minutes
						gcTime: 10 * 60 * 1000,

						// Smart retry with error categorization and analytics
						retry: (failureCount, error) => {
							const shouldRetry = defaultQueryRetry(failureCount, error)

							// Track query errors for analytics
							if (!shouldRetry) {
								trackQueryError(error, [], { retryCount: failureCount })
							}

							return shouldRetry
						},

						// Adaptive retry delay based on error type
						retryDelay: (attemptIndex, error) =>
							adaptiveRetryDelay(attemptIndex, error),

						// Refetch behavior for better UX
						refetchOnWindowFocus: false,
						refetchOnReconnect: true,
						refetchOnMount: true,

						// Network mode for offline support
						networkMode: 'online',

						// Throw errors in render (better error boundaries)
						throwOnError: false,

						// Placeholder data while loading (keep previous data during refetch)
						placeholderData: (previousData: unknown) => previousData
					},
					mutations: {
						// Smart mutation retry with analytics
						retry: (failureCount, error) => {
							const shouldRetry = defaultMutationRetry(failureCount, error)

							// Track mutation errors for analytics
							if (!shouldRetry) {
								trackMutationError(error, [], { retryCount: failureCount })
							}

							return shouldRetry
						},

						// Adaptive retry delay for mutations
						retryDelay: (attemptIndex, error) =>
							adaptiveRetryDelay(attemptIndex, error),

						// Network mode
						networkMode: 'online',

						// Global mutation cache
						gcTime: 5 * 60 * 1000
					}
				}
			})
	)

	const [persister] = useState(() => createLocalStoragePersister())
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const ErrorFallback = createErrorBoundaryFallback()

	// Conditional rendering based on persister availability
	if (persister && mounted) {
		return (
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={{
					persister,
					maxAge: 24 * 60 * 60 * 1000, // 24 hours
					buster: 'v1', // Increment to clear cache on breaking changes
					dehydrateOptions: {
						// Don't persist mutations
						shouldDehydrateMutation: () => false,
						// Only persist successful queries
						shouldDehydrateQuery: query => {
							return query.state.status === 'success'
						}
					}
				}}
			>
				<HydrationBoundary state={dehydratedState}>
					<QueryErrorResetBoundary>
						{({ reset }) => (
							<ErrorBoundary
								onReset={reset}
								fallbackRender={ErrorFallback}
								onError={(error, errorInfo) => {
									// Log error for debugging
									logger.error('QueryProvider - Application Error Boundary', {
										action: 'query_provider_error_boundary',
										metadata: {
											error: error.message,
											stack: error.stack,
											errorInfo
										}
									})
									showErrorToast(error, {
										operation: 'render component',
										metadata: { errorInfo }
									})
								}}
							>
								{children}
								{process.env.NODE_ENV === 'development' && (
									<ReactQueryDevtools initialIsOpen={false} />
								)}
							</ErrorBoundary>
						)}
					</QueryErrorResetBoundary>
				</HydrationBoundary>
			</PersistQueryClientProvider>
		)
	}

	return (
		<QueryClientProvider client={queryClient}>
			<HydrationBoundary state={dehydratedState}>
				<QueryErrorResetBoundary>
					{({ reset }) => (
						<ErrorBoundary
							onReset={reset}
							fallbackRender={ErrorFallback}
							onError={(error, errorInfo) => {
								// Log error for debugging
								logger.error('QueryProvider - Application Error Boundary', {
									action: 'query_provider_error_boundary',
									metadata: {
										error: error.message,
										stack: error.stack,
										errorInfo
									}
								})
								showErrorToast(error, {
									operation: 'render component',
									metadata: { errorInfo }
								})
							}}
						>
							{children}
							{process.env.NODE_ENV === 'development' && mounted && (
								<ReactQueryDevtools initialIsOpen={false} />
							)}
						</ErrorBoundary>
					)}
				</QueryErrorResetBoundary>
			</HydrationBoundary>
		</QueryClientProvider>
	)
}
