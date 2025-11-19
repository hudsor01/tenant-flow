/**
 * Failed Notifications Service
 *
 * Provides retry mechanism with exponential backoff for notification delivery
 * NOTE: Previously attempted to persist failures to database, but the failed_notifications
 * table does not exist. This service now focuses on retry logic only.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

@Injectable()
export class FailedNotificationsService implements OnModuleDestroy {
	private readonly logger = new Logger(FailedNotificationsService.name)
	private readonly MAX_RETRIES = 3
	private readonly RETRY_DELAYS_MS = [1000, 5000, 15000] // 1s, 5s, 15s
	private pendingTimers: Set<NodeJS.Timeout> = new Set()

	constructor() {}

	/**
	 * Retry operation with exponential backoff
	 * Used for notification delivery and other transient failures
	 */
	async retryWithBackoff<T>(
		operation: () => Promise<T>,
		eventType: string,
		_eventData?: unknown,
		attempt = 0
	): Promise<T | null> {
		try {
			return await operation()
		} catch (error) {
			if (attempt < this.MAX_RETRIES) {
				const delay = this.RETRY_DELAYS_MS[attempt] || 15000
				this.logger.warn(
					`Retry attempt ${attempt + 1}/${this.MAX_RETRIES} after ${delay}ms`,
					{
						eventType,
						errorMessage: error instanceof Error ? error.message : String(error)
					}
				)

				await new Promise(resolve => {
					const timer = setTimeout(() => {
						this.pendingTimers.delete(timer)
						resolve(undefined)
					}, delay)
					this.pendingTimers.add(timer)
				})

				return this.retryWithBackoff(operation, eventType, _eventData, attempt + 1)
			} else {
				// Max retries exceeded
				this.logger.error('Retry operation failed after max attempts', {
					eventType,
					error: error instanceof Error ? error.message : String(error),
					totalAttempts: attempt + 1
				})
				return null
			}
		}
	}

	/**
	 * Cleanup pending timers on module destroy
	 */
	async onModuleDestroy() {
		if (this.pendingTimers.size > 0) {
			this.logger.log('Clearing pending retry timers', {
				count: this.pendingTimers.size
			})
			for (const timer of this.pendingTimers) {
				clearTimeout(timer)
			}
			this.pendingTimers.clear()
		}
	}
}
