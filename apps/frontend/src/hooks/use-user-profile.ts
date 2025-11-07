'use client'

import { createClient } from '#lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './use-current-user'

const supabase = createClient()

/**
 * Query keys for user profile
 */
export const userProfileKeys = {
	all: ['userProfile'] as const,
	profile: (userId: string) => [...userProfileKeys.all, userId] as const
}

/**
 * Hook to fetch user's full profile from database (includes role)
 */
export function useUserProfile() {
	const { userId, isAuthenticated } = useCurrentUser()

	return useQuery({
		queryKey: userId ? userProfileKeys.profile(userId) : ['userProfile', 'no-user'],
		queryFn: async () => {
			if (!userId) throw new Error('No user ID')

			const { data, error } = await supabase
				.from('users')
				.select('id, email, firstName, lastName, role, profileComplete')
				.eq('supabaseId', userId)
				.single()

			if (error) throw error
			return data
		},
		enabled: isAuthenticated && !!userId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1
	})
}
