import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { trpc, trpcClient, queryClient } from '@/lib/trpcClient'

interface TrpcProviderProps {
  children: React.ReactNode
}

export function TrpcProvider({ children }: TrpcProviderProps) {
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