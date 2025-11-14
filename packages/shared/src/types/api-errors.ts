/**
 * Express/NestJS standardized error types
 * Following CLAUDE.md RULE #3: No abstractions - direct Express usage only
 *
 * These types define standard error response formats for the NestJS + Express backend
 * Use native Express error handling patterns without custom wrappers
 */

import type {
	HTTP_STATUS_CODES,
	BUSINESS_ERROR_CODES,
	API_ERROR_CODES,
	ERROR_SEVERITY,
	ERROR_CATEGORIES,
	ERROR_TYPES,
	ERROR_CONTEXT_TYPES,
	ERROR_ACTIONS,
	ERROR_METRICS,
	ERROR_REPORTING_LEVELS
} from '../constants/error-codes'

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

export type HttpStatusCode =
	(typeof HTTP_STATUS_CODES)[keyof typeof HTTP_STATUS_CODES]

export type BusinessErrorCode =
	(typeof BUSINESS_ERROR_CODES)[keyof typeof BUSINESS_ERROR_CODES]

export type ApiErrorCode =
	(typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

export type ErrorSeverity = (typeof ERROR_SEVERITY)[keyof typeof ERROR_SEVERITY]

export type ErrorCategory =
	(typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES]

export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES]

export type ErrorContextType =
	(typeof ERROR_CONTEXT_TYPES)[keyof typeof ERROR_CONTEXT_TYPES]

export type ErrorAction = (typeof ERROR_ACTIONS)[keyof typeof ERROR_ACTIONS]

export type ErrorMetric = (typeof ERROR_METRICS)[keyof typeof ERROR_METRICS]

export type ErrorReportingLevel =
	(typeof ERROR_REPORTING_LEVELS)[keyof typeof ERROR_REPORTING_LEVELS]

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
