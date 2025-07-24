import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { trpc } from '@/lib/utils/trpc'
import { getTRPCClientConfig } from '@/lib/clients/trpc-client'

interface TrpcProviderProps {
  children: React.ReactNode
}

export function TrpcProvider({ children }: TrpcProviderProps) {
  // Create a QueryClient instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          const httpError = error as { data?: { httpStatus?: number } }
          if (httpError?.data?.httpStatus && httpError.data.httpStatus >= 400 && httpError.data.httpStatus < 500) {
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

  // Create TRPC client with the configuration
  const [trpcClient] = useState(() => 
    trpc.createClient(getTRPCClientConfig())
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {import.meta.env.DEV && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  )
}