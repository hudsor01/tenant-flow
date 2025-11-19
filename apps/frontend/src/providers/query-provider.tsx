'use client'

import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { DehydratedState, DefaultOptions } from '@tanstack/react-query'
import {
	HydrationBoundary,
	keepPreviousData,
	QueryClient,
	QueryClientProvider,
	focusManager,
	onlineManager
} from '@tanstack/react-query'
import type { Persister } from '@tanstack/react-query-persist-client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

const logger = createLogger({ component: 'QueryProvider' })

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

export function QueryProvider({
	children,
	dehydratedState
}: QueryProviderProps) {
	const [persister, setPersister] = useState<Persister | null>(null)
	const [isPersistenceReady, setIsPersistenceReady] = useState(false)
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

						// Advanced retry logic with jittered exponential backoff
						retry: (failureCount, error) => {
							// Don't retry on 4xx errors (client errors)
							if (error && typeof error === 'object' && 'status' in error) {
								const status = (error as { status: number }).status
								if (status >= 400 && status < 500) {
									return false
								}
							}
							// Retry up to 3 times for other errors
							return failureCount < 3
						},
						retryDelay: (attemptIndex) => {
							// Jittered exponential backoff: base delay with random jitter
							const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000)
							const jitter = Math.random() * 0.3 * baseDelay // ±30% jitter
							return baseDelay + jitter
						},

						// Smart refetch behavior
						refetchOnWindowFocus: 'always',
						refetchOnReconnect: 'always',
						refetchOnMount: true,

						// Network mode for offline support
						networkMode: 'online',

						// Throw errors in render (better error boundaries)
						throwOnError: false,

						// Keep previous data during refetch (official v5 helper)
						placeholderData: keepPreviousData
					},
					mutations: {
						// Network mode
						networkMode: 'online',

						// Global mutation cache
						gcTime: 5 * 60 * 1000,

						// Global mutation events
						onSuccess: (data, variables, context) => {
							logger.debug('Mutation succeeded', {
								action: 'mutation_success',
								metadata: {
									variables: typeof variables === 'object' ? Object.keys(variables || {}) : String(variables),
									hasRollbackData: !!context
								}
							})
						},
						onError: (error, variables, context) => {
							logger.warn('Mutation failed', {
								action: 'mutation_error',
								metadata: {
									error: error instanceof Error ? error.message : String(error),
									variables: typeof variables === 'object' ? Object.keys(variables || {}) : String(variables),
									hasRollbackData: !!context
								}
							})
						}
					}
				}
			})
	)

	// Configure global query events for monitoring
	useEffect(() => {
		const unsubscribeQueryCache = queryClient.getQueryCache().subscribe(event => {
			if (event.type === 'added') {
				logger.debug('Query added', {
					action: 'query_added',
					metadata: { queryKey: event.query.queryKey }
				})
			} else if (event.type === 'removed') {
				logger.debug('Query removed', {
					action: 'query_removed',
					metadata: { queryKey: event.query.queryKey }
				})
			}
		})

		const unsubscribeMutationCache = queryClient.getMutationCache().subscribe(event => {
			if (event.type === 'added') {
				logger.debug('Mutation added', {
					action: 'mutation_added',
					metadata: { mutationId: event.mutation.mutationId }
				})
			} else if (event.type === 'removed') {
				logger.debug('Mutation removed', {
					action: 'mutation_removed',
					metadata: { mutationId: event.mutation.mutationId }
				})
			}
		})

		return () => {
			unsubscribeQueryCache()
			unsubscribeMutationCache()
		}
	}, [queryClient])

	// Configure focus and online managers for advanced UX
	useEffect(() => {
		// Focus manager: refetch queries when window regains focus
		focusManager.setEventListener(handleFocus => {
			if (typeof window !== 'undefined') {
				const handleFocusIn = () => handleFocus(true)
				const handleFocusOut = () => handleFocus(false)

				window.addEventListener('focus', handleFocusIn)
				window.addEventListener('blur', handleFocusOut)

				return () => {
					window.removeEventListener('focus', handleFocusIn)
					window.removeEventListener('blur', handleFocusOut)
				}
			}
			return () => {} // No-op cleanup for SSR
		})

		// Online manager: pause/resume queries based on network status
		onlineManager.setEventListener(setOnline => {
			if (typeof window !== 'undefined') {
				const handleOnline = () => setOnline(true)
				const handleOffline = () => setOnline(false)

				window.addEventListener('online', handleOnline)
				window.addEventListener('offline', handleOffline)

				// Set initial online status
				setOnline(navigator.onLine)

				return () => {
					window.removeEventListener('online', handleOnline)
					window.removeEventListener('offline', handleOffline)
				}
			}
			return () => {} // No-op cleanup for SSR
		})
	}, [])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		let cancelled = false

		async function initializePersister() {
			try {
				const { del, get, set } = await import('idb-keyval')
				if (cancelled) return

				const idbPersister: Persister = {
					persistClient: async (client: unknown) => {
						try {
							await set(QUERY_CACHE_KEY, client)
						} catch (error) {
							// DataCloneError or QuotaExceededError - fail silently
							logger.warn('Failed to persist cache to IndexedDB', {
								action: 'persist_client_error',
								metadata: {
									error: error instanceof Error ? error.message : String(error)
								}
							})
						}
					},
					restoreClient: async () => {
						try {
							return await get(QUERY_CACHE_KEY)
						} catch (error) {
							logger.warn('Failed to restore cache from IndexedDB', {
								action: 'restore_client_error',
								metadata: {
									error: error instanceof Error ? error.message : String(error)
								}
							})
							return undefined
						}
					},
					removeClient: async () => {
						try {
							await del(QUERY_CACHE_KEY)
						} catch (error) {
							logger.warn('Failed to remove cache from IndexedDB', {
								action: 'remove_client_error',
								metadata: {
									error: error instanceof Error ? error.message : String(error)
								}
							})
						}
					}
				}

				setPersister(idbPersister)
				setIsPersistenceReady(true)
			} catch (error) {
				logger.warn(
					'Failed to initialize IndexedDB persistence - falling back to in-memory cache',
					{
						action: 'init_persister_error',
						metadata: {
							error: error instanceof Error ? error.message : String(error)
						}
					}
				)
				setIsPersistenceReady(false)
			}
		}

		void initializePersister()

		return () => {
			cancelled = true
		}
	}, [])

	useEffect(() => {
		if (
			typeof window === 'undefined' ||
			process.env.NODE_ENV === 'production'
		) {
			return
		}

		const defaults = queryClient.getDefaultOptions()
		window.__TENANTFLOW_QUERY_DEFAULTS__ = defaults as Pick<
			DefaultOptions,
			'queries' | 'mutations'
		>
		window.__TENANTFLOW_QUERY_CLIENT__ = queryClient
		window.__TENANTFLOW_QUERY_CACHE_KEY__ = QUERY_CACHE_KEY

		return () => {
			delete window.__TENANTFLOW_QUERY_DEFAULTS__
			delete window.__TENANTFLOW_QUERY_CLIENT__
			delete window.__TENANTFLOW_QUERY_CACHE_KEY__
		}
	}, [queryClient])

	const hydrateContent = useMemo(
		() => (
			<HydrationBoundary state={dehydratedState}>
				{children}
				{process.env.NODE_ENV === 'development' && (
					<ReactQueryDevtools initialIsOpen={false} />
				)}
			</HydrationBoundary>
		),
		[children, dehydratedState]
	)

	if (persister && isPersistenceReady) {
		return (
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={{
					persister,
					maxAge: QUERY_CACHE_MAX_AGE,
					buster: QUERY_CACHE_BUSTER,
					dehydrateOptions: {
						shouldDehydrateQuery: query => {
							// Only persist successfully resolved queries
							const queryState = query.state

							// Skip queries that are currently fetching or have errors
							if (
								queryState.status === 'pending' ||
								queryState.fetchStatus === 'fetching'
							) {
								return false
							}

							// Skip queries with errors
							if (queryState.status === 'error') {
								return false
							}

							// Skip auth session queries (sensitive data)
							const queryKey = query.queryKey[0] as string
							if (queryKey === 'auth') {
								return false
							}

							// Skip if data contains non-serializable values
							try {
								if (queryState.data) {
									// Quick check: try to stringify the data
									JSON.stringify(queryState.data)
								}
							} catch {
								// Data is not serializable, skip it
								return false
							}

							// Only persist queries with actual data
							return queryState.status === 'success' && queryState.data !== null
						}
					}
				}}
			>
				{hydrateContent}
			</PersistQueryClientProvider>
		)
	}

	// Conditional rendering based on persister availability
	return (
		<QueryClientProvider client={queryClient}>
			{hydrateContent}
		</QueryClientProvider>
	)
}

const QUERY_CACHE_KEY = 'tenantflow-query-cache'
const QUERY_CACHE_BUSTER = 'tenantflow-cache-v1'
const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 // 24 hours

declare global {
	interface Window {
		__TENANTFLOW_QUERY_DEFAULTS__?: Pick<
			DefaultOptions,
			'queries' | 'mutations'
		>
		__TENANTFLOW_QUERY_CLIENT__?: QueryClient
		__TENANTFLOW_QUERY_CACHE_KEY__?: string
	}
}
