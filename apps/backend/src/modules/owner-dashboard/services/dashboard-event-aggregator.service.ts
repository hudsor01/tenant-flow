/**
 * Dashboard Event Aggregator Service
 *
 * Listens for internal events (payments, maintenance, leases) and broadcasts
 * aggregated SSE notifications to owners. Uses debouncing to batch rapid events
 * within a 5-second window.
 *
 * @module OwnerDashboard
 */

import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SseService } from '../../notifications/sse/sse.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { SSE_EVENT_TYPES, type DashboardStatsUpdatedEvent } from '@repo/shared/events/sse-events'

type DashboardCategory = 'revenue' | 'occupancy' | 'maintenance' | 'payments'

interface PendingUpdate {
	ownerId: string
	categories: Set<DashboardCategory>
	timer: NodeJS.Timeout
}

/**
 * Aggregates internal events and broadcasts dashboard update SSE notifications.
 * Debounces rapid events to prevent flooding clients with updates.
 */
@Injectable()
export class DashboardEventAggregatorService implements OnModuleDestroy {
	/**
	 * Pending updates per owner, keyed by ownerId
	 * Each owner has their own debounce timer
	 */
	private readonly pendingUpdates = new Map<string, PendingUpdate>()

	/**
	 * Debounce window in milliseconds (5 seconds)
	 */
	private readonly DEBOUNCE_MS = 5_000

	constructor(
		private readonly sseService: SseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Cleanup timers on module destroy
	 */
	onModuleDestroy(): void {
		for (const pending of this.pendingUpdates.values()) {
			clearTimeout(pending.timer)
		}
		this.pendingUpdates.clear()
	}

	/**
	 * Handle payment received event
	 */
	@OnEvent('payment.received')
	handlePaymentReceived(payload: { ownerId: string }): void {
		if (!payload.ownerId) return
		this.queueUpdate(payload.ownerId, ['revenue', 'payments'])
	}

	/**
	 * Handle payment failed event
	 */
	@OnEvent('payment.failed')
	handlePaymentFailed(payload: { ownerId: string }): void {
		if (!payload.ownerId) return
		this.queueUpdate(payload.ownerId, ['payments'])
	}

	/**
	 * Handle maintenance created event
	 */
	@OnEvent('maintenance.created')
	handleMaintenanceCreated(payload: { ownerId: string }): void {
		if (!payload.ownerId) return
		this.queueUpdate(payload.ownerId, ['maintenance'])
	}

	/**
	 * Handle maintenance updated event
	 */
	@OnEvent('maintenance.updated')
	handleMaintenanceUpdated(payload: { ownerId: string }): void {
		if (!payload.ownerId) return
		this.queueUpdate(payload.ownerId, ['maintenance'])
	}

	/**
	 * Handle lease activated event
	 */
	@OnEvent('lease.activated')
	handleLeaseActivated(payload: { ownerId: string }): void {
		if (!payload.ownerId) return
		this.queueUpdate(payload.ownerId, ['occupancy', 'revenue'])
	}

	/**
	 * Handle tenant created event (affects occupancy)
	 */
	@OnEvent('tenant.created')
	handleTenantCreated(payload: { ownerId: string }): void {
		if (!payload.ownerId) return
		this.queueUpdate(payload.ownerId, ['occupancy'])
	}

	/**
	 * Handle subscription created event (subscription billing active)
	 */
	@OnEvent('lease.subscription_created')
	handleSubscriptionCreated(payload: { ownerId: string }): void {
		if (!payload.ownerId) return
		this.queueUpdate(payload.ownerId, ['revenue'])
	}

	/**
	 * Queue an update for a specific owner with affected categories.
	 * Uses debouncing to batch rapid events.
	 */
	private queueUpdate(ownerId: string, categories: DashboardCategory[]): void {
		const existing = this.pendingUpdates.get(ownerId)

		if (existing) {
			// Add new categories to existing pending update
			for (const category of categories) {
				existing.categories.add(category)
			}
			// Timer already running, no need to reset
			this.logger.debug('Dashboard update queued (batched)', {
				context: 'DashboardEventAggregator',
				ownerId,
				categories: Array.from(existing.categories)
			})
		} else {
			// Create new pending update with timer
			const categorySet = new Set<DashboardCategory>(categories)
			const timer = setTimeout(() => {
				this.flushUpdate(ownerId)
			}, this.DEBOUNCE_MS)

			this.pendingUpdates.set(ownerId, {
				ownerId,
				categories: categorySet,
				timer
			})

			this.logger.debug('Dashboard update queued (new)', {
				context: 'DashboardEventAggregator',
				ownerId,
				categories
			})
		}
	}

	/**
	 * Flush pending update for an owner - broadcasts SSE event
	 */
	private async flushUpdate(ownerId: string): Promise<void> {
		const pending = this.pendingUpdates.get(ownerId)
		if (!pending) return

		// Remove from pending map
		this.pendingUpdates.delete(ownerId)
		clearTimeout(pending.timer)

		// Check if user is connected before broadcasting
		if (!this.sseService.isUserConnected(ownerId)) {
			this.logger.debug('Skipping dashboard SSE broadcast (user not connected)', {
				context: 'DashboardEventAggregator',
				ownerId
			})
			return
		}

		// Build and send SSE event
		const event: DashboardStatsUpdatedEvent = {
			type: SSE_EVENT_TYPES.DASHBOARD_STATS_UPDATED,
			timestamp: new Date().toISOString(),
			payload: {
				affectedCategories: Array.from(pending.categories)
			}
		}

		try {
			await this.sseService.broadcast(ownerId, event)
			this.logger.log('Dashboard SSE broadcast sent', {
				context: 'DashboardEventAggregator',
				ownerId,
				categories: event.payload.affectedCategories
			})
		} catch (error) {
			this.logger.error('Failed to broadcast dashboard SSE event', {
				context: 'DashboardEventAggregator',
				ownerId,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}
}
