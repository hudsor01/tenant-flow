/**
 * Standardized Error Handler for TanStack Query Mutations
 * 
 * Provides consistent error handling across all mutations:
 * - Structured logging with context
 * - User-friendly toast notifications
 * - Type-safe error extraction
 * 
 * Usage:
 * ```typescript
 * useMutation({
 *   mutationFn: createTenant,
 *   onError: (error) => handleMutationError(error, 'Create tenant')
 * })
 * ```
 */

import { createLogger } from '@repo/shared/lib/frontend-logger'
import { toast } from 'sonner'

const logger = createLogger({ component: 'MutationErrorHandler' })

interface ErrorWithMessage {
	message: string
}

interface ErrorWithStatus {
	status?: number
	payload?: unknown
}

/**
 * Type guard to check if error has a message property
 */
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
	return (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof (error as ErrorWithMessage).message === 'string'
	)
}

/**
 * Extract user-friendly error message from various error types
 */
function extractErrorMessage(error: unknown): string {
	// Standard Error object
	if (error instanceof Error) {
		return error.message
	}

	// Error with message property
	if (isErrorWithMessage(error)) {
		return error.message
	}

	// HTTP error with payload
	if (
		typeof error === 'object' &&
		error !== null &&
		'payload' in error
	) {
		const payload = (error as ErrorWithStatus).payload
		if (
			typeof payload === 'object' &&
			payload !== null &&
			'message' in payload
		) {
			return String((payload as { message: unknown }).message)
		}
	}

	// String error
	if (typeof error === 'string') {
		return error
	}

	// Unknown error type
	return 'An unexpected error occurred'
}

/**
 * Get HTTP status code from error if available
 */
function getErrorStatus(error: unknown): number | undefined {
	if (
		typeof error === 'object' &&
		error !== null &&
		'status' in error &&
		typeof (error as ErrorWithStatus).status === 'number'
	) {
		return (error as ErrorWithStatus).status
	}
	return undefined
}

/**
 * Handle mutation errors with consistent logging and user feedback
 * 
 * @param error - The error from mutation onError callback
 * @param context - Human-readable context (e.g., "Create tenant", "Update property")
 * @param customMessage - Optional custom message to show to user instead of error message
 */
export function handleMutationError(
	error: unknown,
	context: string,
	customMessage?: string
): void {
	const message = extractErrorMessage(error)
	const status = getErrorStatus(error)

	// Log error with full context
	logger.error(`${context} failed`, {
		action: context.toLowerCase().replace(/\s+/g, '_'),
		metadata: {
			error: message,
			status,
			errorType: error instanceof Error ? error.constructor.name : typeof error
		}
	})

	// Show user-friendly toast notification
	const displayMessage = customMessage || message
	
	// Customize toast based on status code
	if (status === 409) {
		toast.error('Conflict', {
			description: displayMessage || 'This item already exists or has been modified'
		})
	} else if (status === 403) {
		toast.error('Access Denied', {
			description: displayMessage || 'You do not have permission to perform this action'
		})
	} else if (status === 404) {
		toast.error('Not Found', {
			description: displayMessage || 'The requested item could not be found'
		})
	} else if (status && status >= 500) {
		toast.error('Server Error', {
			description: 'Our servers encountered an issue. Please try again later.'
		})
	} else {
		toast.error(displayMessage)
	}
}

/**
 * Handle mutation success with consistent logging and user feedback
 * 
 * @param context - Human-readable context (e.g., "Create tenant", "Update property")
 * @param message - Optional custom success message
 */
export function handleMutationSuccess(
	context: string,
	message?: string
): void {
	logger.info(`${context} succeeded`, {
		action: context.toLowerCase().replace(/\s+/g, '_'),
		metadata: { success: true }
	})

	toast.success(message || `${context} completed successfully`)
}
