import { useEffect, ReactNode, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { AuthContext, AuthContextType } from '@/contexts/AuthContextDefinition'

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore()
  const mountedRef = useRef(true)
  const hasCheckedSession = useRef(false)

  // Check session on mount with proper cleanup
  useEffect(() => {
    mountedRef.current = true
    
    // Only check session once per app load
    if (!hasCheckedSession.current) {
      hasCheckedSession.current = true
      
      // Add small delay to prevent race conditions
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          // Call checkSession directly to avoid dependency issues
          store.checkSession()
        }
      }, 100)

      // Cleanup timeout if component unmounts
      return () => {
        clearTimeout(timeoutId)
        mountedRef.current = false
      }
    }

    // Cleanup function
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - disable warning since we intentionally want this

  const value: AuthContextType = {
    user: store.user,
    isLoading: store.isLoading,
    error: store.error,
    signInWithGoogle: store.signInWithGoogle,
    signOut: store.signOut,
    checkSession: store.checkSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

