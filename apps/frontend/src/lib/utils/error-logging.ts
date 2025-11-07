import type { createLogger } from '@repo/shared/lib/frontend-logger'

/**
 * Logs error details with structured metadata
 *
 * Provides consistent error logging across the application by extracting
 * error message and stack trace when available.
 *
 * @param logger - Logger instance from createLogger()
 * @param message - Human-readable error context
 * @param error - Unknown error object (from catch block)
 * @param metadata - Additional context to include in log
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData()
 * } catch (error) {
 *   logErrorDetails(logger, 'Failed to fetch data', error, { id: '123' })
 * }
 * ```
 */
export function logErrorDetails(
	logger: ReturnType<typeof createLogger>,
	message: string,
	error: unknown,
	metadata?: Record<string, unknown>
): void {
	logger.error(message, {
		...metadata,
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined
	})
}
