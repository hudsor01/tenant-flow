/**
 * Authentication Schemas
<<<<<<< HEAD
 *
 * JSON Schema definitions for authentication endpoints.
 * These schemas replace class-validator DTOs and provide automatic TypeScript type inference.
 *
=======
 * 
 * JSON Schema definitions for authentication endpoints.
 * These schemas replace class-validator DTOs and provide automatic TypeScript type inference.
 * 
>>>>>>> origin/main
 * Benefits:
 * - Single source of truth for validation and types
 * - Automatic TypeScript type inference
 * - Better performance than class-validator
 * - Consistent error messages
 */

<<<<<<< HEAD
import type { JSONSchema } from '../shared/types/fastify-type-provider'
=======
import { 
	createTypedSchema, 
	schemaRegistry, 
	type TypedJSONSchema 
} from '../shared/types/fastify-type-provider'
>>>>>>> origin/main
import {
	COMPANY_VALIDATION,
	EMAIL_VALIDATION,
	NAME_VALIDATION,
	PASSWORD_VALIDATION
} from '../shared/constants/validation.constants'

// Base email schema
<<<<<<< HEAD
const emailSchema: JSONSchema = {
=======
const emailSchema: TypedJSONSchema = {
>>>>>>> origin/main
	type: 'string',
	format: 'email',
	minLength: 1,
	maxLength: 255,
	description: EMAIL_VALIDATION.MESSAGE
}

// Base password schema
<<<<<<< HEAD
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
=======
const passwordSchema: TypedJSONSchema = {
	type: 'string',
	minLength: PASSWORD_VALIDATION.MIN_LENGTH,
	pattern: PASSWORD_VALIDATION.REGEX.source,
	description: 'Password must contain uppercase, lowercase, number and special character'
}

// Name validation schema
const nameSchema: TypedJSONSchema = {
	type: 'string',
	minLength: NAME_VALIDATION.MIN_LENGTH,
	maxLength: NAME_VALIDATION.MAX_LENGTH,
	pattern: '^[a-zA-Z\\s\\-\\.\']+$',
	description: 'Name must contain only letters, spaces, hyphens, periods, and apostrophes'
}

// Company schema
const companySchema: TypedJSONSchema = {
>>>>>>> origin/main
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

<<<<<<< HEAD
export const loginSchema: JSONSchema = {
=======
export const loginSchema = createTypedSchema<LoginRequest>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

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

<<<<<<< HEAD
export const registerSchema: JSONSchema = {
=======
export const registerSchema = createTypedSchema<RegisterRequest>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Refresh token request schema
 */
export interface RefreshTokenRequest {
	refresh_token: string
}

<<<<<<< HEAD
export const refreshTokenSchema: JSONSchema = {
=======
export const refreshTokenSchema = createTypedSchema<RefreshTokenRequest>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Forgot password request schema
 */
export interface ForgotPasswordRequest {
	email: string
}

<<<<<<< HEAD
export const forgotPasswordSchema: JSONSchema = {
=======
export const forgotPasswordSchema = createTypedSchema<ForgotPasswordRequest>({
>>>>>>> origin/main
	type: 'object',
	required: ['email'],
	additionalProperties: false,
	properties: {
		email: emailSchema
	}
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Reset password request schema
 */
export interface ResetPasswordRequest {
	token: string
	newPassword: string
	confirmPassword: string
}

<<<<<<< HEAD
export const resetPasswordSchema: JSONSchema = {
=======
export const resetPasswordSchema = createTypedSchema<ResetPasswordRequest>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

/**
 * Change password request schema
 */
export interface ChangePasswordRequest {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

<<<<<<< HEAD
export const changePasswordSchema: JSONSchema = {
=======
export const changePasswordSchema = createTypedSchema<ChangePasswordRequest>({
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

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

<<<<<<< HEAD
export const authResponseSchema: JSONSchema = {
=======
export const authResponseSchema = createTypedSchema<AuthResponse>({
>>>>>>> origin/main
	type: 'object',
	required: ['user', 'tokens'],
	properties: {
		user: {
			type: 'object',
<<<<<<< HEAD
			required: [
				'id',
				'email',
				'name',
				'emailVerified',
				'createdAt',
				'updatedAt'
			],
=======
			required: ['id', 'email', 'name', 'emailVerified', 'createdAt', 'updatedAt'],
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
})
>>>>>>> origin/main

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

<<<<<<< HEAD
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
=======
export const userProfileResponseSchema = createTypedSchema<UserProfileResponse>({
	type: 'object',
	required: ['id', 'email', 'name', 'emailVerified', 'createdAt', 'updatedAt'],
>>>>>>> origin/main
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
<<<<<<< HEAD
}

// Schemas are exported directly for use in NestJS controllers
// No custom registry needed - use Fastify's native addSchema() if sharing is required
=======
})

// Register all schemas with the global registry
schemaRegistry.register('login', loginSchema)
schemaRegistry.register('register', registerSchema)
schemaRegistry.register('refresh-token', refreshTokenSchema)
schemaRegistry.register('forgot-password', forgotPasswordSchema)
schemaRegistry.register('reset-password', resetPasswordSchema)
schemaRegistry.register('change-password', changePasswordSchema)
schemaRegistry.register('auth-response', authResponseSchema)
schemaRegistry.register('user-profile-response', userProfileResponseSchema)
>>>>>>> origin/main

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
<<<<<<< HEAD
} as const
=======
} as const
>>>>>>> origin/main
