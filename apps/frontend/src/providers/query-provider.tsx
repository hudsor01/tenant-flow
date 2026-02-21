'use client'

import * as Sentry from '@sentry/nextjs'
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
import { isApiError } from '#lib/api-request'
import { createQueryErrorHandlers } from './query-error-handler'
import { buildPersistOptions, createIdbPersister } from './query-persistence'

const logger = createLogger({ component: 'QueryProvider' })
const queryErrorHandlers = createQueryErrorHandlers(logger)

// Dynamically import DevTools for development only (unused but kept for future use)
const _ReactQueryDevtools = dynamic(
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
						retry: queryErrorHandlers.retry,
						retryDelay: queryErrorHandlers.retryDelay,

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
						onSuccess: queryErrorHandlers.onMutationSuccess,
						onError: queryErrorHandlers.onMutationError
					}
				}
			})
	)

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

		const initializePersister = async () => {
			const idbPersister = await createIdbPersister(logger, QUERY_CACHE_KEY)
			if (cancelled) return

			if (idbPersister) {
				setPersister(idbPersister)
				setIsPersistenceReady(true)
				return
			}

			setIsPersistenceReady(false)
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

	// Capture query and mutation errors to Sentry
	useEffect(() => {
		// Capture query errors to Sentry (skip expected 4xx client errors)
		const queryUnsubscribe = queryClient.getQueryCache().subscribe(event => {
			if (event.type === 'updated' && event.query.state.status === 'error') {
				const error = event.query.state.error
				// 4xx errors are expected (auth errors, validation, not found) - not bugs
				if (isApiError(error) && error.isClientError) return
				Sentry.captureException(error, {
					tags: { source: 'react-query' },
					contexts: {
						react_query: {
							queryKey: JSON.stringify(event.query.queryKey),
							queryHash: event.query.queryHash
						}
					}
				})
			}
		})

		// Capture mutation errors to Sentry (skip expected 4xx client errors)
		const mutationUnsubscribe = queryClient
			.getMutationCache()
			.subscribe(event => {
				if (
					event.type === 'updated' &&
					event.mutation.state.status === 'error'
				) {
					const error = event.mutation.state.error
					// 4xx errors are expected (validation, conflicts) - not bugs
					if (isApiError(error) && error.isClientError) return
					Sentry.captureException(error, {
						tags: { source: 'react-query-mutation' },
						contexts: {
							react_query: {
								mutationKey: event.mutation.options.mutationKey
									? JSON.stringify(event.mutation.options.mutationKey)
									: undefined
							}
						}
					})
				}
			})

		return () => {
			queryUnsubscribe()
			mutationUnsubscribe()
		}
	}, [queryClient])

	const hydrateContent = useMemo(
		() => (
			<HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
		),
		[children, dehydratedState]
	)

	if (persister && isPersistenceReady) {
		return (
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={buildPersistOptions({
					persister,
					maxAge: QUERY_CACHE_MAX_AGE,
					buster: QUERY_CACHE_BUSTER
				})}
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
