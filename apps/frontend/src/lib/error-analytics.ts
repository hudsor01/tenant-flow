/**
 * Error Analytics and Monitoring
 * Comprehensive error tracking with PostHog integration
 * Based on React 19 + TanStack Query v5 patterns
 */

import { logger, type LogContext } from '@repo/shared/lib/frontend-logger'
import type { ErrorContext } from '@repo/shared/types/errors'

export interface ErrorAnalytics {
	errorId: string
	timestamp: string
	errorType: string
	errorMessage: string
	errorStack?: string
	statusCode?: number
	url: string
	userAgent: string
	context?: ErrorContext
	queryKey?: unknown[]
	retryCount?: number
	isPersistent?: boolean
	affectedUsers?: string[]
	sessionId?: string
	metadata?: Record<string, unknown>
}

/**
 * Track error with comprehensive analytics
 */
export function trackError(
	error: unknown,
	context?: ErrorContext & {
		queryKey?: unknown[]
		retryCount?: number
		component?: string
	}
): void {
	const errorId = generateErrorId()
	const errorMessage = error instanceof Error ? error.message : String(error)
	const errorStack = error instanceof Error ? error.stack : undefined
	const statusCode = (error as { statusCode?: number })?.statusCode

	const analytics: ErrorAnalytics = {
		errorId,
		timestamp: new Date().toISOString(),
		errorType: categorizeErrorType(error),
		errorMessage,
		errorStack,
		statusCode,
		url: typeof window !== 'undefined' ? window.location.href : 'unknown',
		userAgent:
			typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
		context,
		queryKey: context?.queryKey,
		retryCount: context?.retryCount,
		isPersistent: (context?.retryCount ?? 0) > 2,
		sessionId: getSessionId(),
		metadata: context?.metadata
	}

	// Log to PostHog via logger
	logger.error('Error tracked in analytics', {
		action: 'error_analytics_tracked',
		component: context?.component,
		metadata: {
			errorId,
			errorType: analytics.errorType,
			errorMessage: analytics.errorMessage,
			statusCode: analytics.statusCode,
			operation: context?.operation,
			entityType: context?.entityType,
			queryKey: context?.queryKey
				? JSON.stringify(context.queryKey)
				: undefined,
			retryCount: context?.retryCount,
			isPersistent: analytics.isPersistent,
			url: analytics.url
		}
	})

	// Track patterns for persistent errors
	if (analytics.isPersistent) {
		trackPersistentError(analytics)
	}

	// Track user impact
	trackUserImpact(analytics)
}

/**
 * Track query errors specifically
 */
export function trackQueryError(
	error: unknown,
	queryKey: unknown[],
	context?: ErrorContext & {
		retryCount?: number
		component?: string
	}
): void {
	trackError(error, {
		...context,
		queryKey,
		operation: context?.operation || 'query'
	})
}

/**
 * Track mutation errors specifically
 */
export function trackMutationError(
	error: unknown,
	mutationKey: unknown[],
	context?: ErrorContext & {
		retryCount?: number
		component?: string
		variables?: unknown
	}
): void {
	trackError(error, {
		...context,
		queryKey: mutationKey,
		operation: context?.operation || 'mutation',
		metadata: {
			...context?.metadata,
			variables: context?.variables
		}
	})
}

/**
 * Track render errors from error boundaries
 */
export function trackRenderError(
	error: unknown,
	errorInfo: { componentStack?: string },
	context?: ErrorContext & {
		component?: string
	}
): void {
	trackError(error, {
		...context,
		operation: context?.operation || 'render',
		metadata: {
			...context?.metadata,
			componentStack: errorInfo.componentStack
		}
	})
}

/**
 * Categorize error type for analytics
 */
function categorizeErrorType(error: unknown): string {
	const errorMessage =
		error instanceof Error
			? error.message.toLowerCase()
			: String(error).toLowerCase()
	const statusCode = (error as { statusCode?: number })?.statusCode

	if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
		return 'NETWORK_ERROR'
	}
	if (errorMessage.includes('timeout')) {
		return 'TIMEOUT_ERROR'
	}
	if (statusCode === 401 || errorMessage.includes('unauthorized')) {
		return 'AUTH_ERROR'
	}
	if (statusCode === 403 || errorMessage.includes('forbidden')) {
		return 'PERMISSION_ERROR'
	}
	if (statusCode === 404 || errorMessage.includes('not found')) {
		return 'NOT_FOUND_ERROR'
	}
	if (statusCode === 422 || errorMessage.includes('validation')) {
		return 'VALIDATION_ERROR'
	}
	if (statusCode === 429 || errorMessage.includes('rate limit')) {
		return 'RATE_LIMIT_ERROR'
	}
	if (statusCode && statusCode >= 500) {
		return 'SERVER_ERROR'
	}
	if (statusCode && statusCode >= 400) {
		return 'CLIENT_ERROR'
	}
	if (errorMessage.includes('render') || errorMessage.includes('component')) {
		return 'RENDER_ERROR'
	}

	return 'UNKNOWN_ERROR'
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
	return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
	if (typeof window === 'undefined') return 'unknown'

	let sessionId = sessionStorage.getItem('error_tracking_session_id')
	if (!sessionId) {
		sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
		sessionStorage.setItem('error_tracking_session_id', sessionId)
	}
	return sessionId
}

