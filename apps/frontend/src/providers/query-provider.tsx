'use client'

import type { DefaultOptions, DehydratedState } from '@tanstack/react-query'
import {
	HydrationBoundary,
	QueryClient,
	QueryClientProvider
} from '@tanstack/react-query'
import type { Persister } from '@tanstack/react-query-persist-client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

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

						// Placeholder data while loading (keep previous data during refetch)
						placeholderData: (previousData: unknown) => previousData
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
					persistClient: (client: unknown) => set(QUERY_CACHE_KEY, client),
					restoreClient: () => get(QUERY_CACHE_KEY),
					removeClient: () => del(QUERY_CACHE_KEY)
				}

				setPersister(idbPersister)
				setIsPersistenceReady(true)
			} catch (error) {
				if (process.env.NODE_ENV !== 'production') {
					// eslint-disable-next-line no-console, no-restricted-syntax
					console.warn(
						'[QueryProvider] Failed to initialize IndexedDB persistence. Falling back to in-memory cache.',
						error
					)
				}
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
						shouldDehydrateQuery: () => true
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
