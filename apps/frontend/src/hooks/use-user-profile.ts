'use client'

import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import type { Database } from '@repo/shared/types/supabase'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './use-current-user'

/**
 * Query keys for user profile
 */
export const userProfileKeys = {
	all: ['userProfile'] as const,
	profile: (user_id: string, user: Session['user'] | null | undefined) => [...userProfileKeys.all, user_id, user] as const
}

/**
 * Hook to fetch user's full profile from database (includes user_type)
 * If user record doesn't exist in public.users, automatically creates it from auth data
 * This handles the case where auth hook hasn't fired yet or user was created outside the normal flow
 */
type UserProfileData = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'email' | 'first_name' | 'last_name' | 'user_type'>

export function useUserProfile() {
	const supabase = getSupabaseClientInstance()
	const { user_id, isAuthenticated, user, session } = useCurrentUser()

	return useQuery<UserProfileData | null>({
		queryKey: userProfileKeys.profile(user_id!, user),
		queryFn: async () => {
			if (!user_id) throw new Error('No user ID')

			const { data, error } = await supabase
				.from('users')
				.select('id, email, first_name, last_name, user_type')
				.eq('id', user_id)
				.maybeSingle()

			// If user record doesn't exist, create it from auth user data
			if (!error && !data && user) {
				const { data: newUser, error: createError } = await supabase
					.from('users')
					.insert([
						{
							id: user_id,
							email: user.email || '',
							full_name: user.user_metadata?.full_name || '',
							first_name: user.user_metadata?.first_name || '',
							last_name: user.user_metadata?.last_name || '',
							user_type: user.user_metadata?.user_type || 'tenant',
							status: 'active'
						}
					])
					.select('id, email, first_name, last_name, user_type')
					.single()

				if (createError) throw createError
				return newUser
			}

			if (error) throw error
			return data
		},
		enabled: isAuthenticated && !!user_id && !!session,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1
	})
}
