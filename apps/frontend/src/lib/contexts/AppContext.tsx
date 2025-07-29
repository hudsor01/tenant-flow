/**
 * Pure React 19 Context using the new use() hook pattern
 * This replaces traditional useContext patterns with the new use() hook
 */
import { createContext, type ReactNode } from 'react'
import type { User } from '@tenantflow/shared/types/auth'

// App-wide context that should be consumed with use() hook
interface AppContextValue {
  user: User | null
  isAuthenticated: boolean
  theme: 'light' | 'dark' | 'system'
  isOnline: boolean
}

export const AppContext = createContext<AppContextValue | null>(null)

interface AppContextProviderProps {
  children: ReactNode
  value: AppContextValue
}

export function AppContextProvider({ children, value }: AppContextProviderProps) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Pure React 19 hook using use() instead of useContext
export function useAppContext() {
  const context = use(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider')
  }
  return context
}

// For components that need to consume promises
export function createAsyncContext<T>() {
  const Context = createContext<Promise<T> | T | null>(null)
  
  return {
    Provider: Context.Provider,
    // React 19 use() hook can handle both promises and direct values
    useValue: () => {
      const value = use(Context)
      if (value === null) {
        throw new Error('Context must be used within its Provider')
      }
      return value
    }
  }
}