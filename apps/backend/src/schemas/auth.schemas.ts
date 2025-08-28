/**
 * Authentication Schemas
 *
 * JSON Schema definitions for authentication endpoints.
 * These schemas replace class-validator DTOs and provide automatic TypeScript type inference.
 *
 * Benefits:
 * - Single source of truth for validation and types
 * - Automatic TypeScript type inference
 * - Better performance than class-validator
 * - Consistent error messages
 */

import type { JSONSchema } from '../shared/types/fastify-type-provider'
import {
	COMPANY_VALIDATION,
	EMAIL_VALIDATION,
	NAME_VALIDATION,
	PASSWORD_VALIDATION
} from '../shared/constants/validation.constants'

// Base email schema
const emailSchema: JSONSchema = {
	type: 'string',
	format: 'email',
	minLength: 1,
	maxLength: 255,
	description: EMAIL_VALIDATION.MESSAGE
}

// Base password schema
const passwordSchema: JSONSchema = {
	type: 'string',
	minLength: PASSWORD_VALIDATION.MIN_LENGTH,
	pattern: PASSWORD_VALIDATION.REGEX.source,
	description:
		'Password must contain uppercase, lowercase, number and special character'
}

// Name validation schema
const nameSchema: JSONSchema = {
	type: 'string',
	minLength: NAME_VALIDATION.MIN_LENGTH,
	maxLength: NAME_VALIDATION.MAX_LENGTH,
	pattern: "^[a-zA-Z\\s\\-\\.']+$",
	description:
		'Name must contain only letters, spaces, hyphens, periods, and apostrophes'
}

// Company schema
const companySchema: JSONSchema = {
	type: 'string',
	maxLength: COMPANY_VALIDATION.MAX_LENGTH,
	description: COMPANY_VALIDATION.MESSAGE
}

/**
 * Login request schema
 */
export interface LoginRequest {
	email: string
	password: string
	rememberMe?: boolean
}

export const loginSchema: JSONSchema = {
	type: 'object',
	required: ['email', 'password'],
	additionalProperties: false,
	properties: {
		email: emailSchema,
		password: {
			type: 'string',
			minLength: 1,
			description: 'User password'
		},
		rememberMe: {
			type: 'boolean',
			default: false,
			description: 'Keep user logged in for extended period'
		}
	}
}

/**
 * Registration request schema
 */
export interface RegisterRequest {
	name: string
	email: string
	password: string
	company?: string
	acceptTerms?: boolean
}

export const registerSchema: JSONSchema = {
	type: 'object',
	required: ['name', 'email', 'password'],
	additionalProperties: false,
	properties: {
		name: nameSchema,
		email: emailSchema,
		password: passwordSchema,
		company: companySchema,
		acceptTerms: {
			type: 'boolean',
			default: false,
			description: 'User acceptance of terms and conditions'
		}
	}
}

/**
 * Refresh token request schema
 */
export interface RefreshTokenRequest {
	refresh_token: string
}

export const refreshTokenSchema: JSONSchema = {
	type: 'object',
	required: ['refresh_token'],
	additionalProperties: false,
	properties: {
		refresh_token: {
			type: 'string',
			minLength: 1,
			description: 'Valid refresh token'
		}
	}
}

/**
 * Forgot password request schema
 */
export interface ForgotPasswordRequest {
	email: string
}

export const forgotPasswordSchema: JSONSchema = {
	type: 'object',
	required: ['email'],
	additionalProperties: false,
	properties: {
		email: emailSchema
	}
}

/**
 * Reset password request schema
 */
export interface ResetPasswordRequest {
	token: string
	newPassword: string
	confirmPassword: string
}

export const resetPasswordSchema: JSONSchema = {
	type: 'object',
	required: ['token', 'newPassword', 'confirmPassword'],
	additionalProperties: false,
	properties: {
		token: {
			type: 'string',
			minLength: 1,
			description: 'Password reset token'
		},
		newPassword: passwordSchema,
		confirmPassword: {
			type: 'string',
			minLength: PASSWORD_VALIDATION.MIN_LENGTH,
			description: 'Password confirmation (must match newPassword)'
		}
	}
}

/**
 * Change password request schema
 */
export interface ChangePasswordRequest {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

export const changePasswordSchema: JSONSchema = {
	type: 'object',
	required: ['currentPassword', 'newPassword', 'confirmPassword'],
	additionalProperties: false,
	properties: {
		currentPassword: {
			type: 'string',
			minLength: 1,
			description: 'Current password for verification'
		},
		newPassword: passwordSchema,
		confirmPassword: {
			type: 'string',
			minLength: PASSWORD_VALIDATION.MIN_LENGTH,
			description: 'Password confirmation (must match newPassword)'
		}
	}
}

/**
 * Authentication response schema
 */
export interface AuthResponse {
	user: {
		id: string
		email: string
		name: string
		company?: string
		emailVerified: boolean
		createdAt: string
		updatedAt: string
	}
	tokens: {
		accessToken: string
		refreshToken: string
		expiresIn: number
		tokenType: string
	}
}

export const authResponseSchema: JSONSchema = {
	type: 'object',
	required: ['user', 'tokens'],
	properties: {
		user: {
			type: 'object',
			required: [
				'id',
				'email',
				'name',
				'emailVerified',
				'createdAt',
				'updatedAt'
			],
			properties: {
				id: { type: 'string', format: 'uuid' },
				email: { type: 'string', format: 'email' },
				name: { type: 'string' },
				company: { type: 'string' },
				emailVerified: { type: 'boolean' },
				createdAt: { type: 'string', format: 'date-time' },
				updatedAt: { type: 'string', format: 'date-time' }
			}
		},
		tokens: {
			type: 'object',
			required: ['accessToken', 'refreshToken', 'expiresIn', 'tokenType'],
			properties: {
				accessToken: { type: 'string' },
				refreshToken: { type: 'string' },
				expiresIn: { type: 'number' },
				tokenType: { type: 'string', enum: ['Bearer'] }
			}
		}
	}
}

/**
 * User profile response schema
 */
export interface UserProfileResponse {
	id: string
	email: string
	name: string
	company?: string
	phone?: string
	bio?: string
	avatarUrl?: string
	emailVerified: boolean
	createdAt: string
	updatedAt: string
}

export const userProfileResponseSchema: JSONSchema = {
	type: 'object',
	required: [
		'id',
		'email',
		'name',
		'emailVerified',
		'createdAt',
		'updatedAt'
	],
	properties: {
		id: { type: 'string', format: 'uuid' },
		email: { type: 'string', format: 'email' },
		name: { type: 'string' },
		company: { type: 'string' },
		phone: { type: 'string' },
		bio: { type: 'string' },
		avatarUrl: { type: 'string', format: 'uri' },
		emailVerified: { type: 'boolean' },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	}
}

// Schemas are exported directly for use in NestJS controllers
// No custom registry needed - use Fastify's native addSchema() if sharing is required

// Export route schemas for controller usage
export const authRouteSchemas = {
	login: {
		body: loginSchema,
		response: {
			200: authResponseSchema,
			400: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			},
			401: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	},
	register: {
		body: registerSchema,
		response: {
			201: authResponseSchema,
			400: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			},
			409: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	},
	refreshToken: {
		body: refreshTokenSchema,
		response: {
			200: {
				type: 'object',
				properties: {
					accessToken: { type: 'string' },
					expiresIn: { type: 'number' }
				}
			}
		}
	},
	getCurrentUser: {
		response: {
			200: userProfileResponseSchema
		}
	}
} as const
