import { Injectable, Logger } from '@nestjs/common'
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
	 * Record that an event is being processed
	 * Prevents concurrent processing of the same event using database-level locking
	 * SECURITY FIX #5: Race condition fix - uses INSERT with conflict check for atomic lock acquisition
	 */
	async recordEventProcessing(
		eventId: string,
		eventType: string
	): Promise<boolean> {
		try {
			const client = this.supabaseService.getAdminClient()

			// SECURITY FIX #5: Use INSERT to atomically acquire lock
			// First attempt will succeed, concurrent attempts will fail due to unique constraint
			const { error } = await client
				.from('processed_stripe_events')
				.insert({
					stripe_event_id: eventId,
					event_type: eventType,
					processed_at: new Date().toISOString(),
					status: 'processing' as const
				})
				.select()

			// Check if insert succeeded (got the lock) or failed (someone else got it)
			if (error) {
				// Check if error is due to unique constraint violation (23505)
				if (error.code === '23505' || error.message?.includes('duplicate')) {
					this.logger.debug(
						`Event ${eventId} already being processed by another request`
					)
					return false // Lock acquisition failed - event is being processed
				}

				// Other error - log and throw
				this.logger.error('Failed to record event processing', {
					eventId,
					eventType,
					error
				})
				throw error
			}

			this.logger.debug(`Successfully acquired lock for event ${eventId}`)
			return true // Lock acquisition succeeded
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
