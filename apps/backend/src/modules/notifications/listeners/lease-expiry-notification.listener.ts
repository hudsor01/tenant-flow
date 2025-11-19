import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { LeaseExpiringEvent } from '../events/notification.events'
import { NotificationService } from '../notification.service'
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
	private readonly logger = new Logger(
		LeaseExpiryNotificationListener.name
	)

	constructor(
		private readonly notificationService: NotificationService
	) {}

	/**
	 * Handle lease expiring event
	 * Emitted when a lease is created or updated with an end_date
	 * Creates notifications for 30/60/90 day expiry warnings
	 */
	@OnEvent('lease.expiring')
	async handleLeaseExpiring(event: LeaseExpiringEvent): Promise<void> {
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

			// Check for existing notifications (idempotency)
			const existingNotifications: Record<string, boolean> = {}
			for (const notificationType of notificationTypes) {
				existingNotifications[notificationType] =
					await this.notificationService.existsLeaseNotification(
						event.user_id,
						notificationType
					)
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
	}
}
