/**
 * Failed Notifications Service
 *
 * Tracks failed notification attempts and provides retry mechanism
 * 🔐 BUG FIX #3: Event Handler Error Swallowing
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import type { Json } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'

export interface FailedNotification {
	id: string
	event_type: string
	event_data: Json
	error_message: string
	error_stack: string | null
	attempt_count: number
	last_attempt_at: string
	created_at: string
}

@Injectable()
export class FailedNotificationsService implements OnModuleDestroy {
	private readonly logger = new Logger(FailedNotificationsService.name)
	private readonly MAX_RETRIES = 3
	private readonly RETRY_DELAYS_MS = [1000, 5000, 15000] // 1s, 5s, 15s
	private pendingTimers: Set<NodeJS.Timeout> = new Set()

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Insert failed notification record with proper typing
	 */
	private async insertFailedNotification(data: {
		event_type: string
		event_data: Json
		error_message: string
		error_stack: string | null
		attempt_count: number
		last_attempt_at: string
	}) {
		const client = this.supabase.getAdminClient()
		return await client.schema('public').from('failed_notifications').insert(data)
	}

	/**
	 * Log a failed notification attempt
	 */
	async logFailure(
		eventType: string,
		eventData: unknown,
		error: Error,
		attemptCount = 1
	): Promise<void> {
		try {
			const safeAttemptCount = Math.max(1, attemptCount)
			const normalizedEventData = this.serializeEventData(eventData)
			const eventDataForLogging =
				typeof normalizedEventData === 'object' && normalizedEventData !== null
					? normalizedEventData
					: { payload: normalizedEventData }

		const { error: insertError } = await this.insertFailedNotification({
			event_type: eventType,
			event_data: normalizedEventData,
			error_message: error.message,
			error_stack: error.stack ?? null,
			attempt_count: safeAttemptCount,
			last_attempt_at: new Date().toISOString()
		})

			if (insertError) {
				this.logger.error('Failed to persist notification failure', {
					eventType,
					eventData: eventDataForLogging,
					errorMessage: error.message,
					insertError: insertError.message
				})
				return
			}

			this.logger.error('Failed notification logged', {
				eventType,
				eventData: eventDataForLogging,
				errorMessage: error.message,
				stack: error.stack,
				attemptCount: safeAttemptCount
			})
		} catch (logError) {
			// If logging fails, at least log to console
			this.logger.error('Failed to log notification failure', {
				originalError: error.message,
				logError: logError instanceof Error ? logError.message : String(logError)
			})
		}
	}

	/**
	 * Retry failed notification with exponential backoff
	 */
	async retryWithBackoff<T>(
		operation: () => Promise<T>,
		eventType: string,
		eventData: unknown,
		attempt = 0
	): Promise<T | null> {
		try {
			return await operation()
		} catch (error) {
			if (attempt < this.MAX_RETRIES) {
				const delay = this.RETRY_DELAYS_MS[attempt] || 15000
				this.logger.warn(`Retry attempt ${attempt + 1}/${this.MAX_RETRIES} after ${delay}ms`, {
					eventType,
					errorMessage: error instanceof Error ? error.message : String(error)
				})

				await new Promise(resolve => {
					const timer = setTimeout(() => {
						this.pendingTimers.delete(timer)
						resolve(undefined)
					}, delay)
					this.pendingTimers.add(timer)
				})
				return this.retryWithBackoff(operation, eventType, eventData, attempt + 1)
			} else {
				// Max retries exceeded, log failure
				await this.logFailure(
					eventType,
					eventData,
					error instanceof Error ? error : new Error(String(error)),
					Math.min(attempt + 1, this.MAX_RETRIES + 1)
				)
				return null
			}
		}
	}

	/**
	 * Query failed notifications for manual retry
	 */
	async getFailedNotifications(limit = 50): Promise<FailedNotification[]> {
		try {
			const client = this.supabase.getAdminClient()

			const { data, error } = await client.schema('public')
				.from('failed_notifications')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(limit)

			if (error) {
				this.logger.error('Failed to query failed notifications', { error: error.message })
				return []
			}

			return data ?? []
		} catch (error) {
			this.logger.error('Failed to get failed notifications', {
				error: error instanceof Error ? error.message : String(error)
			})
			return []
		}
	}

	private serializeEventData(eventData: unknown): Json {
		if (eventData === null || typeof eventData === 'undefined') {
			return {}
		}

		try {
			const serialized = JSON.stringify(eventData)
			return serialized ? (JSON.parse(serialized) as Json) : {}
		} catch {
			return { payload: String(eventData) }
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
