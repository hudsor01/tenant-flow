/**
 * API Error Codes for Better Observability
 * Standardized error codes across all API clients
 *
 * COMPLIANCE: Uses const object pattern per CLAUDE.md enum standardization rules
 * (TypeScript enums are forbidden except for database enums via Supabase)
 */

export const ApiErrorCode = {
	// Authentication errors (AUTH-xxx)
	AUTH_TOKEN_MISSING: 'AUTH-001',
	AUTH_TOKEN_INVALID: 'AUTH-002',
	AUTH_SESSION_EXPIRED: 'AUTH-003',
	AUTH_UNAUTHORIZED: 'AUTH-004',

	// Network errors (NET-xxx)
	NETWORK_ERROR: 'NET-001',
	NETWORK_TIMEOUT: 'NET-002',
	NETWORK_OFFLINE: 'NET-003',

	// API errors (API-xxx)
	API_NOT_FOUND: 'API-404',
	API_BAD_REQUEST: 'API-400',
	API_SERVER_ERROR: 'API-500',
	API_SERVICE_UNAVAILABLE: 'API-503',
	API_RATE_LIMITED: 'API-429',

	// Report generation errors (REPORT-xxx)
	REPORT_GENERATION_FAILED: 'REPORT-001',
	REPORT_DOWNLOAD_FAILED: 'REPORT-002',
	REPORT_DELETE_FAILED: 'REPORT-003',
	REPORT_LIST_FAILED: 'REPORT-004',
	REPORT_SCHEDULE_FAILED: 'REPORT-005',

	// Financial data errors (FIN-xxx)
	FINANCIAL_DATA_FETCH_FAILED: 'FIN-001',
	FINANCIAL_EXPORT_FAILED: 'FIN-002',

	// Generic errors
	UNKNOWN_ERROR: 'ERR-000'
} as const

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

import { createLogger } from '../lib/frontend-logger'

const devLogger = createLogger({ component: 'ApiError' })

export class ApiError extends Error {
	constructor(
		message: string,
		public code: ApiErrorCode,
		public statusCode?: number,
		public details?: unknown
	) {
		super(message)
		this.name = 'ApiError'
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ApiError)
		}
	}

	/**
	 * Get user-friendly error message
	 */
	getUserMessage(): string {
		switch (this.code) {
			case ApiErrorCode.AUTH_TOKEN_MISSING:
			case ApiErrorCode.AUTH_TOKEN_INVALID:
			case ApiErrorCode.AUTH_SESSION_EXPIRED:
			case ApiErrorCode.AUTH_UNAUTHORIZED:
				return 'Authentication required. Please sign in and try again.'

			case ApiErrorCode.NETWORK_ERROR:
			case ApiErrorCode.NETWORK_TIMEOUT:
			case ApiErrorCode.NETWORK_OFFLINE:
				return 'Network error. Please check your connection and try again.'

			case ApiErrorCode.API_NOT_FOUND:
				return 'The requested resource was not found.'

			case ApiErrorCode.API_BAD_REQUEST:
				return 'Invalid request. Please check your input and try again.'

			case ApiErrorCode.API_SERVER_ERROR:
			case ApiErrorCode.API_SERVICE_UNAVAILABLE:
				return 'Server error. Please try again later.'

			case ApiErrorCode.API_RATE_LIMITED:
				return 'Too many requests. Please wait a moment and try again.'

			case ApiErrorCode.REPORT_GENERATION_FAILED:
				return 'Failed to generate report. Please try again.'

			case ApiErrorCode.REPORT_DOWNLOAD_FAILED:
				return 'Failed to download report. Please try again.'

			case ApiErrorCode.FINANCIAL_DATA_FETCH_FAILED:
				return 'Failed to fetch financial data. Please try again.'

			case ApiErrorCode.FINANCIAL_EXPORT_FAILED:
				return 'Failed to export data. Please try again.'

			default:
				return 'An unexpected error occurred. Please try again.'
		}
	}

	/**
	 * Convert to JSON for logging/debugging
	 */
	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode,
			details: this.details,
			stack: this.stack
		}
	}
}

/**
 * Create ApiError from HTTP response
 */
export function createApiErrorFromResponse(
	response: Response,
	defaultCode: ApiErrorCode = ApiErrorCode.UNKNOWN_ERROR
): ApiError {
	const statusCode = response.status

	// Map HTTP status codes to error codes
	let code: ApiErrorCode
	switch (statusCode) {
		case 401:
			code = ApiErrorCode.AUTH_UNAUTHORIZED
			break
		case 404:
			code = ApiErrorCode.API_NOT_FOUND
			break
		case 400:
			code = ApiErrorCode.API_BAD_REQUEST
			break
		case 429:
			code = ApiErrorCode.API_RATE_LIMITED
			break
		case 500:
			code = ApiErrorCode.API_SERVER_ERROR
			break
		case 503:
			code = ApiErrorCode.API_SERVICE_UNAVAILABLE
			break
		default:
			code = defaultCode
	}

	return new ApiError(
		`API request failed: ${response.statusText}`,
		code,
		statusCode
	)
}

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError
}

/**
 * Log error in development mode only
 */
export function logErrorInDev(error: unknown, context?: string) {
	if (process.env["NODE_ENV"] === 'development') {
		const prefix = context ? `[${context}]` : '[API Error]'
		if (isApiError(error)) {
			devLogger.error(prefix, { metadata: error.toJSON() })
		} else if (error instanceof Error) {
			devLogger.error(prefix, {
				metadata: {
					name: error.name,
					message: error.message,
					stack: error.stack
				}
			})
		} else {
			devLogger.error(prefix, { metadata: { error } })
		}
	}
}
