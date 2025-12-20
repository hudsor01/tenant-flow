/**
 * BASE TYPES - Foundation types to break circular dependencies
 *
 * This file contains primitive types that are shared across multiple modules
 * without importing from other type files. All types here must be self-contained.
 *
 * CRITICAL: Do NOT import from other files in this module. Only import from external libraries.
 */

/**
 * Generic API response wrapper for success/error handling
 * Used across api.ts, errors.ts, and core.ts
 */
export type ApiResponse<T = unknown> =
	| { success: true; data: T; error?: never }
	| { success: false; error: string; data?: never }

/**
 * Standard API error structure
 * Shared between api.ts and errors.ts
 */
export interface ApiError {
	message: string
	statusCode: number
	error?: string
}

/**
 * Frontend-facing API error with additional context
 */
export interface FrontendApiError {
	message: string
	code?: string
	details?: Record<string, unknown>
	timestamp?: string
}

/**
 * Error type categorization for application-level error handling
 * Shared between api.ts and errors.ts
 */
export type ErrorType =
	| 'VALIDATION_ERROR'
	| 'NETWORK_ERROR'
	| 'AUTHENTICATION_ERROR'
	| 'AUTHORIZATION_ERROR'
	| 'NOT_FOUND_ERROR'
	| 'CONFLICT_ERROR'
	| 'RATE_LIMIT_ERROR'
	| 'INTERNAL_ERROR'
	| 'EXTERNAL_SERVICE_ERROR'
	| 'UNKNOWN_ERROR'

/**
 * Error severity levels for categorization and alerting
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Extended application error with context
 * Shared between api.ts and errors.ts
 */
export interface ExtendedAppError extends Error {
	code: ErrorType
	severity: ErrorSeverity
	context?: Record<string, unknown>
	userMessage?: string
	retryable?: boolean
	timestamp?: Date
}

/**
 * Async operation result wrapper for error handling
 * Shared across api.ts, errors.ts, and status-types.ts
 */
export type AsyncResult<T> =
	| { success: true; data: T; error?: never }
	| { success: false; error: ExtendedAppError; data?: never }

/**
 * CSP Violation Report structure
 * Shared between security.ts and domain.ts
 */
export interface CSPViolationReport {
	'document-uri': string
	referrer: string
	'violated-directive': string
	'effective-directive': string
	'original-policy': string
	disposition: string
	'blocked-uri': string
	'line-number': number
	'column-number': number
	'source-file': string
	'status-code': number
	'script-sample': string
}

/**
 * CSP Report body wrapper
 */
export interface CSPReportBody {
	'csp-report': CSPViolationReport
}

/**
 * Result type for synchronous operations (success/failure pattern)
 * Alternative to AsyncResult for non-async contexts
 */
export type Result<T = void, E = string> =
	| { success: true; value: T; error?: never }
	| { success: false; error: E; value?: never }
