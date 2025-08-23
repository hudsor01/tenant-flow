'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { getQueryClient } from '../lib/react-query/query-client'

interface ReactQueryProviderProps {
	children: React.ReactNode
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
	const [queryClient] = useState(() => getQueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	)
}
