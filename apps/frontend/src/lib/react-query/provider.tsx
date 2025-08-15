'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createQueryClient } from './query-client'

interface ReactQueryProviderProps {
  children: React.ReactNode
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}