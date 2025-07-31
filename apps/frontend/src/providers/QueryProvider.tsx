import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { lazy, Suspense } from 'react'

// Lazy load devtools only in development
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((mod) => ({
        default: mod.ReactQueryDevtools,
      }))
    )
  : () => null

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create a QueryClient instance for API calls
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          const httpError = error as { message?: string }
          if (httpError?.message?.includes('40') || httpError?.message?.includes('Unauthorized')) {
            return false
          }
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: false, // Don't retry mutations by default
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}