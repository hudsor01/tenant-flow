import { toast } from 'sonner'

/**
 * Structured API error information
 */
export interface ApiError {
	/** HTTP status code */
	status: number
	/** Error message from the server or generic fallback */
	message: string
	/** Optional error code for programmatic handling */
	code?: string
}

/**
 * Parse fetch response into structured error
 *
 * Attempts to extract error details from JSON response body.
 * Falls back to status text if response is not JSON.
 *
 * @param response Fetch Response object with error status
 * @returns Structured error information
 */
export async function parseApiError(response: Response): Promise<ApiError> {
	let message = 'An unexpected error occurred'
	let code: string | undefined

	try {
		const body = await response.json()
		message = body.message ?? message
		code = body.code
	} catch {
		// Response not JSON - use status text
		message = response.statusText || message
	}

	return {
		status: response.status,
		message,
		code
	}
}

/**
 * Context for error handling customization
 */
export interface ErrorHandlerContext {
	/** Resource name (e.g., 'tenant', 'property', 'lease') */
	resource: string
	/** Operation name (e.g., 'create', 'update', 'delete') */
	operation: string
	/** Custom handler for 409 Conflict errors */
	onConflict?: (error: ApiError) => void
	/** Custom handler for 404 Not Found errors */
	onNotFound?: (error: ApiError) => void
	/** Custom handler for 400 Bad Request errors */
	onBadRequest?: (error: ApiError) => void
	/** Custom handler for 403 Forbidden errors */
	onForbidden?: (error: ApiError) => void
}

/**
 * Handle API errors with user-friendly messages and appropriate toasts
 *
 * Maps HTTP status codes to UX patterns with consistent messaging:
 * - 409 Conflict → Warning toast with retry suggestion
 * - 400 Bad Request → Error toast with field hints
 * - 404 Not Found → Error toast with navigation suggestion
 * - 403 Forbidden → Error toast with permission message
 * - 500 Server Error → Error toast with support contact
 *
 * @param response Fetch Response object with error status
 * @param context Context for error handling customization
 *
 * @example
 * const response = await fetch('/api/tenants', { method: 'POST', body: JSON.stringify(data) })
 * if (!response.ok) {
 *   await handleApiError(response, {
 *     resource: 'tenant',
 *     operation: 'create',
 *     onConflict: (error) => {
 *       setEmailError('Email already in use')
 *       toast.warning('Tenant with this email already exists')
 *     }
 *   })
 *   return
 * }
 */
export async function handleApiError(
	response: Response,
	context: ErrorHandlerContext
): Promise<void> {
	const error = await parseApiError(response)
	const { resource, operation, onConflict, onNotFound, onBadRequest, onForbidden } = context

	switch (error.status) {
		case 409: // Conflict
			if (onConflict) {
				onConflict(error)
			} else {
				toast.warning(
					`${resource} already exists. Please modify your input and try again.`,
					{ description: error.message }
				)
			}
			break

		case 404: // Not Found
			if (onNotFound) {
				onNotFound(error)
			} else {
				toast.error(`${resource} not found. It may have been deleted.`, {
					description: 'Redirecting to list view...'
				})
			}
			break

		case 400: // Bad Request
			if (onBadRequest) {
				onBadRequest(error)
			} else {
				toast.error(`Invalid ${operation} request`, {
					description: error.message
				})
			}
			break

		case 403: // Forbidden
			if (onForbidden) {
				onForbidden(error)
			} else {
				toast.error('Permission denied', {
					description: `You don't have permission to ${operation} this ${resource}.`
				})
			}
			break

		case 500: // Server Error
		default:
			toast.error(`Failed to ${operation} ${resource}`, {
				description: 'Please try again or contact support if the problem persists.'
			})
			break
	}
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'status' in error &&
		typeof (error as ApiError).status === 'number' &&
		'message' in error &&
		typeof (error as ApiError).message === 'string'
	)
}
