'use client'

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
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
 */
export function useUserProfile() {
	const supabase = getSupabaseClientInstance()
	const { user_id, isAuthenticated } = useCurrentUser()

	return useQuery({
		queryKey: userProfileKeys.profile(user_id!),
		queryFn: async () => {
			if (!user_id) throw new Error('No user ID')

			const { data, error } = await supabase
				.from('users')
				.select('id, email, first_name, last_name, user_type')
			.eq('id', user_id)
				.single()

			if (error) throw error
			return data
		},
		enabled: isAuthenticated && !!user_id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1
	})
}
