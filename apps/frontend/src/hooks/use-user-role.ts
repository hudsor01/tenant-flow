'use client'

import type { UserRole } from '@repo/shared/types/auth'
import { useUserProfile } from './use-user-profile'

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
	canAccessOwnerFeatures: boolean
	canAccessTenantFeatures: boolean
} {
	const { data: profile, isLoading } = useUserProfile()

	const role = profile?.role || null
	const isOwner = role === 'OWNER'
	const isManager = role === 'MANAGER'
	const isTenant = role === 'TENANT'
	const isAdmin = role === 'ADMIN'

	// Owner features: OWNER, MANAGER, ADMIN
	const canAccessOwnerFeatures = isOwner || isManager || isAdmin

	// Tenant features: TENANT only
	const canAccessTenantFeatures = isTenant

	return {
		role,
		isOwner,
		isManager,
		isTenant,
		isAdmin,
		isLoading,
		canAccessOwnerFeatures,
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
