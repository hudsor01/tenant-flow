/**
 * Centralized processor utilities following official Bull patterns
 * Single source of truth for common processor operations - eliminates ALL duplication
 */
export class ProcessorUtils {
	/**
	 * Simulates processing delay for testing and development
	 * This is THE ONLY implementation - used by ALL processors
	 */
	static async delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	/**
	 * Simulates realistic processing time with jitter
	 * Used for payment processing, report generation, etc.
	 */
	static async simulateProcessing(
		_type: string,
		baseDelay = 1000
	): Promise<void> {
		// Type parameter used for documentation/future logging purposes
		// Add realistic jitter to prevent thundering herd in tests
		const jitter = Math.random() * baseDelay * 0.5
		const totalDelay = baseDelay + jitter

		// Log simulation in development only
		if (process.env.NODE_ENV === 'development') {
			// Simulation logging disabled to avoid console.log in production code
			// Use proper logger if needed
		}

		return this.delay(totalDelay)
	}

	/**
	 * Calculates exponential backoff delay with jitter
	 * Following official Bull retry patterns
	 */
	static calculateBackoffDelay(
		attemptNumber: number,
		baseDelay = 1000,
		maxDelay = 60000
	): number {
		const delay = Math.min(Math.pow(2, attemptNumber) * baseDelay, maxDelay)
		// Add jitter to prevent thundering herd
		return delay + Math.random() * 1000
	}
}
