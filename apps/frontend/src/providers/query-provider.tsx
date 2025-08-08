/**
 * React Query provider
 * Provides React Query context for data fetching
 */
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes - longer for production
          gcTime: 30 * 60 * 1000, // 30 minutes - extended cache time
          retry: (failureCount, error: unknown) => {
            // Don't retry on 4xx errors
            const errorObj = error as { statusCode?: number };
            if (errorObj?.statusCode && errorObj.statusCode >= 400 && errorObj.statusCode < 500) {
              return false;
            }
            // Retry up to 3 times for other errors with exponential backoff
            return failureCount < 3;
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          refetchOnWindowFocus: 'always',
          refetchOnMount: true,
          refetchOnReconnect: 'always',
          // Network mode for better offline handling
          networkMode: 'online',
          // Background refetch for better UX
          refetchInterval: false,
          refetchIntervalInBackground: false,
          // Better loading state handling
        },
        mutations: {
          retry: 1, // Retry mutations once
          retryDelay: 1000,
          networkMode: 'online',
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}