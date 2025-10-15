'use client'

import type { DehydratedState } from '@tanstack/react-query'
import {
	HydrationBoundary,
	QueryClient,
	QueryClientProvider
} from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { useState } from 'react'

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

	// Conditional rendering based on persister availability
	return (
		<QueryClientProvider client={queryClient}>
			<HydrationBoundary state={dehydratedState}>
				{children}
				{process.env.NODE_ENV === 'development' && (
					<ReactQueryDevtools initialIsOpen={false} />
				)}
			</HydrationBoundary>
		</QueryClientProvider>
	)
}
