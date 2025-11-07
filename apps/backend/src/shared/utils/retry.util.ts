import type { Logger } from '@nestjs/common'

/**
 * Retry configuration constants
 */
export const RETRY_CONFIG = {
	MAX_RETRIES: 3,
	DELAYS_MS: [1000, 5000, 15000] as const // 1s, 5s, 15s exponential backoff
} as const

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - The async function to retry
 * @param logger - NestJS Logger instance for logging retry attempts
 * @param context - Context string for logging (e.g., "RPC call: get_billing_insights")
 * @param attempt - Current attempt number (default: 0, internal use for recursion)
 * @returns The result of the operation or null if all retries failed
 */
export async function retryWithExponentialBackoff<T>(
	operation: () => Promise<T>,
	logger: Logger,
	context: string,
	attempt = 0
): Promise<T | null> {
	try {
		return await operation()
	} catch (error) {
		if (attempt < RETRY_CONFIG.MAX_RETRIES) {
			const delay = RETRY_CONFIG.DELAYS_MS[attempt]
			logger.log(
				`Retrying ${context} after ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES})`
			)
			await new Promise(resolve => setTimeout(resolve, delay))
			return retryWithExponentialBackoff(operation, logger, context, attempt + 1)
		}

		logger.error(`All retries exhausted for ${context}`, {
			error: error instanceof Error ? error.message : String(error),
			attempts: RETRY_CONFIG.MAX_RETRIES
		})
		return null
	}
}
