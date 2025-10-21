'use client'

import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { DefaultOptions, DehydratedState } from '@tanstack/react-query'
import {
	HydrationBoundary,
	keepPreviousData,
	QueryClient,
	QueryClientProvider
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

						// Refetch behavior for better UX
						refetchOnWindowFocus: false,
						refetchOnReconnect: true,
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
						gcTime: 5 * 60 * 1000
					}
				}
			})
	)

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
