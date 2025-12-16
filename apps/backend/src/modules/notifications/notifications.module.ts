import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { NotificationsController } from './notifications.controller'
import { NotificationSettingsController } from './notification-settings.controller'
import { NotificationService } from './notification.service'
import { NotificationEventHandlerService } from './notification-event-handler.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { LeaseExpiryNotificationListener } from './listeners/lease-expiry-notification.listener'

/**
 * Notifications Module
 * Services:
 * - NotificationService: Core notification operations (event-driven creation)
 * - NotificationEventHandlerService: @OnEvent handlers
 * - FailedNotificationsService: Retry logic for failed notifications
 * Controller handles CRUD with direct Supabase + RLS
 */
@Module({
	imports: [SupabaseModule, EmailModule],
	controllers: [NotificationsController, NotificationSettingsController],
	providers: [
		NotificationService,
		NotificationEventHandlerService,
		FailedNotificationsService,
		LeaseExpiryNotificationListener
	],
	exports: [
		NotificationService,
		NotificationEventHandlerService,
		FailedNotificationsService
	]
})
export class NotificationsModule {}
