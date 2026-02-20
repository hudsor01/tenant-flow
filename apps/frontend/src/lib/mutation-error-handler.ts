/**
 * Standardized Error Handler for TanStack Query Mutations
 *
 * Provides consistent error handling across all mutations:
 * - Structured logging with context
 * - User-friendly toast notifications
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

/**
 * Extract user-friendly error message from various error types
 */
function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	if (typeof error === 'string') return error

	// Handle objects with message property (including nested payload.message)
	const obj = error as Record<string, unknown> | null
	const message =
		obj?.message ?? (obj?.payload as Record<string, unknown>)?.message
	if (typeof message === 'string') return message

	return 'An unexpected error occurred'
}

/**
 * Get HTTP status code from error if available
 */
function getErrorStatus(error: unknown): number | undefined {
	const status = (error as Record<string, unknown>)?.status
	return typeof status === 'number' ? status : undefined
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

	// Extract error code from body for structured errors (e.g. PLAN_LIMIT_EXCEEDED).
	// NestJS serializes new ForbiddenException({ code, ... }) as { message: { code, ... } }
	// so the code lives at body.message.code, not body.code.
	const bodyObj = (error as Record<string, unknown>)?.body as Record<string, unknown> | undefined
	const errorCode =
		bodyObj?.code ??
		(bodyObj?.message as Record<string, unknown> | undefined)?.code

	// Customize toast based on status code
	if (status === 409) {
		toast.error('Conflict', {
			description:
				displayMessage || 'This item already exists or has been modified'
		})
	} else if (status === 403 && errorCode === 'PLAN_LIMIT_EXCEEDED') {
		toast.error('Plan limit reached', {
			description: displayMessage,
			action: {
				label: 'Upgrade',
				onClick: () => {
					window.location.href = '/billing/plans'
				}
			}
		})
	} else if (status === 403) {
		toast.error('Access Denied', {
			description:
				displayMessage || 'You do not have permission to perform this action'
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
export function handleMutationSuccess(context: string, message?: string): void {
	logger.info(`${context} succeeded`, {
		action: context.toLowerCase().replace(/\s+/g, '_'),
		metadata: { success: true }
	})

	toast.success(message || `${context} completed successfully`)
}
