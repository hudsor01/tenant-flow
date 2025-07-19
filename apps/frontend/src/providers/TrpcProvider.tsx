import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useMemo } from 'react'
import { trpc, createTRPCClient, queryClient } from '@/lib/api'

interface TrpcProviderProps {
  children: React.ReactNode
}

export function TrpcProvider({ children }: TrpcProviderProps) {
  // Create TRPC client once
  const trpcClient = useMemo(() => createTRPCClient(), [])

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
