'use client'

import { QueryClient, QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { createErrorBoundaryFallback, showErrorToast } from '@/lib/error-handler'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          retry: (failureCount, error) => {
            // Don't retry on authentication errors
            if (error instanceof Error && error.message.includes('unauthorized')) {
              return false
            }
            // Retry up to 3 times for other errors
            return failureCount < 3
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: (failureCount, error) => {
            // Don't retry mutations on client errors (4xx)
            if (error instanceof Error && (
              error.message.includes('400') ||
              error.message.includes('401') ||
              error.message.includes('403') ||
              error.message.includes('404') ||
              error.message.includes('422')
            )) {
              return false
            }
            // Retry server errors up to 2 times
            return failureCount < 2
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        }
      },
    })
  )

  const ErrorFallback = createErrorBoundaryFallback('application')

  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={ErrorFallback}
            onError={(error, errorInfo) => {
              // Log error for debugging
              console.error('Application Error Boundary:', error, errorInfo)
              showErrorToast(error, {
                operation: 'render component',
                metadata: { errorInfo }
              })
            }}
          >
            {children}
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </QueryClientProvider>
  )
}