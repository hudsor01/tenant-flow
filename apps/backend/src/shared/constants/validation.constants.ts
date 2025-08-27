/**
 * Common validation constants to eliminate DRY violations
 * Single source of truth for validation rules used across DTOs
 */

/**
 * Password validation - used in LoginDto, RegisterDto, ResetPasswordDto, ChangePasswordDto
 */
export const PASSWORD_VALIDATION = {
	MIN_LENGTH: 8,
	REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
	MESSAGES: {
		MIN_LENGTH: 'Password must be at least 8 characters',
		COMPLEXITY:
			'Password must contain uppercase, lowercase, number and special character'
	}
} as const

/**
 * Email validation message - used across multiple DTOs
 */
export const EMAIL_VALIDATION = {
	MESSAGE: 'Please enter a valid email address'
} as const

/**
 * Name validation - used in RegisterDto and other DTOs
 */
export const NAME_VALIDATION = {
	MIN_LENGTH: 2,
	MAX_LENGTH: 100,
	MESSAGES: {
		MIN_LENGTH: 'Name must be at least 2 characters',
		MAX_LENGTH: 'Name must be less than 100 characters'
	}
} as const

/**
 * Company validation
 */
export const COMPANY_VALIDATION = {
	MAX_LENGTH: 100,
	MESSAGE: 'Company name must be less than 100 characters'
} as const
