/**
 * Query Error Handlers
 *
 * Smart retry logic using PostgrestError for error discrimination.
 * TanStack Query v5 patterns with intelligent retry decisions.
 *
 * Retry Strategy:
 * - NEVER retry: Aborted requests, client errors (4xx)
 * - RETRY: Server errors (5xx), network errors
 * - MAX 3 attempts with exponential backoff (capped at 4s)
 */

import type { PostgrestError } from '@supabase/supabase-js'
import type { createLogger } from '#lib/frontend-logger.js'

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
// ERROR TYPE GUARDS
// ============================================================================

/**
 * Type guard for PostgrestError from @supabase/supabase-js
 */
function isPostgrestError(error: unknown): error is PostgrestError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		'message' in error &&
		'details' in error
	)
}

/**
 * Type guard for AbortError (user cancelled or component unmounted)
 */
function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError'
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
 * 3. PostgrestError: 4xx client codes → never retry; 5xx server codes → retry
 * 4. Network errors → retry (transient)
 * 5. Unknown errors → retry (assume transient)
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
	// Never retry more than 3 times
	if (failureCount >= 3) return false

	// Never retry aborted requests (user cancelled or component unmounted)
	if (isAbortError(error)) return false

	// PostgrestError classification:
	// Postgres error codes starting with '2' = successful completion (shouldn't retry)
	// Postgres error codes starting with '4' = client error (e.g. 42P01 = undefined table)
	// Postgres error codes starting with 'P' = Postgres server error (transient, retry)
	// HTTP error codes like '400', '401', '403', '404', '409' = client errors (don't retry)
	// HTTP error codes like '500', '502', '503' = server errors (retry)
	if (isPostgrestError(error)) {
		const code = error.code ?? ''
		// HTTP-style 4xx codes → client error, don't retry
		if (/^4\d{2}$/.test(code)) return false
		// Postgres client-error class codes (class 0–4) → don't retry
		if (/^[0-4]/.test(code)) return false
		// Server-side codes → retry
		return true
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
	if (isPostgrestError(error)) {
		return `[${error.code}] ${error.message}`
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
			const errorInfo = isPostgrestError(error)
				? {
						message: error.message,
						code: error.code,
						isClientError: /^4/.test(error.code ?? ''),
						isServerError: /^[5P]/.test(error.code ?? '')
					}
				: {
						message: formatError(error),
						code: null,
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
