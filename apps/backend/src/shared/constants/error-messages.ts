/**
 * Centralized Error Messages
 * Single source of truth for error strings used across the backend
 */

export const ERROR_MESSAGES = {
	AUTH: {
		NOT_AUTHENTICATED: 'User not authenticated',
		REQUIRED: 'Authentication required',
		JWT_NOT_FOUND: 'JWT token not found'
	}
} as const
