/**
 * Pure React 19 Context definition separated from components
 * This avoids react-refresh warnings by keeping context separate from providers
 */
import { createContext } from 'react'
import type { User } from '@tenantflow/shared'

// App-wide context that should be consumed with use() hook
export interface AppContextValue {
  user: User | null
  isAuthenticated: boolean
  theme: 'light' | 'dark' | 'system'
  isOnline: boolean
}

export const AppContext = createContext<AppContextValue | null>(null)