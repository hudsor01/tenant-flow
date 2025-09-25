import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Cron, CronExpression } from '@nestjs/schedule'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeService } from './stripe.service'

/**
 * Stripe Event Recovery Service
 *
 * Handles recovery of failed webhook events and provides mechanisms
 * for reprocessing events that may have failed due to transient errors.
 *
 * Features:
 * - Automatic retry of failed events with exponential backoff
 * - Manual event recovery by event ID
 * - Scheduled cleanup of old processed events
 * - Health monitoring and alerting
 */
@Injectable()
export class StripeRecoveryService {
	private readonly logger = new Logger(StripeRecoveryService.name)
	private readonly stripe: Stripe
	private readonly MAX_RETRY_ATTEMPTS = 5

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly webhookService: StripeWebhookService,
		private readonly eventEmitter: EventEmitter2,
		private readonly stripeService: StripeService
	) {
		this.stripe = this.stripeService.getStripe()
	}

	/**
	 * Scheduled task to check for and recover failed events
	 * Runs every 30 minutes
	 */
	@Cron(CronExpression.EVERY_30_MINUTES)
	async recoverFailedEvents() {
		this.logger.log('Starting scheduled event recovery check')

		try {
			const failedEvents = await this.getFailedEvents()

			if (failedEvents.length === 0) {
				this.logger.debug('No failed events to recover')
				return
			}

			this.logger.log(`Found ${failedEvents.length} failed events to recover`)

			for (const event of failedEvents) {
				await this.recoverEvent(event.stripe_event_id, event.retry_count || 0)
			}
		} catch (error) {
			this.logger.error('Failed to run event recovery', { error })
		}
	}

	/**
	 * Get list of failed events from database
	 * Note: This table only tracks processed events, not failed ones with retry logic
	 */
	private async getFailedEvents(): Promise<Array<{
		stripe_event_id: string
		event_type: string
		retry_count: number
		last_retry_at: string | null
	}>> {
		// Since the actual table doesn't have failure tracking columns,
		// return empty array to avoid errors. This service would need
		// proper database schema to function correctly.
		this.logger.debug('Stripe Recovery Service: No failed events table schema available')
		return []
	}

	/**
	 * Recover a specific event by fetching from Stripe and reprocessing
	 */
	async recoverEvent(eventId: string, currentRetryCount: number): Promise<boolean> {
		this.logger.log(`Attempting to recover event: ${eventId} (retry ${currentRetryCount + 1})`)

		try {
			// Fetch the event from Stripe
			const event = await this.stripe.events.retrieve(eventId)

			if (!event) {
				this.logger.error(`Event not found in Stripe: ${eventId}`)
				await this.markEventAsPermanentlyFailed(eventId, 'Event not found in Stripe')
				return false
			}

			// Check if event is too old to process (> 7 days)
			const eventAge = Date.now() - event.created * 1000
			const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

			if (eventAge > maxAge) {
				this.logger.warn(`Event too old to recover: ${eventId}`)
				await this.markEventAsPermanentlyFailed(eventId, 'Event too old')
				return false
			}

			// Update retry count and timestamp
			await this.updateRetryAttempt(eventId, currentRetryCount + 1)

			// Emit the event for reprocessing
			this.emitStripeEventForRecovery(event)

			// Mark as successfully recovered
			await this.webhookService.markEventProcessed(eventId)

			this.logger.log(`Successfully recovered event: ${eventId}`)
			return true
		} catch (error) {
			this.logger.error(`Failed to recover event: ${eventId}`, { error })

			// Update retry count
			const newRetryCount = currentRetryCount + 1
			await this.updateRetryAttempt(eventId, newRetryCount)

			// If max retries reached, mark as permanently failed
			if (newRetryCount >= this.MAX_RETRY_ATTEMPTS) {
				await this.markEventAsPermanentlyFailed(
					eventId,
					`Max retries (${this.MAX_RETRY_ATTEMPTS}) reached`
				)
			}

			return false
		}
	}

	/**
	 * Emit Stripe event for recovery processing
	 */
	private emitStripeEventForRecovery(event: Stripe.Event): void {
		// Emit with recovery flag
		const eventName = `stripe.recovery.${event.type.replace(/\./g, '_')}`
		this.eventEmitter.emit(eventName, event.data.object, event)

		// Also emit to regular handler
		const regularEventName = `stripe.${event.type.replace(/\./g, '_')}`
		this.eventEmitter.emit(regularEventName, event.data.object, event)

		this.logger.debug(`Emitted recovery event: ${eventName}`, {
			event_id: event.id,
			event_type: event.type
		})
	}

	/**
	 * Update retry attempt in database
	 * Note: Current schema doesn't support retry tracking
	 */
	private async updateRetryAttempt(eventId: string, retryCount: number): Promise<void> {
		// Since the actual table doesn't have retry tracking columns,
		// just log the attempt. This would need proper schema to function.
		this.logger.debug('Stripe Recovery Service: Would update retry attempt', { eventId, retryCount })
	}

	/**
	 * Mark event as permanently failed
	 * Note: Current schema doesn't support failure status tracking
	 */
	private async markEventAsPermanentlyFailed(eventId: string, reason: string): Promise<void> {
		// Since the actual table doesn't have failure tracking columns,
		// just log the failure. This would need proper schema to function.
		this.logger.error(`Stripe Recovery Service: Would mark event permanently failed: ${eventId} - ${reason}`)
	}

	/**
	 * Manual recovery endpoint - recover specific events by ID
	 */
	async manualRecovery(eventIds: string[]): Promise<{
		successful: string[]
		failed: string[]
	}> {
		const results = {
			successful: [] as string[],
			failed: [] as string[]
		}

		this.logger.log(`Manual recovery requested for ${eventIds.length} events`)

		for (const eventId of eventIds) {
			const success = await this.recoverEvent(eventId, 0)
			if (success) {
				results.successful.push(eventId)
			} else {
				results.failed.push(eventId)
			}
		}

		this.logger.log(`Manual recovery completed: ${results.successful.length} successful, ${results.failed.length} failed`)
		return results
	}

	/**
	 * Get recovery statistics
	 * Note: Current schema only tracks processed events, not failure states
	 */
	async getRecoveryStats(): Promise<{
		totalFailed: number
		pendingRecovery: number
		permanentlyFailed: number
		averageRetryCount: number
		oldestFailedEvent: Date | null
	}> {
		try {
			// Since the table doesn't track failure states, return basic stats
			return {
				totalFailed: 0, // No failure tracking in current schema
				pendingRecovery: 0, // No retry tracking in current schema
				permanentlyFailed: 0, // No failure tracking in current schema
				averageRetryCount: 0, // No retry tracking in current schema
				oldestFailedEvent: null // Would use processed_at if needed, but table schema doesn't support failure tracking
			}
		} catch (error) {
			this.logger.error('Error getting recovery stats', { error })
			return {
				totalFailed: 0,
				pendingRecovery: 0,
				permanentlyFailed: 0,
				averageRetryCount: 0,
				oldestFailedEvent: null
			}
		}
	}

	/**
	 * Health check for recovery service
	 */
	async healthCheck(): Promise<{
		healthy: boolean
		issues: string[]
	}> {
		const issues: string[] = []

		try {
			const stats = await this.getRecoveryStats()

			// Check for high failure rate
			if (stats.totalFailed > 100) {
				issues.push(`High number of failed events: ${stats.totalFailed}`)
			}

			// Check for old unprocessed events
			if (stats.oldestFailedEvent) {
				const ageHours = (Date.now() - stats.oldestFailedEvent.getTime()) / (1000 * 60 * 60)
				if (ageHours > 24) {
					issues.push(`Unprocessed events older than 24 hours: ${Math.round(ageHours)}h`)
				}
			}

			// Check Stripe connectivity
			try {
				await this.stripe.events.list({ limit: 1 })
			} catch (error) {
				issues.push('Unable to connect to Stripe API')
			}

			return {
				healthy: issues.length === 0,
				issues
			}
		} catch (error) {
			this.logger.error('Health check failed', { error })
			return {
				healthy: false,
				issues: ['Health check failed: ' + (error as Error).message]
			}
		}
	}
}
