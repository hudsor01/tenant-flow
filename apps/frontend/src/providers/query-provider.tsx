/**
 * React Query provider
 * Provides React Query context (removed Zustand sync dependency)
 */
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
	// Direct QueryClient creation - no abstraction needed
	const [queryClient] = useState(() => new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000, // 1 minute
				gcTime: 5 * 60 * 1000, // 5 minutes
				retry: 3,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: 1,
			},
		},
	}))

	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}
