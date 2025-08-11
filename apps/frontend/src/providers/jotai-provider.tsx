'use client'

import { Provider } from 'jotai'
import { type ReactNode } from 'react'

interface JotaiProviderProps {
  children: ReactNode
}

export function JotaiProvider({ children }: JotaiProviderProps) {
  // QueryClient is provided by QueryProvider, no need to duplicate here
  // This just provides the Jotai store context
  return (
    <Provider>
      {children}
    </Provider>
  )
}