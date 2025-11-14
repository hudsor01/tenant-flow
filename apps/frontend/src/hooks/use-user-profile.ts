'use client'

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './use-current-user'

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
	const supabase = getSupabaseClientInstance()
	const { userId, isAuthenticated } = useCurrentUser()

	return useQuery({
		queryKey: userProfileKeys.profile(userId!),
		queryFn: async () => {
			if (!userId) throw new Error('No user ID')

			const { data: authData } = await supabase.auth.getUser()
			const { data, error } = await supabase
				.from('users')
				.select('id, email, firstName, lastName, role, profileComplete, orgId')
				.eq('supabaseId', userId)
				.eq('orgId', authData.user?.app_metadata?.org_id)
				.single()

			if (error) throw error
			return data
		},
		enabled: isAuthenticated && !!userId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1
	})
}
