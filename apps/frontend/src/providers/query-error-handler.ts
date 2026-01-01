/**
 * Query Error Handlers
 *
 * Smart retry logic using ApiError class for error discrimination.
 * TanStack Query v5 patterns with intelligent retry decisions.
 *
 * Retry Strategy:
 * - NEVER retry: Aborted requests, client errors (4xx)
 * - RETRY: Server errors (5xx), network errors
 * - MAX 3 attempts with exponential backoff (capped at 4s)
 */

import type { createLogger } from '@repo/shared/lib/frontend-logger'
import { isApiError, isAbortError } from '#lib/api-request'

type Logger = ReturnType<typeof createLogger>

type MutationVariables = unknown
type MutationContext = unknown

type QueryErrorHandlers = {
	retry: (failureCount: number, error: unknown) => boolean
	retryDelay: (attemptIndex: number) => number
	onMutationSuccess: (
		data: unknown,
		variables: MutationVariables,
		context: MutationContext
	) => void
	onMutationError: (
		error: unknown,
		variables: MutationVariables,
		context: MutationContext
	) => void
}

// ============================================================================
// STANDALONE RETRY FUNCTIONS (for direct use in QueryClient config)
// ============================================================================

/**
 * Smart retry logic that discriminates between error types
 *
 * @returns true if request should be retried
 *
 * Decision tree:
 * 1. Max 3 attempts (failureCount >= 3 → stop)
 * 2. Aborted requests → never retry
 * 3. Client errors (4xx) → never retry (won't succeed)
 * 4. Server errors (5xx) → retry (transient)
 * 5. Network errors → retry (transient)
 * 6. Unknown errors → retry (assume transient)
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
	// Never retry more than 3 times
	if (failureCount >= 3) return false

	// Never retry aborted requests (user cancelled or component unmounted)
	if (isAbortError(error)) return false

	// ApiError with classification
	if (isApiError(error)) {
		// Never retry client errors - they won't succeed
		if (error.isClientError) return false

		// Retry server errors and network errors
		return error.isRetryable
	}

	// Unknown error type - assume transient, allow retry
	return true
}

/**
 * Exponential backoff with cap
 * 1st retry: 1000ms
 * 2nd retry: 2000ms
 * 3rd retry: 4000ms (max)
 */
export function getRetryDelay(attemptIndex: number): number {
	return Math.min(1000 * Math.pow(2, attemptIndex), 4000)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatVariables = (variables: MutationVariables) => {
	if (variables && typeof variables === 'object') {
		return Object.keys(variables as Record<string, unknown>)
	}

	return String(variables)
}

const formatError = (error: unknown): string => {
	if (isApiError(error)) {
		return `[${error.status}] ${error.message}`
	}
	if (error instanceof Error) {
		return error.message
	}
	return String(error)
}

// ============================================================================
// FACTORY FUNCTION (for QueryClientProvider)
// ============================================================================

export const createQueryErrorHandlers = (
	logger: Logger
): QueryErrorHandlers => {
	return {
		retry: shouldRetryQuery,
		retryDelay: getRetryDelay,
		onMutationSuccess: (_data, variables, context) => {
			logger.debug('Mutation succeeded', {
				action: 'mutation_success',
				metadata: {
					variables: formatVariables(variables),
					hasRollbackData: !!context
				}
			})
		},
		onMutationError: (error, variables, context) => {
			const errorInfo = isApiError(error)
				? {
						message: error.message,
						status: error.status,
						isRetryable: error.isRetryable,
						isClientError: error.isClientError,
						isServerError: error.isServerError
					}
				: {
						message: formatError(error),
						status: null,
						isRetryable: true,
						isClientError: false,
						isServerError: false
					}

			logger.warn('Mutation failed', {
				action: 'mutation_error',
				metadata: {
					error: errorInfo,
					variables: formatVariables(variables),
					hasRollbackData: !!context
				}
			})
		}
	}
}
