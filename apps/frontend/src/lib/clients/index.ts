/**
 * Centralized API clients for TenantFlow frontend
 */

import { QueryClient } from '@tanstack/react-query'

// Create QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
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
})

// Supabase clients for authentication and database
export { supabase, supabaseAnon } from './supabase-client'

// HTTP client for generic API calls
export * from './api-client'