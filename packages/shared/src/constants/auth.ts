/**
 * Authentication constants
 * Runtime constants and enums for user authentication and user_types
 */

export const USER_user_type = {
	OWNER: 'OWNER',
	MANAGER: 'MANAGER',
	TENANT: 'TENANT',
	ADMIN: 'ADMIN'
} as const

export const USER_user_type_OPTIONS = Object.values(USER_user_type)
