/**
 * Smart Retry Strategies for TanStack Query
 * Based on official TanStack Query v5 patterns
 * Implements exponential backoff, circuit breaker, and adaptive retry logic
 */

import { logger } from '@repo/shared/lib/frontend-logger'

export interface RetryConfig {
	maxRetries: number
	baseDelay: number
	maxDelay: number
	shouldRetry: (failureCount: number, error: unknown) => boolean
	onRetry?: (failureCount: number, error: unknown) => void
}

/**
 * Error categorization for retry logic
 */
export function categorizeErrorForRetry(error: unknown): {
	isRetryable: boolean
	isClientError: boolean
	isServerError: boolean
	isNetworkError: boolean
	statusCode?: number
} {
	const errorMessage =
		error instanceof Error
			? error.message.toLowerCase()
			: String(error).toLowerCase()

	// Extract status code from error message or error object
	const statusCode = (error as { statusCode?: number })?.statusCode
	const statusMatch = errorMessage.match(/\((\d{3})\)/)
	const extractedStatus = statusMatch?.[1]
		? parseInt(statusMatch[1], 10)
		: statusCode

	// Network errors - always retryable
	const isNetworkError =
		errorMessage.includes('network') ||
		errorMessage.includes('fetch') ||
		errorMessage.includes('offline') ||
		errorMessage.includes('timeout') ||
		errorMessage.includes('aborted')

	// Client errors (4xx) - usually not retryable
	const isClientError = extractedStatus
		? extractedStatus >= 400 && extractedStatus < 500
		: errorMessage.includes('400') ||
			errorMessage.includes('401') ||
			errorMessage.includes('403') ||
			errorMessage.includes('404') ||
			errorMessage.includes('422') ||
			errorMessage.includes('unauthorized') ||
			errorMessage.includes('forbidden') ||
			errorMessage.includes('not found') ||
			errorMessage.includes('validation error')

	// Server errors (5xx) - retryable
	const isServerError = extractedStatus
		? extractedStatus >= 500
		: errorMessage.includes('500') ||
			errorMessage.includes('502') ||
			errorMessage.includes('503') ||
			errorMessage.includes('504') ||
			errorMessage.includes('server error')

	// Determine if retryable
	const isRetryable =
		isNetworkError ||
		isServerError ||
		// 429 Rate limiting is retryable
		extractedStatus === 429 ||
		errorMessage.includes('rate limit')

	return {
		isRetryable,
		isClientError,
		isServerError,
		isNetworkError,
		statusCode: extractedStatus
	}
}

/**
 * Default query retry logic - smart error categorization
 */
export function defaultQueryRetry(
	failureCount: number,
	error: unknown
): boolean {
	const { isRetryable, isClientError } = categorizeErrorForRetry(error)

	// Don't retry client errors (except rate limits)
	if (
		isClientError &&
		!(error instanceof Error && error.message.includes('429'))
	) {
		logger.warn('Query retry skipped - client error', {
			action: 'query_retry_skipped',
			metadata: {
				failureCount,
				error: error instanceof Error ? error.message : String(error),
				reason: 'client_error'
			}
		})
		return false
	}

	// Retry network and server errors up to 3 times
	if (isRetryable && failureCount < 3) {
		logger.info('Query retry attempt', {
			action: 'query_retry_attempt',
			metadata: {
				failureCount,
				error: error instanceof Error ? error.message : String(error)
			}
		})
		return true
	}

	logger.warn('Query retry exhausted', {
		action: 'query_retry_exhausted',
		metadata: {
			failureCount,
			error: error instanceof Error ? error.message : String(error),
			isRetryable
		}
	})
	return false
}

/**
 * Default mutation retry logic - more conservative
 */
export function defaultMutationRetry(
	failureCount: number,
	error: unknown
): boolean {
	const { isRetryable, isClientError, isNetworkError } =
		categorizeErrorForRetry(error)

	// Never retry client errors for mutations
	if (isClientError) {
		logger.warn('Mutation retry skipped - client error', {
			action: 'mutation_retry_skipped',
			metadata: {
				failureCount,
				error: error instanceof Error ? error.message : String(error),
				reason: 'client_error'
			}
		})
		return false
	}

	// Only retry network errors for mutations (up to 2 times)
	if (isNetworkError && failureCount < 2) {
		logger.info('Mutation retry attempt', {
			action: 'mutation_retry_attempt',
			metadata: {
				failureCount,
				error: error instanceof Error ? error.message : String(error)
			}
		})
		return true
	}

	// Retry server errors once
	if (isRetryable && failureCount < 1) {
		logger.info('Mutation retry attempt - server error', {
			action: 'mutation_retry_attempt',
			metadata: {
				failureCount,
				error: error instanceof Error ? error.message : String(error)
			}
		})
		return true
	}

	logger.warn('Mutation retry exhausted', {
		action: 'mutation_retry_exhausted',
		metadata: {
			failureCount,
			error: error instanceof Error ? error.message : String(error)
		}
	})
	return false
}

/**
 * Exponential backoff with jitter
 * Prevents thundering herd problem
 */
