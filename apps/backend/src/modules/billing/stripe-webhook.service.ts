/**
 * Stripe Webhook Service - Database-backed idempotency and event tracking
 *
 * Uses the webhook_events table for persistent idempotency
 * following Stripe's official best practices for webhook processing.
 *
 * Related services:
 * - StripeEventCleanupService: Scheduled cleanup of old events
 * - StripeEventStatisticsService: Monitoring and statistics
 */

import { Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import type { Json } from '@repo/shared/types/supabase'

@Injectable()
export class StripeWebhookService {
	private static readonly WEBHOOK_SOURCE = 'stripe'

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Type predicate to check if an object has lock_acquired property set to true
	 */
	private isObjectWithLockAcquired(value: unknown): value is { lock_acquired: true } {
		return (
			value !== null &&
			value !== undefined &&
			typeof value === 'object' &&
			'lock_acquired' in value &&
			(value as { lock_acquired?: unknown }).lock_acquired === true
		)
	}

	/**
	 * Check if an event has already been processed
	 * Uses database for persistent idempotency across service restarts
	 */
	async isEventProcessed(eventId: string): Promise<boolean> {
		try {
			const client = this.supabaseService.getAdminClient()

			const { data, error } = await client
				.from('webhook_events')
				.select('id')
				.eq('webhook_source', StripeWebhookService.WEBHOOK_SOURCE)
				.eq('external_id', eventId)
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
		eventType: string,
		rawPayload: { [key: string]: Json | undefined } = {}
	): Promise<boolean> {
		try {
			const client = this.supabaseService.getAdminClient()

			// SECURITY FIX #5: Use RPC-backed lock to avoid race windows
			const { data, error } = await client.rpc('acquire_webhook_event_lock_with_id', {
				p_webhook_source: StripeWebhookService.WEBHOOK_SOURCE,
				p_external_id: eventId,
				p_event_type: eventType,
				p_raw_payload: rawPayload
			})

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
					warning: 'Check if acquire_webhook_event_lock_with_id function exists'
				})
				return false
			}

			const rows = Array.isArray(data) ? data : [data]
			const lockAcquired = rows.some(row => this.isObjectWithLockAcquired(row))

			if (!lockAcquired) {
				this.logger.debug(`Event ${eventId} already being processed by another request`, {
					eventId,
					eventType
				})
				return false
			}

			this.logger.debug(`Successfully acquired lock for event ${eventId}`, {
				eventId,
				eventType
			})
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
				.from('webhook_events')
				.update({
					processed_at: new Date().toISOString(),
					status: 'processed'
				})
				.eq('webhook_source', StripeWebhookService.WEBHOOK_SOURCE)
				.eq('external_id', eventId)

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
}
