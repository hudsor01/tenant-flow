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
		OWNER: 'bg-primary/10 text-primary-foreground border-primary/20',
		MANAGER: 'bg-info/10 text-info-foreground border-info/20',
		TENANT: 'bg-success/10 text-success-foreground border-success/20',
		ADMIN: 'bg-destructive/10 text-destructive-foreground border-destructive/20'
	}
	return colors[user_type] || 'bg-muted text-muted-foreground border-border'
}
