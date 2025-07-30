/**
 * Pure React 19 Context Provider component
 * Context definition is in app-context.ts to avoid react-refresh warnings
 */
import { type ReactNode } from 'react'
import { AppContext, type AppContextValue } from './app-context'

interface AppContextProviderProps {
  children: ReactNode
  value: AppContextValue
}

export function AppContextProvider({ children, value }: AppContextProviderProps) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}