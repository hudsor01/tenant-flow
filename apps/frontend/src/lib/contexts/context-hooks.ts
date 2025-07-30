/**
 * Context hooks separated to avoid react-refresh warnings
 */
import { createContext, use } from 'react'
import { AppContext } from './app-context'

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