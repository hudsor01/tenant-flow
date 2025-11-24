'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './use-current-user'

/**
 * Query keys for user profile
 */
export const userProfileKeys = {
	all: ['userProfile'] as const,
	profile: (user_id: string) => [...userProfileKeys.all, user_id] as const
}

/**
 * Hook to fetch user's full profile from database (includes user_type)
 * User records are created automatically by the auth hook (custom_access_token_hook)
 * which fires on every login. This hook simply reads the existing user profile.
 */
type UserProfileData = {
	id: string
	email: string | null
	first_name: string | null
	last_name: string | null
	user_type: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN' | null
}

export function useUserProfile() {
	const { user, isAuthenticated, session } = useCurrentUser()

	return useQuery<UserProfileData | null>({
		// queryKey only needs user.id since user metadata changes will result in a new user object with a different ID in practice
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: userProfileKeys.profile(user?.id ?? ''),
		queryFn: async () => {
			if (!user) return null

			// Get user data from JWT app_metadata (set by custom access token hook)
			// This avoids client-side database queries and 403 errors
			const appMetadata = user.app_metadata as {
				user_type?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
			}

			return {
				id: user.id,
				email: user.email ?? '',
				first_name: (user.user_metadata?.first_name as string) ?? null,
				last_name: (user.user_metadata?.last_name as string) ?? null,
				user_type: appMetadata.user_type ?? null
			}
		},
		enabled: isAuthenticated && !!user && !!session,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1
	})
}
