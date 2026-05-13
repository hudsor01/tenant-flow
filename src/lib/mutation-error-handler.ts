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

import * as Sentry from '@sentry/nextjs'

import { createLogger } from '#lib/frontend-logger'
import { toast } from 'sonner'

const logger = createLogger({ component: 'MutationErrorHandler' })

/**
 * Coerce an unknown error to an Error instance so `Sentry.captureException`
 * gets a real stack trace + exception type instead of falling through to
 * `captureMessage`. Plain Supabase / PostgREST objects look like
 * `{ message, code, hint, details }` — we wrap them as `Error` to preserve
 * the message while attaching the original shape as `cause` for inspection.
 */
function toError(error: unknown, fallback: string): Error {
	if (error instanceof Error) return error
	if (typeof error === 'string') return new Error(error)
	const obj = error as Record<string, unknown> | null
	const message =
		(typeof obj?.message === 'string' && obj.message) ||
		(typeof (obj?.payload as Record<string, unknown>)?.message === 'string' &&
			((obj?.payload as Record<string, unknown>).message as string)) ||
		fallback
	const wrapped = new Error(message)
	if (obj) (wrapped as Error & { cause?: unknown }).cause = obj
	return wrapped
}

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
	const action = context.toLowerCase().replace(/\s+/g, '_')

	// Route the real error (with stack + class) to Sentry directly so we
	// don't fall through to `captureMessage`. `logger.error` keeps the
	// structured console/breadcrumb trail; Sentry gets the exception form.
	Sentry.captureException(toError(error, `${context} failed`), {
		tags: { mutation: action },
		extra: { context, status, message }
	})

	// Structured logging for the console + Sentry breadcrumb.
	logger.error(`${context} failed`, {
		action,
		metadata: {
			error: message,
			status,
			errorType: error instanceof Error ? error.constructor.name : typeof error
		}
	})

	// Show user-friendly toast notification
	const displayMessage = customMessage || message

	// Plan-limit detection — fired by the BEFORE-INSERT triggers
	// `enforce_property_plan_limit` / `enforce_unit_plan_limit`. The PG
	// exception surfaces here as a `PostgrestError` with top-level fields
	// `hint = 'plan_limit_exceeded'` and `details` as a JSON string carrying
	// `{ resource, used, limit, upgrade_source }`. Edge Function tier gates
	// (`_shared/tier-gate.ts`) return a 402 response with `upgrade_url` in
	// the body and are surfaced through their own per-feature handlers — they
	// do NOT pass through this function.
	const errObj = error as Record<string, unknown> | null
	const pgHint = typeof errObj?.hint === 'string' ? errObj.hint : undefined
	const pgDetails = typeof errObj?.details === 'string' ? errObj.details : undefined
	const isPlanLimit = pgHint === 'plan_limit_exceeded'

	// Source attribution for analytics — DETAIL is JSON-encoded by the
	// trigger's `format(...)` call. Treat parse failures as a soft default
	// rather than blocking the toast.
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
