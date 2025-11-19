import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { NotificationsController } from './notifications.controller'
import { NotificationService } from './notification.service'
import { NotificationsService } from './notifications.service'
import { FailedNotificationsService } from './failed-notifications.service'
import { LeaseExpiryNotificationListener } from './listeners/lease-expiry-notification.listener'

/**
 * ULTRA-NATIVE Notifications Module
 * No service layer - controllers use Supabase directly
 */
@Module({
	imports: [SupabaseModule],
	controllers: [NotificationsController],
	providers: [
		NotificationService,
		NotificationsService,
		FailedNotificationsService,
		LeaseExpiryNotificationListener
	],
	exports: [NotificationService, NotificationsService, FailedNotificationsService]
})
export class NotificationsModule {}
