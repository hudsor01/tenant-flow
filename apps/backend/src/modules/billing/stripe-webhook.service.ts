import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SupabaseService } from '../../database/supabase.service'

/**
 * Stripe Webhook Service - Database-backed idempotency and event tracking
 *
 * Uses the processed_stripe_events table for persistent idempotency
 * following Stripe's official best practices for webhook processing
 */
@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Type predicate to check if an object has lock_acquired property set to true
	 */
	private isObjectWithLockAcquired(value: unknown): value is { lock_acquired: true } {
		return value !== null &&
			   value !== undefined &&
			   typeof value === 'object' &&
			   'lock_acquired' in value &&
			   (value as { lock_acquired?: unknown }).lock_acquired === true
	}

	/**
	 * Check if an event has already been processed
	 * Uses database for persistent idempotency across service restarts
	 */
	async isEventProcessed(eventId: string): Promise<boolean> {
		try {
			const client = this.supabaseService.getAdminClient()

			const { data, error } = await client
				.from('processed_stripe_events')
				.select('id')
				.eq('stripe_event_id', eventId)
				.single()

			if (error && error.code !== 'PGRST116') {
				// PGRST116 = no rows returned
				this.logger.error('Failed to check event processed status', {
					eventId,
					error
				})
				throw error
			}

			const isProcessed = !!data

			if (isProcessed) {
				this.logger.debug(`Event ${eventId} already processed`)
			}

			return isProcessed
		} catch (error) {
			this.logger.error('Error checking event processed status', {
				eventId,
				error
			})
			// In case of database errors, return false to allow processing
			// This prevents blocking webhooks due to database issues
			return false
		}
	}

	/**
	 * Process webhook event with atomic operations for consistency
	 * Uses individual operations wrapped in error handling for reliability
	 */
	async processWebhookEvent(
		eventId: string,
		eventType: string,
		processFunction: () => Promise<void>
	): Promise<boolean> {
		// First, acquire the lock using RPC
		const lockAcquired = await this.recordEventProcessing(eventId, eventType)
		if (!lockAcquired) {
			return false
		}

		try {
			// Process the webhook event
			await processFunction()

			// Mark event as processed after successful processing
			await this.markEventProcessed(eventId)

			this.logger.log('Webhook event processed successfully', {
				eventId,
				eventType
			})

			return true
		} catch (error) {
			this.logger.error('Webhook processing failed', {
				eventId,
				eventType,
				error: error instanceof Error ? error.message : String(error)
			})

			// Still mark as processed to prevent infinite retries of a broken event
			// This prevents the webhook from continuously failing
			try {
				await this.markEventProcessed(eventId)
			} catch (markError) {
				this.logger.error('Failed to mark event as processed after error', {
					eventId,
					error: markError instanceof Error ? markError.message : String(markError)
				})
			}

			throw error
		}
	}

	/**
	 * SECURITY FIX #5: Race condition fix - uses RPC-backed lock for atomic acquisition
	 */
	async recordEventProcessing(
		eventId: string,
		eventType: string
	): Promise<boolean> {
		try {
			const client = this.supabaseService.getAdminClient()
			const processedAt = new Date().toISOString()

			// SECURITY FIX #5: Use RPC-backed lock to avoid race windows
			const { data, error } = await client.rpc(
				'record_processed_stripe_event_lock',
				{
					p_stripe_event_id: eventId,
					p_event_type: eventType,
					p_processed_at: processedAt,
					p_status: 'processing' as const
				}
			)

			if (error) {
				this.logger.error('Failed to record event processing', {
					eventId,
					eventType,
					error
				})
				throw error
			}

			// SECURITY: Explicitly handle missing RPC data (null/empty)
			// Null data indicates RPC function error or missing function
			if (!data || (Array.isArray(data) && data.length === 0)) {
				this.logger.error('RPC returned no data - lock acquisition failed', {
					eventId,
					eventType,
					data,
					warning: 'Check if record_processed_stripe_event_lock function exists'
				})
				return false
			}

			const rows = Array.isArray(data) ? data : [data]
			const lockAcquired = rows.some(row => this.isObjectWithLockAcquired(row))

			if (!lockAcquired) {
				this.logger.debug(
					`Event ${eventId} already being processed by another request`,
					{ eventId, eventType }
				)
				return false
			}

			this.logger.debug(
				`Successfully acquired lock for event ${eventId}`,
				{ eventId, eventType, processedAt }
			)
			return true
		} catch (error) {
			this.logger.error('Error recording event processing', {
				eventId,
				eventType,
				error
			})
			throw error
		}
	}

	/**
	 * Mark an event as successfully processed
	 * Updates the processed_at timestamp and status
	 */
	async markEventProcessed(eventId: string): Promise<void> {
		try {
			const client = this.supabaseService.getAdminClient()

			const { error } = await client
				.from('processed_stripe_events')
				.update({
					processed_at: new Date().toISOString(),
					status: 'processed' as const
				})
				.eq('stripe_event_id', eventId)

			if (error) {
				this.logger.error('Failed to mark event as processed', {
					eventId,
					error
				})
				throw error
			}

			this.logger.debug(`Marked event ${eventId} as processed`)
		} catch (error) {
			this.logger.error('Error marking event as processed', {
				eventId,
				error
			})
			throw error
		}
	}

	/**
	 * Clean up old processed events
	 * Keeps the table size manageable by removing events older than specified days
	 */
	async cleanupOldEvents(daysToKeep = 30): Promise<number> {
		try {
			const client = this.supabaseService.getAdminClient()

			const cutoffDate = new Date()
			cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

			// First, count how many will be deleted
			const { count } = await client
				.from('processed_stripe_events')
				.select('*', { count: 'exact', head: true })
				.lt('processed_at', cutoffDate.toISOString())

			if (!count || count === 0) {
				this.logger.debug('No old events to clean up')
				return 0
			}

			// Delete old events
			const { error } = await client
				.from('processed_stripe_events')
				.delete()
				.lt('processed_at', cutoffDate.toISOString())

			if (error) {
				this.logger.error('Failed to cleanup old events', {
					error,
					daysToKeep
				})
				throw error
			}

			this.logger.log(`Cleaned up ${count} old webhook events`)
			return count
		} catch (error) {
			this.logger.error('Error cleaning up old events', {
				error,
				daysToKeep
			})
			throw error
		}
	}

	/**
	 * Scheduled cleanup of old webhook events
	 * Runs daily at midnight to keep database lean
	 */
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async handleScheduledCleanup() {
		try {
			await this.cleanupOldEvents(30)
			this.logger.log('Scheduled webhook cleanup completed successfully')
		} catch (error) {
			this.logger.error('Scheduled webhook cleanup failed', error)
		}
	}

	/**
	 * Get event processing statistics
	 * Useful for monitoring and debugging
	 */
	async getEventStatistics(): Promise<{
		totalEvents: number
		todayEvents: number
		lastHourEvents: number
		eventTypeBreakdown: Record<string, number>
	}> {
		try {
			const client = this.supabaseService.getAdminClient()

			const now = new Date()
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate()
			)
			const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

			// Get total count
			const { count: totalEvents } = await client
				.from('processed_stripe_events')
				.select('*', { count: 'exact', head: true })

			// Get today's count
			const { count: todayEvents } = await client
				.from('processed_stripe_events')
				.select('*', { count: 'exact', head: true })
				.gte('processed_at', todayStart.toISOString())

			// Get last hour count
			const { count: lastHourEvents } = await client
				.from('processed_stripe_events')
				.select('*', { count: 'exact', head: true })
				.gte('processed_at', hourAgo.toISOString())

			// Get event type breakdown
			const { data: events } = await client
				.from('processed_stripe_events')
				.select('event_type')

			const eventTypeBreakdown: Record<string, number> = {}
			if (events) {
				events.forEach(event => {
					const type = event.event_type
					eventTypeBreakdown[type] = (eventTypeBreakdown[type] || 0) + 1
				})
			}

			return {
				totalEvents: totalEvents || 0,
				todayEvents: todayEvents || 0,
				lastHourEvents: lastHourEvents || 0,
				eventTypeBreakdown
			}
		} catch (error) {
			this.logger.error('Error getting event statistics', { error })
			throw error
		}
	}

	/**
	 * Batch check multiple events for processing status
	 * Efficient for checking multiple events at once
	 */
	async batchCheckEventsProcessed(
		eventIds: string[]
	): Promise<Map<string, boolean>> {
		try {
			const client = this.supabaseService.getAdminClient()

			const { data, error } = await client
				.from('processed_stripe_events')
				.select('stripe_event_id')
				.in('stripe_event_id', eventIds)

			if (error) {
				this.logger.error('Failed to batch check events', {
					eventIds,
					error
				})
				throw error
			}

			const processedIds = new Set(data?.map(row => row.stripe_event_id) || [])
			const result = new Map<string, boolean>()

			eventIds.forEach(id => {
				result.set(id, processedIds.has(id))
			})

			return result
		} catch (error) {
			this.logger.error('Error batch checking events', {
				eventIds,
				error
			})
			throw error
		}
	}
}
