'use client'

import { useAuth } from '@/stores/auth-provider'

/**
 * Hook to get current authenticated user information
 * Aligned with official Supabase patterns while keeping React Query benefits
 */
export function useCurrentUser() {
  const { session, isAuthenticated, isLoading, user } = useAuth()

  return {
    user,
    userId: user?.id || null,
    isAuthenticated,
    isLoading,
    session
  }
}