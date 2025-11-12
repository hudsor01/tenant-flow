/**
 * Express/NestJS standardized error types
 * Following CLAUDE.md RULE #3: No abstractions - direct Express usage only
 *
 * These types define standard error response formats for the NestJS + Express backend
 * Use native Express error handling patterns without custom wrappers
 */

export interface ApiErrorResponse {
	success: false
	statusCode: number
	message: string
	error: string
	timestamp: string
	path: string
}

export interface ApiValidationErrorResponse extends ApiErrorResponse {
	validation: {
		field: string
		message: string
		value?: unknown
	}[]
}

export interface ApiBusinessErrorResponse extends ApiErrorResponse {
	code: string
	details?: Record<string, unknown>
}

/**
 * Standard HTTP error codes for consistent responses
 */
export const API_ERROR_CODES = {
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

export type ApiErrorCode =
	(typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

/**
 * Standard error messages for common scenarios
 */
export const API_ERROR_MESSAGES = {
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
	// Property errors
	PROPERTY_NOT_FOUND: 'PROPERTY_NOT_FOUND',
	UNIT_NOT_AVAILABLE: 'UNIT_NOT_AVAILABLE',
	
	// Tenant errors
	TENANT_ALREADY_EXISTS: 'TENANT_ALREADY_EXISTS',
	
	// Lease errors
	LEASE_OVERLAP: 'LEASE_OVERLAP',
	INVALID_LEASE_DATES: 'INVALID_LEASE_DATES',
	
	// Maintenance errors
	MAINTENANCE_REQUEST_CLOSED: 'MAINTENANCE_REQUEST_CLOSED',
	
	// Billing errors
	BILLING_ERROR: 'BILLING_ERROR',
	SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
	
	// File upload errors
	INVALID_CSV_FORMAT: 'INVALID_CSV_FORMAT',
	FILE_TOO_LARGE: 'FILE_TOO_LARGE',
	INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
	NO_FILE_UPLOADED: 'NO_FILE_UPLOADED',
	
	// CSV-specific validation errors
	CSV_MISSING_REQUIRED_COLUMNS: 'CSV_MISSING_REQUIRED_COLUMNS',
	CSV_INVALID_DATA: 'CSV_INVALID_DATA',
	CSV_DUPLICATE_ENTRIES: 'CSV_DUPLICATE_ENTRIES',
	
	// Permission errors
	INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
	
	// Network errors
	NETWORK_ERROR: 'NETWORK_ERROR',
	CORS_ERROR: 'CORS_ERROR'
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
