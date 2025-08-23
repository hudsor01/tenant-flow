import type { ApiErrorResponse, ControllerApiResponse } from '@repo/shared'

/**
 * Creates a standardized API success response with automatic timestamp
 * @param data - The data to return
 * @param message - Optional success message
 * @returns ControllerApiResponse with success, data, message, and timestamp
 */
export function createSuccessResponse<T = unknown>(
	data: T,
	message = 'Operation completed successfully'
): ControllerApiResponse<T> {
return {
success: true,
data,
message,
timestamp: new Date()
}
}

/**
 * Creates a standardized API error response with automatic timestamp
 * @param message - Error message
 * @param statusCode - Optional HTTP status code
 * @returns ApiErrorResponse with error details
 */
export function createErrorResponse(
	message: string,
	statusCode?: number
): ApiErrorResponse & { statusCode?: number } {
	return {
		success: false,
		error: {
			code: 'ERROR',
			message,
			details: {}
		},
		timestamp: new Date().toISOString(),
		statusCode
	}
}
