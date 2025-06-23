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
      const checkSession = store.checkSession
      checkSession()
    }

    // Cleanup function
    return () => {
      mountedRef.current = false
    }
  }, [store.checkSession]) // Include store.checkSession in dependencies

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

