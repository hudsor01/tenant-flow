import { useEffect, ReactNode, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { AuthContext, AuthContextType } from '@/contexts/AuthContextDefinition'

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore()
  const mountedRef = useRef(true)

  // Check session on mount with proper cleanup
  useEffect(() => {
    mountedRef.current = true
    
    // Create a stable reference to checkSession
    const checkSessionSafely = async () => {
      if (mountedRef.current) {
        await store.checkSession()
      }
    }
    
    checkSessionSafely()

    // Cleanup function
    return () => {
      mountedRef.current = false
    }
  }, []) // Empty dependency - only run once on mount to prevent excessive re-renders

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