export function exponentialBackoffWithJitter(
	attemptIndex: number,
	baseDelay = 1000,
	maxDelay = 30000
): number {
	// Calculate exponential backoff
	const exponentialDelay = Math.min(
		baseDelay * Math.pow(2, attemptIndex),
		maxDelay
	)

	// Add jitter (random 0-25% of delay)
	const jitter = exponentialDelay * 0.25 * Math.random()

	const finalDelay = Math.floor(exponentialDelay + jitter)

	logger.debug('Retry delay calculated', {
		action: 'retry_delay_calculated',
		metadata: { attemptIndex, baseDelay, exponentialDelay, jitter, finalDelay }
	})

	return finalDelay
}

/**
 * Circuit breaker pattern for repeated failures
 * Temporarily stops retries if too many failures occur
 */
class CircuitBreaker {
	private failures = 0
	private lastFailureTime = 0
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
	private readonly threshold = 5
	private readonly resetTimeout = 60000 // 1 minute

	shouldAllowRetry(queryKey: string): boolean {
		const now = Date.now()

		// Reset if timeout has passed
		if (
			this.state === 'OPEN' &&
			now - this.lastFailureTime > this.resetTimeout
		) {
			this.state = 'HALF_OPEN'
			this.failures = 0
			logger.info('Circuit breaker transitioning to HALF_OPEN', {
				action: 'circuit_breaker_half_open',
				metadata: { queryKey }
			})
		}

		// Allow retry if circuit is closed or half-open
		if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
			return true
		}

		logger.warn('Circuit breaker blocking retry', {
			action: 'circuit_breaker_open',
			metadata: { queryKey, failures: this.failures, state: this.state }
		})
		return false
	}

	recordFailure(queryKey: string): void {
		this.failures++
		this.lastFailureTime = Date.now()

		if (this.failures >= this.threshold) {
			this.state = 'OPEN'
			logger.error('Circuit breaker opened due to repeated failures', {
				action: 'circuit_breaker_opened',
				metadata: { queryKey, failures: this.failures }
			})
		}
	}

	recordSuccess(queryKey: string): void {
		if (this.state === 'HALF_OPEN') {
			this.state = 'CLOSED'
			this.failures = 0
			logger.info('Circuit breaker closed after successful retry', {
				action: 'circuit_breaker_closed',
				metadata: { queryKey }
			})
		}
	}
}

// Global circuit breaker instance
const globalCircuitBreaker = new CircuitBreaker()

/**
 * Enhanced retry function with circuit breaker
 */
export function retryWithCircuitBreaker(
	failureCount: number,
	error: unknown,
	queryKey: unknown[]
): boolean {
	const key = JSON.stringify(queryKey)

	// Check circuit breaker first
	if (!globalCircuitBreaker.shouldAllowRetry(key)) {
		return false
	}

	// Apply default retry logic
	const shouldRetry = defaultQueryRetry(failureCount, error)

	// Record result
	if (shouldRetry) {
		globalCircuitBreaker.recordFailure(key)
	}

	return shouldRetry
}

/**
 * Adaptive retry delay based on error type
 */
export function adaptiveRetryDelay(
	attemptIndex: number,
	error: unknown
): number {
	const { isNetworkError, isServerError, statusCode } =
		categorizeErrorForRetry(error)

	// Network errors: faster retry (500ms base)
	if (isNetworkError) {
		return exponentialBackoffWithJitter(attemptIndex, 500, 10000)
	}

	// Rate limiting (429): longer delay (5s base)
	if (statusCode === 429) {
		return exponentialBackoffWithJitter(attemptIndex, 5000, 60000)
	}

	// Server errors: standard delay (1s base)
	if (isServerError) {
		return exponentialBackoffWithJitter(attemptIndex, 1000, 30000)
	}

	// Default: standard exponential backoff
	return exponentialBackoffWithJitter(attemptIndex, 1000, 30000)
}

/**
 * Create custom retry config for specific query types
 */
export function createRetryConfig(
	type: 'critical' | 'standard' | 'background'
): RetryConfig {
	const configs: Record<'critical' | 'standard' | 'background', RetryConfig> = {
		critical: {
			maxRetries: 5,
			baseDelay: 500,
			maxDelay: 10000,
			shouldRetry: (failureCount, error) => {
				const { isRetryable } = categorizeErrorForRetry(error)
				return isRetryable && failureCount < 5
			},
			onRetry: (failureCount, error) => {
				logger.warn('Critical query retry', {
					action: 'critical_query_retry',
					metadata: {
						failureCount,
						error: error instanceof Error ? error.message : String(error)
					}
				})
			}
		},
		standard: {
			maxRetries: 3,
			baseDelay: 1000,
			maxDelay: 30000,
			shouldRetry: defaultQueryRetry,
			onRetry: (failureCount, error) => {
				logger.info('Standard query retry', {
					action: 'standard_query_retry',
					metadata: {
						failureCount,
						error: error instanceof Error ? error.message : String(error)
					}
				})
			}
		},
		background: {
			maxRetries: 1,
			baseDelay: 2000,
			maxDelay: 10000,
			shouldRetry: (failureCount, error) => {
				const { isNetworkError } = categorizeErrorForRetry(error)
				return isNetworkError && failureCount < 1
			},
			onRetry: (failureCount, error) => {
				logger.debug('Background query retry', {
					action: 'background_query_retry',
					metadata: {
						failureCount,
						error: error instanceof Error ? error.message : String(error)
					}
				})
			}
		}
	}

	return configs[type]
}
