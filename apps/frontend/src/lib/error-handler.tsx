/**
 * Global Error Handling System for TenantFlow
 * Provides consistent error handling, user-friendly messages, and recovery patterns
 * Professional UX with clear messaging and recovery options
 */

import { logger } from '@repo/shared/lib/frontend-logger.js'
import type { ErrorContext, UserFriendlyError } from '@repo/shared/types/errors.js'
import { toast } from 'sonner'

export class TenantFlowError extends Error {
	constructor(
		message: string,
		public code?: string,
		public statusCode?: number,
		public context?: ErrorContext,
		public originalError?: Error
	) {
		super(message)
		this.name = 'TenantFlowError'
	}
}

/**
 * Categorizes errors into user-friendly messages following modern UX principles
 */
export function categorizeError(
	error: unknown,
	context?: ErrorContext
): UserFriendlyError {
	const errorMessage = error instanceof Error ? error.message : String(error)
	const isNetworkError =
		errorMessage.includes('fetch') ||
		errorMessage.includes('network') ||
		errorMessage.includes('offline')
	const isValidationError =
		errorMessage.includes('validation') ||
		errorMessage.includes('required') ||
		errorMessage.includes('invalid')
	const isAuthError =
		errorMessage.includes('unauthorized') ||
		errorMessage.includes('forbidden') ||
		errorMessage.includes('authentication')
	const isServerError =
		errorMessage.includes('500') ||
		errorMessage.includes('502') ||
		errorMessage.includes('503') ||
		errorMessage.includes('504')
	const isNotFoundError =
		errorMessage.includes('404') || errorMessage.includes('not found')
	const isTimeoutError =
		errorMessage.includes('timeout') || errorMessage.includes('took too long')

	// Network errors - encourage retry
	if (isNetworkError || isTimeoutError) {
		return {
			title: 'Connection Issue',
			message: 'Please check your internet connection and try again.',
			action: 'Try Again',
			canRetry: true,
			severity: 'medium'
		}
	}

	// Validation errors - guide user to fix input
	if (isValidationError) {
		return {
			title: 'Input Error',
			message: 'Please check your information and try again.',
			action: 'Review Information',
			canRetry: true,
			severity: 'low'
		}
	}

	// Authentication errors - redirect to login
	if (isAuthError) {
		return {
			title: 'Access Required',
			message: 'Please sign in to continue.',
			action: 'Sign In',
			canRetry: false,
			severity: 'high'
		}
	}

	// Server errors - system issue
	if (isServerError) {
		return {
			title: 'Service Temporarily Unavailable',
			message:
				'Our servers are experiencing issues. Please try again in a moment.',
			action: 'Try Again Later',
			canRetry: true,
			severity: 'high'
		}
	}

	// Not found errors - resource doesn't exist
	if (isNotFoundError) {
		const entityType = context?.entityType || 'item'
		return {
			title: 'Not Found',
			message: `The ${entityType} you're looking for doesn't exist or has been removed.`,
			action: 'Go Back',
			canRetry: false,
			severity: 'medium'
		}
	}

	// Generic fallback
	return {
		title: 'Something Went Wrong',
		message: 'An unexpected error occurred. Please try again.',
		action: 'Try Again',
		canRetry: true,
		severity: 'medium'
	}
}

/**
 * Shows user-friendly error toast with consistent styling
 */
export function showErrorToast(error: unknown, context?: ErrorContext): void {
	const userError = categorizeError(error, context)
	const operation = context?.operation ? ` ${context.operation}` : ''
	const entityType = context?.entityType ? ` ${context.entityType}` : ''

	// Log technical details for debugging
	logger.error(`Error during${operation}${entityType}`, {
		action: 'error_handler_invoked',
		metadata: {
			error: error instanceof Error ? error.message : String(error),
			context,
			userError
		}
	})

	// Show user-friendly toast
	toast.error(userError.title, {
		description: userError.message,
		action: userError.canRetry
			? {
					label: userError.action || 'Try Again',
					onClick: () => {
						// Optionally trigger retry callback if provided
						if (context?.metadata?.retryCallback) {
							;(context.metadata.retryCallback as () => void)()
						}
					}
				}
			: undefined,
		duration:
			userError.severity === 'low'
				? 3000
				: userError.severity === 'critical'
					? 10000
					: 5000
	})
}

/**
 * Handles API errors with automatic retry and user feedback
 */
export function handleApiError(
	error: unknown,
	operation: string,
	entityType?: ErrorContext['entityType'],
	retryCallback?: () => void
): void {
	const context: ErrorContext = {
		operation,
		entityType,
		metadata: retryCallback ? { retryCallback } : undefined
	}

	showErrorToast(error, context)
}

/**
 * Creates a mutation error handler for TanStack Query
 */
export function createMutationErrorHandler(
	operation: string,
	entityType?: ErrorContext['entityType']
) {
	return (error: unknown) => {
		handleApiError(error, operation, entityType)
	}
}

/**
 * Error boundary helper for React components
 */
export function createErrorBoundaryFallback() {
	return function ErrorFallback({
		error,
		resetErrorBoundary
	}: {
		error: Error
		resetErrorBoundary: () => void
	}) {
		const userError = categorizeError(error)

		return (
			<div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
				<div className="max-w-md space-y-4">
					<div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
						<svg
							className="w-8 h-8 text-destructive"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>

					<div className="space-y-2">
						<h2 className="text-xl font-semibold text-foreground">
							{userError.title}
						</h2>
						<p className="text-muted-foreground">{userError.message}</p>
					</div>

					<div className="flex gap-2 justify-center">
						<button
							onClick={resetErrorBoundary}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
						>
							{userError.action || 'Try Again'}
						</button>
						<button
							onClick={() => {
								window.location.href = '/dashboard'
							}}
							className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
						>
							Go to Dashboard
						</button>
					</div>
				</div>
			</div>
		)
	}
}
