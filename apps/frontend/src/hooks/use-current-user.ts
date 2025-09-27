'use client'

import { useAuthStore } from '@/stores/auth-provider'

/**
 * Hook to get current authenticated user information
 */
export function useCurrentUser() {
  const session = useAuthStore(state => state.session)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const user = session?.user

  return {
    user,
    userId: user?.id || null,
    isAuthenticated,
    isLoading
  }
}