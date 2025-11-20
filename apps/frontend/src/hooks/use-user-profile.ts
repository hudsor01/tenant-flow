'use client'

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import type { Database } from '@repo/shared/types/supabase'

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
type UserProfileData = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'email' | 'first_name' | 'last_name' | 'user_type'>

export function useUserProfile() {
	const supabase = getSupabaseClientInstance()
	const { user_id, isAuthenticated, session } = useCurrentUser()

	return useQuery<UserProfileData | null>({
		queryKey: userProfileKeys.profile(user_id!),
		queryFn: async () => {
			if (!user_id) throw new Error('No user ID')

			const { data, error } = await supabase
				.from('users')
				.select('id, email, first_name, last_name, user_type')
				.eq('id', user_id)
				.maybeSingle()

			if (error) throw error
		return data
		},
		enabled: isAuthenticated && !!user_id && !!session,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1
	})
}
