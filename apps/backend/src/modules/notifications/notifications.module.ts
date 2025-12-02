import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { NotificationsController } from './notifications.controller'
import { NotificationService } from './notification.service'
import { NotificationQueryService } from './notification-query.service'
import { NotificationEventHandlerService } from './notification-event-handler.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { LeaseExpiryNotificationListener } from './listeners/lease-expiry-notification.listener'

/**
 * Notifications Module
 * Services:
 * - NotificationService: Core notification operations
 * - NotificationQueryService: CRUD operations and queries
 * - NotificationEventHandlerService: @OnEvent handlers
 * - FailedNotificationsService: Retry logic for failed notifications
 */
@Module({
	imports: [SupabaseModule, EmailModule],
	controllers: [NotificationsController],
	providers: [
		NotificationService,
		NotificationQueryService,
		NotificationEventHandlerService,
		FailedNotificationsService,
		LeaseExpiryNotificationListener
	],
	exports: [
		NotificationService,
		NotificationQueryService,
		NotificationEventHandlerService,
		FailedNotificationsService
	]
})
export class NotificationsModule {}
