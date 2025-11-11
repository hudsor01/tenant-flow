/**
 * Structured API Error class with error codes
 * Extends native Error to include error codes from backend
 */
export class ApiError extends Error {
	constructor(
		message: string,
		public readonly code?: string,
		public readonly statusCode?: number,
		public readonly details?: unknown
	) {
		super(message)
		this.name = 'ApiError'
	}
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError
}
