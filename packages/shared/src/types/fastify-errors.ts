/**
 * Fastify standardized error types
 * Following CLAUDE.md RULE #3: No abstractions - direct Fastify usage only
 *
 * These types define standard error response formats for the NestJS + Fastify backend
 * Use native Fastify error handling patterns without custom wrappers
 */

export interface FastifyErrorResponse {
	success: false
	statusCode: number
	message: string
	error: string
	timestamp: string
	path: string
}

export interface FastifyValidationErrorResponse extends FastifyErrorResponse {
	validation: {
		field: string
		message: string
		value?: unknown
	}[]
}

export interface FastifyBusinessErrorResponse extends FastifyErrorResponse {
	code: string
	details?: Record<string, unknown>
}

/**
 * Standard HTTP error codes for consistent responses
 */
export const FASTIFY_ERROR_CODES = {
	// Client errors (4xx)
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	PAYMENT_REQUIRED: 402,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	CONFLICT: 409,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,

	// Server errors (5xx)
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504
} as const

export type FastifyErrorCode =
	(typeof FASTIFY_ERROR_CODES)[keyof typeof FASTIFY_ERROR_CODES]

/**
 * Standard error messages for common scenarios
 */
export const FASTIFY_ERROR_MESSAGES = {
	VALIDATION_FAILED: 'Validation failed',
	UNAUTHORIZED_ACCESS: 'Unauthorized access',
	RESOURCE_NOT_FOUND: 'Resource not found',
	INTERNAL_ERROR: 'Internal server error',
	BAD_REQUEST: 'Bad request',
	FORBIDDEN: 'Access forbidden',
	CONFLICT: 'Resource conflict',
	TOO_MANY_REQUESTS: 'Too many requests',
	SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
} as const

/**
 * Business error codes for domain-specific errors
 */
export const BUSINESS_ERROR_CODES = {
	PROPERTY_NOT_FOUND: 'PROPERTY_NOT_FOUND',
	UNIT_NOT_AVAILABLE: 'UNIT_NOT_AVAILABLE',
	TENANT_ALREADY_EXISTS: 'TENANT_ALREADY_EXISTS',
	LEASE_OVERLAP: 'LEASE_OVERLAP',
	INVALID_LEASE_DATES: 'INVALID_LEASE_DATES',
	MAINTENANCE_REQUEST_CLOSED: 'MAINTENANCE_REQUEST_CLOSED',
	BILLING_ERROR: 'BILLING_ERROR',
	SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
	INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS'
} as const

export type BusinessErrorCode =
	(typeof BUSINESS_ERROR_CODES)[keyof typeof BUSINESS_ERROR_CODES]

/**
 * Helper types for error context logging
 */
export interface ErrorLogContext {
	method: string
	url: string
	status: number
	errorName: string
	message: string
	userId?: string
	requestId?: string
	timestamp: string
}

export interface SecurityContext {
	userId?: string
	role?: string
	organizationId?: string
	permissions?: string[]
}