/**
 * Track persistent errors (errors that occur repeatedly)
 */
function trackPersistentError(analytics: ErrorAnalytics): void {
	logger.warn('Persistent error detected', {
		action: 'persistent_error_detected',
		metadata: {
			errorId: analytics.errorId,
			errorType: analytics.errorType,
			errorMessage: analytics.errorMessage,
			retryCount: analytics.retryCount,
			queryKey: analytics.queryKey
				? JSON.stringify(analytics.queryKey)
				: undefined,
			url: analytics.url
		}
	})

	// Store persistent error for pattern analysis
	if (typeof window !== 'undefined') {
		const persistentErrors = JSON.parse(
			localStorage.getItem('persistent_errors') || '[]'
		) as Array<{ errorType: string; timestamp: string; count: number }>

		const existingError = persistentErrors.find(
			e => e.errorType === analytics.errorType
		)
		if (existingError) {
			existingError.count++
			existingError.timestamp = analytics.timestamp
		} else {
			persistentErrors.push({
				errorType: analytics.errorType,
				timestamp: analytics.timestamp,
				count: 1
			})
		}

		// Keep only last 20 persistent errors
		if (persistentErrors.length > 20) {
			persistentErrors.shift()
		}

		localStorage.setItem('persistent_errors', JSON.stringify(persistentErrors))
	}
}

/**
 * Track user impact from errors
 */
function trackUserImpact(analytics: ErrorAnalytics): void {
	// Track user sessions affected by errors
	if (typeof window !== 'undefined') {
		const errorImpact = JSON.parse(
			sessionStorage.getItem('error_impact') ||
				'{"errorCount": 0, "affectedOperations": []}'
		) as { errorCount: number; affectedOperations: string[] }

		errorImpact.errorCount++
		if (
			analytics.context?.operation &&
			!errorImpact.affectedOperations.includes(analytics.context.operation)
		) {
			errorImpact.affectedOperations.push(analytics.context.operation)
		}

		sessionStorage.setItem('error_impact', JSON.stringify(errorImpact))

		// Log high-impact sessions (>5 errors)
		if (errorImpact.errorCount > 5) {
			logger.error('High error impact session detected', {
				action: 'high_error_impact',
				metadata: {
					errorCount: errorImpact.errorCount,
					affectedOperations: errorImpact.affectedOperations,
					sessionId: analytics.sessionId
				}
			})
		}
	}
}

/**
 * Get error analytics summary for debugging
 */
export function getErrorAnalyticsSummary(): {
	sessionErrors: number
	persistentErrors: Array<{ errorType: string; count: number }>
	affectedOperations: string[]
} {
	if (typeof window === 'undefined') {
		return { sessionErrors: 0, persistentErrors: [], affectedOperations: [] }
	}

	const errorImpact = JSON.parse(
		sessionStorage.getItem('error_impact') ||
			'{"errorCount": 0, "affectedOperations": []}'
	) as { errorCount: number; affectedOperations: string[] }

	const persistentErrors = JSON.parse(
		localStorage.getItem('persistent_errors') || '[]'
	) as Array<{ errorType: string; timestamp: string; count: number }>

	return {
		sessionErrors: errorImpact.errorCount,
		persistentErrors: persistentErrors.map(e => ({
			errorType: e.errorType,
			count: e.count
		})),
		affectedOperations: errorImpact.affectedOperations
	}
}

/**
 * Clear error analytics (useful for testing or after user feedback)
 */
export function clearErrorAnalytics(): void {
	if (typeof window !== 'undefined') {
		sessionStorage.removeItem('error_impact')
		sessionStorage.removeItem('error_tracking_session_id')
		localStorage.removeItem('persistent_errors')

		logger.info('Error analytics cleared', {
			action: 'error_analytics_cleared',
			metadata: {}
		})
	}
}

/**
 * Report error to monitoring service (PostHog)
 * This is automatically done via logger, but can be called directly for custom reporting
 */
export function reportErrorToMonitoring(
	error: unknown,
	context?: ErrorContext & { component?: string }
): void {
	const logContext: LogContext = {
		component: context?.component,
		action: 'error_reported_to_monitoring',
		metadata: {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			operation: context?.operation,
			entityType: context?.entityType,
			entityId: context?.entityId,
			userId: context?.userId,
			...context?.metadata
		}
	}

	logger.error('Error reported to monitoring', logContext)
}
