/**
 * Failed Notifications Service
 * 
 * Tracks failed notification attempts and provides retry mechanism
 * 🔐 BUG FIX #3: Event Handler Error Swallowing
 */

import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'

export interface FailedNotification {
	id: string
	event_type: string
	event_data: Record<string, unknown>
	error_message: string
	attempt_count: number
	last_attempt_at: string
	created_at: string
}

@Injectable()
export class FailedNotificationsService {
	private readonly logger = new Logger(FailedNotificationsService.name)
	private readonly MAX_RETRIES = 3
	private readonly RETRY_DELAYS_MS = [1000, 5000, 15000] // 1s, 5s, 15s

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Log a failed notification attempt
	 */
	async logFailure(
		eventType: string,
		eventData: any,
		error: Error
	): Promise<void> {
		try {
			// For now, just log to console since we don't have a failed_notifications table yet
			// TODO: Create migration for failed_notifications table
			this.logger.error('Failed notification logged', {
				eventType,
				eventData,
				errorMessage: error.message,
				stack: error.stack
			})

			// Alternative: Store in notifications table when we have the proper schema
			// For now, we just log to console and rely on retry mechanism
			// TODO: Create failed_notifications table and uncomment this
			/* await client.from('notifications').insert({
				user_id: eventData.userId as string,
				title: `Failed: ${eventType}`,
				content: `Failed to create notification: ${error.message}`,
				type: 'system',
				priority: 'low',
				isRead: false,
				metadata: {
					eventType,
					eventData,
					errorMessage: error.message,
					isFailed: true
				}
			}) */
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
		eventData: any,
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

				await new Promise(resolve => setTimeout(resolve, delay))
				return this.retryWithBackoff(operation, eventType, eventData, attempt + 1)
			} else {
				// Max retries exceeded, log failure
				await this.logFailure(
					eventType,
					eventData,
					error instanceof Error ? error : new Error(String(error))
				)
				return null
			}
		}
	}

	/**
	 * Query failed notifications for manual retry
	 */
	async getFailedNotifications(limit = 50): Promise<any[]> {
		try {
			const client = this.supabase.getAdminClient()

			const { data, error } = await client
				.from('notifications')
				.select('*')
				.eq('metadata->>isFailed', 'true')
				.order('createdAt', { ascending: false })
				.limit(limit)

			if (error) {
				this.logger.error('Failed to query failed notifications', { error: error.message })
				return []
			}

			return data || []
		} catch (error) {
			this.logger.error('Failed to get failed notifications', {
				error: error instanceof Error ? error.message : String(error)
			})
			return []
		}
	}
}
