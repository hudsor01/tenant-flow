'use client'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@repo/shared/types/supabase-generated'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './use-current-user'

type UserRole = Database['public']['Enums']['UserRole']

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
		queryKey: userProfileKeys.profile(userId || ''),
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

/**
 * Hook to get user's role
 */
export function useUserRole(): {
	role: UserRole | null
	isOwner: boolean
	isManager: boolean
	isTenant: boolean
	isAdmin: boolean
	isLoading: boolean
	canAccessLandlordFeatures: boolean
	canAccessTenantFeatures: boolean
} {
	const { data: profile, isLoading } = useUserProfile()

	const role = profile?.role || null
	const isOwner = role === 'OWNER'
	const isManager = role === 'MANAGER'
	const isTenant = role === 'TENANT'
	const isAdmin = role === 'ADMIN'

	// Landlord features: OWNER, MANAGER, ADMIN
	const canAccessLandlordFeatures = isOwner || isManager || isAdmin

	// Tenant features: TENANT only
	const canAccessTenantFeatures = isTenant

	return {
		role,
		isOwner,
		isManager,
		isTenant,
		isAdmin,
		isLoading,
		canAccessLandlordFeatures,
		canAccessTenantFeatures
	}
}

/**
 * Hook to check if user has specific role(s)
 */
export function useHasRole(requiredRoles: UserRole | UserRole[]): boolean {
	const { role } = useUserRole()
	if (!role) return false

	const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
	return roles.includes(role)
}
