'use client'

import { useAuth } from '#providers/auth-provider'

/**
 * Hook to get current authenticated user information
 * Aligned with official Supabase patterns while keeping React Query benefits
 */
export function useCurrentUser() {
	const { session, isAuthenticated, isLoading, user } = useAuth()

	return {
		user,
		user_id: user?.id || null,
		isAuthenticated,
		isLoading,
		session
	}
}
