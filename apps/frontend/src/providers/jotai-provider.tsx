'use client'

import { Provider } from 'jotai'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

interface JotaiProviderProps {
  children: ReactNode
}

export function JotaiProvider({ children }: JotaiProviderProps) {
  // Create QueryClient instance with optimized defaults
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
          retry: (failureCount, error) => {
            // Don't retry on 4xx errors
            if (error instanceof Error && 'status' in error && 
                typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
              return false
            }
            return failureCount < 3
          },
        },
        mutations: {
          retry: false,
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        {children}
      </Provider>
    </QueryClientProvider>
  )
}