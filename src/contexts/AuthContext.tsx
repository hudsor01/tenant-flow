import { useEffect, ReactNode } from 'react'
import { useAuthStore } from '@/store/authStore'
import { AuthContext, AuthContextType } from '@/contexts/AuthContextDefinition'

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore()

  // Check session on mount
  useEffect(() => {
    store.checkSession()
  }, [store.checkSession])

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

