import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import type { LeaseExpiringEvent } from '../events/notification.events'
import { NotificationService } from '../notification.service'
import { EventIdempotencyService } from '../../../shared/services/event-idempotency.service'
import { AppLogger } from '../../../logger/app-logger.service'
import {
	calculateNotificationTypes,
	formatNotificationTitle,
	formatNotificationMessage
} from '@repo/shared/utils/lease-expiry-calculator'

/**
 * Lease Expiry Notification Listener
 * Listens for LeaseExpiringEvent and creates appropriate notifications
 * for property owners based on days until lease expiry (30/60/90 day warnings)
 */
@Injectable()
export class LeaseExpiryNotificationListener {
	constructor(private readonly notificationService: NotificationService,
		private readonly idempotency: EventIdempotencyService, private readonly logger: AppLogger) {}

	/**
	 * Handle lease expiring event
	 * Emitted when a lease is created or updated with an end_date
	 * Creates notifications for 30/60/90 day expiry warnings
	 */
	@OnEvent('lease.expiring')
	async handleLeaseExpiring(event: LeaseExpiringEvent): Promise<void> {
		await this.idempotency.withIdempotency('lease.expiring.listener', event, async () => {
			try {
				this.logger.log('Processing lease expiring event', {
					user_id: event.user_id,
					expirationDate: event.expirationDate,
					daysUntilExpiry: event.daysUntilExpiry,
					tenantName: event.tenantName
				})

				// Calculate which notification types are needed
				const notificationTypes = calculateNotificationTypes(
					event.daysUntilExpiry
				)

				// No notifications needed if not in any warning window
				if (notificationTypes.length === 0) {
					this.logger.debug(
						'Lease not in notification window - no notifications created',
						{
							daysUntilExpiry: event.daysUntilExpiry,
							expirationDate: event.expirationDate
						}
					)
					return
				}

				// ⚠️ N+1 QUERY ANTI-PATTERN - IDEMPOTENCY CHECK
				// ═══════════════════════════════════════════════════════════════════════════
				//
				// PROBLEM: This executes N database queries for N notification types (typically 1-3).
				// While small N here, this pattern is problematic for cron jobs processing many leases.
				//
				// CURRENT BEHAVIOR (O(n) queries per lease):
				//   for each notificationType:
				//     SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = ?
				//   Total: N queries × M leases = N×M queries per cron run
				//
				// RECOMMENDED FIX (O(1) queries per lease):
				//   const { data: existingTypes } = await client
				//     .from('notifications')
				//     .select('type')
				//     .eq('user_id', event.user_id)
				//     .in('type', notificationTypes)
				//   const existingSet = new Set(existingTypes.map(n => n.type))
				//   // Then filter: notificationTypes.filter(t => !existingSet.has(t))
				//   Total: 1 query per lease regardless of notification type count
				//
				// IMPACT: For daily cron processing 100 leases with 3 notification types each:
				//   Current: 300 queries
				//   Optimized: 100 queries (3x reduction)
				//
				// ADDITIONAL CONCERN - RACE CONDITION:
				//   Between checking existsLeaseNotification() and creating the notification,
				//   another process could create the same notification. The batch approach
				//   with a unique constraint on (user_id, type, lease_id) would be safer.
				//
				// ═══════════════════════════════════════════════════════════════════════════
				// Check for existing notifications concurrently (idempotency)
				const existenceChecks = await Promise.all(
					notificationTypes.map(async notificationType => ({
						type: notificationType,
						exists: await this.notificationService.existsLeaseNotification(
							event.user_id,
							notificationType
						)
					}))
				)
				const existingNotifications: Record<string, boolean> = {}
				for (const { type, exists } of existenceChecks) {
					existingNotifications[type] = exists
				}

				// Filter out notification types that already exist
				const notificationsToCreate = notificationTypes
					.filter(
						notificationType =>
							!existingNotifications[notificationType]
					)
					.map(notificationType => {
						const title = formatNotificationTitle(notificationType)
						const message = formatNotificationMessage(
							event.tenantName,
							event.propertyName,
							event.unit_number,
							event.expirationDate
						)

						return {
							user_id: event.user_id,
							type: notificationType,
							title,
							message,
							priority: 'high' as const,
							data: {
								tenantName: event.tenantName,
								propertyName: event.propertyName,
								unitNumber: event.unit_number,
								expirationDate: event.expirationDate,
								daysUntilExpiry: event.daysUntilExpiry
							}
						}
					})

				// Create notifications
				await this.notificationService.createBulkNotifications(
					notificationsToCreate
				)

				this.logger.log('Lease expiry notifications created', {
					user_id: event.user_id,
					count: notificationsToCreate.length,
					types: notificationTypes
				})
			} catch (error) {
				this.logger.error('Failed to create lease expiry notifications', {
					error: error instanceof Error ? error.message : String(error),
					stack:
						error instanceof Error
							? error.stack?.split('\n').slice(0, 3).join('\n')
							: undefined,
					event: {
						user_id: event.user_id,
						expirationDate: event.expirationDate
					}
				})
				// Don't throw - notification failures should not break lease operations
			}
		})
	}
}