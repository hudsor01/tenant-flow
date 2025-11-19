/**
 * Authentication utilities
 * Helper functions for user user_type display and management
 */

import type { USER_user_type } from '../constants/auth.js'

type UserType = (typeof USER_user_type)[keyof typeof USER_user_type]

export const getUserLabel = (user_type: UserType): string => {
	const labels: Record<UserType, string> = {
		OWNER: 'Property Owner',
		MANAGER: 'Property Manager',
		TENANT: 'Tenant',
		ADMIN: 'Administrator'
	}
	return labels[user_type] || user_type
}

export const getUserColor = (user_type: UserType): string => {
	const colors: Record<UserType, string> = {
		OWNER: 'bg-purple-100 text-purple-800',
		MANAGER: 'bg-blue-100 text-blue-800',
		TENANT: 'bg-green-100 text-green-800',
		ADMIN: 'bg-red-100 text-red-800'
	}
	return colors[user_type] || 'bg-gray-100 text-gray-800'
}
