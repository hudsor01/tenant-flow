import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SentryCron } from '@sentry/nestjs'
import * as crypto from 'crypto'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Event Idempotency Service
 *
 * Provides idempotency for @OnEvent handlers to prevent duplicate event processing.
 * Uses the processed_internal_events table with atomic RPC locking pattern.
 *
 * Usage:
 * ```typescript
 * @OnEvent('maintenance.updated')
 * async handleMaintenanceUpdated(event: MaintenanceUpdatedEvent): Promise<void> {
 *     await this.idempotency.withIdempotency('maintenance.updated', event, async () => {
 *         // handler logic
 *     })
 * }
 * ```
 */
@Injectable()
export class EventIdempotencyService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Type predicate to check if an object has lock_acquired property set to true
	 */
	private isObjectWithLockAcquired(
		value: unknown
	): value is { lock_acquired: true } {
		return (
			value !== null &&
			value !== undefined &&
			typeof value === 'object' &&
			'lock_acquired' in value &&
			(value as { lock_acquired?: unknown }).lock_acquired === true
		)
	}

	/**
	 * Generate idempotency key from event name and payload
	 * Uses SHA-256 hash for deterministic deduplication
	 */
	generateIdempotencyKey(eventName: string, payload: unknown): string {
		// Sort object keys for deterministic hashing
		const sortedPayload = JSON.stringify(
			payload,
			payload && typeof payload === 'object'
				? Object.keys(payload as object).sort()
				: undefined
		)
		const hash = crypto
			.createHash('sha256')
			.update(`${eventName}:${sortedPayload}`)
			.digest('hex')
			.substring(0, 32) // Truncate for readability
		return hash
	}

	/**
	 * Acquire lock for event processing using atomic RPC
	 * Uses INSERT ON CONFLICT DO NOTHING pattern for race-condition-safe locking
	 */
	async acquireLock(eventName: string, payload: unknown): Promise<boolean> {
		const idempotencyKey = this.generateIdempotencyKey(eventName, payload)
		const payloadHash = crypto
			.createHash('sha256')
			.update(JSON.stringify(payload))
			.digest('hex')
			.substring(0, 16)

		try {
			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc('acquire_internal_event_lock', {
				p_event_name: eventName,
				p_idempotency_key: idempotencyKey,
				p_payload_hash: payloadHash
			})

			if (error) {
				this.logger.error('Failed to acquire event lock', { eventName, error })
				// Fail-open: allow processing on DB errors to prevent blocking events
				return true
			}

			// Handle null/empty RPC response
			if (!data || (Array.isArray(data) && data.length === 0)) {
				this.logger.error('RPC returned no data - lock acquisition failed', {
					eventName,
					data,
					warning: 'Check if acquire_internal_event_lock function exists'
				})
				// Fail-open
				return true
			}

			const rows = Array.isArray(data) ? data : [data]
			const lockAcquired = rows.some(row => this.isObjectWithLockAcquired(row))

			if (!lockAcquired) {
				this.logger.debug(`Event already processed: ${eventName}`, {
					idempotencyKey
				})
			}

			return lockAcquired
		} catch (error) {
			this.logger.error('Error acquiring event lock', { eventName, error })
			// Fail-open
			return true
		}
	}

	/**
	 * Mark event as successfully processed
	 * Updates the status and processed_at timestamp
	 */
	async markProcessed(eventName: string, payload: unknown): Promise<void> {
		const idempotencyKey = this.generateIdempotencyKey(eventName, payload)

		try {
			const client = this.supabaseService.getAdminClient()
			const { error } = await client
				.from('processed_internal_events')
				.update({ status: 'processed', processed_at: new Date().toISOString() })
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)

			if (error) {
				this.logger.error('Failed to mark event as processed', {
					eventName,
					error
				})
			}
		} catch (error) {
			this.logger.error('Error marking event processed', { eventName, error })
		}
	}

	/**
	 * Mark event as failed
	 * Updates the status for debugging/monitoring purposes
	 */
	async markFailed(eventName: string, payload: unknown): Promise<void> {
		const idempotencyKey = this.generateIdempotencyKey(eventName, payload)

		try {
			const client = this.supabaseService.getAdminClient()
			const { error } = await client
				.from('processed_internal_events')
				.update({ status: 'failed', processed_at: new Date().toISOString() })
				.eq('event_name', eventName)
				.eq('idempotency_key', idempotencyKey)

			if (error) {
				this.logger.error('Failed to mark event as failed', {
					eventName,
					error
				})
			}
		} catch (error) {
			this.logger.error('Error marking event failed', { eventName, error })
		}
	}

	/**
	 * Wrapper method for idempotent event processing
	 *
	 * Acquires lock before processing, marks as processed after successful completion.
	 * Returns null if event was already processed (duplicate).
	 *
	 * @param eventName - The event name (e.g., 'maintenance.updated')
	 * @param payload - The event payload for idempotency key generation
	 * @param handler - The async handler function to execute
	 * @returns The handler result, or null if skipped (duplicate)
	 */
	async withIdempotency<T>(
		eventName: string,
		payload: unknown,
		handler: () => Promise<T>
	): Promise<T | null> {
		const lockAcquired = await this.acquireLock(eventName, payload)

		if (!lockAcquired) {
			this.logger.debug(`Skipping duplicate event: ${eventName}`)
			return null
		}

		try {
			const result = await handler()
			await this.markProcessed(eventName, payload)
			return result
		} catch (error) {
			await this.markFailed(eventName, payload)
			this.logger.error(`Event handler failed: ${eventName}`, { error })
			throw error
		}
	}

	/**
	 * Scheduled cleanup of old events (30 days retention)
	 * Runs daily at midnight
	 */
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	@SentryCron('event-idempotency-cleanup', {
		schedule: { type: 'crontab', value: '0 0 * * *' },
		checkinMargin: 5,
		maxRuntime: 10,
		timezone: 'UTC'
	})
	async handleScheduledCleanup(): Promise<void> {
		try {
			const client = this.supabaseService.getAdminClient()
			const { data, error } = await client.rpc('cleanup_old_internal_events', {
				days_to_keep: 30
			})

			if (error) {
				this.logger.error('Scheduled cleanup failed', { error })
				return
			}

			this.logger.log(`Cleaned up ${data || 0} old internal events`)
		} catch (error) {
			this.logger.error('Scheduled cleanup failed', { error })
		}
	}

	/**
	 * Get event processing statistics for monitoring
	 */
	async getStatistics(): Promise<{
		totalEvents: number
		todayEvents: number
		byStatus: Record<string, number>
		byEventName: Record<string, number>
	}> {
		try {
			const client = this.supabaseService.getAdminClient()

			const now = new Date()
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate()
			)

			// Get total count
			const { count: totalEvents } = await client
				.from('processed_internal_events')
				.select('*', { count: 'exact', head: true })

			// Get today's count
			const { count: todayEvents } = await client
				.from('processed_internal_events')
				.select('*', { count: 'exact', head: true })
				.gte('created_at', todayStart.toISOString())

			// Get counts by status
			const { data: statusData } = await client
				.from('processed_internal_events')
				.select('status')

			const byStatus: Record<string, number> = {}
			if (statusData) {
				statusData.forEach(row => {
					const status = row.status || 'unknown'
					byStatus[status] = (byStatus[status] || 0) + 1
				})
			}

			// Get counts by event name
			const { data: eventNameData } = await client
				.from('processed_internal_events')
				.select('event_name')

			const byEventName: Record<string, number> = {}
			if (eventNameData) {
				eventNameData.forEach(row => {
					const name = row.event_name
					byEventName[name] = (byEventName[name] || 0) + 1
				})
			}

			return {
				totalEvents: totalEvents || 0,
				todayEvents: todayEvents || 0,
				byStatus,
				byEventName
			}
		} catch (error) {
			this.logger.error('Error getting event statistics', { error })
			throw error
		}
	}
}
