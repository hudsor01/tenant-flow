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

import { createLogger } from '#lib/frontend-logger'
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

	// Plan-limit detection: two upstream shapes both flow through here.
	//   1. Edge Function tier-gate (`_shared/tier-gate.ts`) returns 402/403 with
	//      JSON body `{ code: 'PLAN_LIMIT_EXCEEDED', ... }`.
	//   2. DB BEFORE-INSERT triggers (enforce_property_plan_limit /
	//      enforce_unit_plan_limit) raise PG exceptions whose PostgrestError
	//      surfaces here with `error.hint === 'plan_limit_exceeded'` and
	//      `error.details` as a JSON string carrying upgrade_source.
	const errObj = error as Record<string, unknown> | null
	const bodyObj = errObj?.body as Record<string, unknown> | undefined
	const edgeErrorCode =
		bodyObj?.code ??
		(bodyObj?.message as Record<string, unknown> | undefined)?.code
	const pgHint = typeof errObj?.hint === 'string' ? errObj.hint : undefined
	const pgDetails = typeof errObj?.details === 'string' ? errObj.details : undefined

	const isPlanLimit =
		(status === 403 && edgeErrorCode === 'PLAN_LIMIT_EXCEEDED') ||
		pgHint === 'plan_limit_exceeded'

	// Best-effort upgrade-source attribution from the DB trigger's DETAIL JSON
	// (falls back to a generic gate tag for the Edge Function shape).
	let upgradeSource = 'plan_limit_gate'
	if (pgDetails) {
		try {
			const parsed = JSON.parse(pgDetails) as Record<string, unknown>
			if (typeof parsed.upgrade_source === 'string') {
				upgradeSource = parsed.upgrade_source
			}
		} catch {
			/* DETAIL wasn't JSON; keep default tag */
		}
	}

	// Customize toast based on status code
	if (status === 409) {
		toast.error('Conflict', {
			description:
				displayMessage || 'This item already exists or has been modified'
		})
	} else if (isPlanLimit) {
		toast.error('Plan limit reached', {
			description: displayMessage,
			action: {
				label: 'Upgrade',
				onClick: () => {
					window.location.href = `/billing/plans?source=${encodeURIComponent(upgradeSource)}`
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
