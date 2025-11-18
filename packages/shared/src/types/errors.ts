/**
 * Error types for the application
 * Centralized error handling types for consistent error management
 */

// React node type definition for error boundaries - avoiding React dependency
export type ReactNodeType = unknown

// Base error interface
export interface BaseError {
	name?: string
	message: string
	code?: string
	statusCode?: number
	timestamp?: Date
	stack?: string
}

// Authentication errors
export interface AuthError extends BaseError {
	type: 'AUTH_ERROR'
	code:
		| 'INVALID_CREDENTIALS'
		| 'TOKEN_EXPIRED'
		| 'UNAUTHORIZED'
		| 'FORBIDDEN'
		| 'EMAIL_NOT_VERIFIED'
		| 'ACCOUNT_LOCKED'
		| 'INVALID_TOKEN'
}

// Validation errors
export interface ValidationError extends BaseError {
	type: 'VALIDATION_ERROR'
	code: 'VALIDATION_FAILED'
	field?: string
	errors?: string[]
}

// Network errors
export interface NetworkError extends BaseError {
	type: 'NETWORK_ERROR'
	code:
		| 'CONNECTION_FAILED'
		| 'TIMEOUT'
		| 'NETWORK_UNREACHABLE'
		| 'REQUEST_ABORTED'
}

// Server errors
export interface ServerError extends BaseError {
	type: 'SERVER_ERROR'
	code:
		| 'INTERNAL_ERROR'
		| 'SERVICE_UNAVAILABLE'
		| 'DATABASE_ERROR'
		| 'EXTERNAL_SERVICE_ERROR'
}

// Business logic errors
export interface BusinessError extends BaseError {
	type: 'BUSINESS_ERROR'
	code:
		| 'RESOURCE_NOT_FOUND'
		| 'RESOURCE_ALREADY_EXISTS'
		| 'INSUFFICIENT_PERMISSIONS'
		| 'OPERATION_NOT_ALLOWED'
		| 'QUOTA_EXCEEDED'
		| 'SUBSCRIPTION_REQUIRED'
}

// Export just the code type for usage in business exceptions
export type BusinessErrorCode = BusinessError['code']

// File upload errors
export interface FileUploadError extends BaseError {
	type: 'FILE_UPLOAD_ERROR'
	code:
		| 'FILE_TOO_LARGE'
		| 'INVALID_FILE_TYPE'
		| 'UPLOAD_FAILED'
		| 'STORAGE_QUOTA_EXCEEDED'
}

// Payment errors
export interface PaymentError extends BaseError {
	type: 'PAYMENT_ERROR'
	code:
		| 'PAYMENT_FAILED'
		| 'INSUFFICIENT_FUNDS'
		| 'CARD_DECLINED'
		| 'PAYMENT_METHOD_INVALID'
		| 'STRIPE_ERROR'
}

// Loader errors (for data loading failures)
export interface LoaderError extends BaseError {
	type: 'LOADER_ERROR'
	code: 'LOAD_FAILED' | 'MISSING_DEPENDENCY' | 'INVALID_CONFIG' | 'TIMEOUT'
}

// Union type for all possible errors
export type AppError =
	| AuthError
	| ValidationError
	| NetworkError
	| ServerError
	| BusinessError
	| FileUploadError
	| PaymentError
	| LoaderError

// Error response from API
export interface ErrorResponse {
	success: false
	error: AppError
	requestId?: string
	timestamp: string
}

// Success response type
export interface SuccessResponse<
	T = Record<string, string | number | boolean | null>
> {
	success: true
	data: T
	message?: string
	requestId?: string
	timestamp: string
}

// Standard API response interface (for backward compatibility with controllers)
export interface StandardApiResponse<T = unknown> {
	success: boolean
	data?: T
	error?: AppError
	message?: string
	requestId?: string
	timestamp?: Date
}

// Generic API response - union type for type-safe error handling
export type { ApiResponse } from './core.js'

// Export StandardApiResponse as ApiResponse for backend controllers
export type { StandardApiResponse as ControllerApiResponse }

// Error handler function type
export type ErrorHandler = (error: AppError) => void

// Error boundary props - React 19 compatible
export interface ErrorBoundaryProps {
	fallback?: string | null
	onError?: ErrorHandler
	children: ReactNodeType // React 19 compatible children
}

// Form error state
export type FormErrorState = Record<string, string | undefined>

// Async operation result
export type AsyncResult<T> =
	| {
			success: true
			data: T
	  }
	| {
			success: false
			error: AppError
	  }

// Error context for debugging
export interface ErrorContext {
	operation?: string
	entityType?: 'properties' | 'tenants' | 'leases' | 'maintenance' | 'user'
	entityId?: string
	user_id?: string
	metadata?: Record<string, unknown>
}

// User-friendly error for UI display
export interface UserFriendlyError {
	title: string
	message: string
	action?: string
	canRetry: boolean
	severity: 'low' | 'medium' | 'high' | 'critical'
}

// Error type for categorization
export type { ErrorType } from './api.js'
