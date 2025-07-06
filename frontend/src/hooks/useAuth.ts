import { useContext } from 'react'
import { AuthContext } from '@/contexts/auth-context'

/**
 * Hook to use auth context
 * Separated from AuthContext.tsx to fix React Fast Refresh warning
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}