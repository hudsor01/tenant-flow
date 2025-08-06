/**
 * Component Test Helpers
 * React components for testing with all necessary providers
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Component wrapper with all providers
interface WrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
  user?: unknown
  initialRoute?: string
}

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const ComponentWrapper: React.FC<WrapperProps> = ({ 
  children, 
  queryClient = createTestQueryClient(),
  user: _user,
  initialRoute: _initialRoute = '/'
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// This file only exports React components for Fast Refresh compatibility