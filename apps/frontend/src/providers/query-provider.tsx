/**
 * React Query provider
 * Provides React Query context (removed Zustand sync dependency)
 */
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { getQueryClient } from '@/lib/react-query/query-client'

export function QueryProvider({ children }: { children: ReactNode }) {
	// Use the centralized QueryClient configuration
	const [queryClient] = useState(() => getQueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}
