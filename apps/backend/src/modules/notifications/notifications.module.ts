import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { FailedNotificationsService } from './failed-notifications.service'

/**
 * ULTRA-NATIVE Notifications Module
 * No service layer - controllers use Supabase directly
 */
@Module({
	imports: [SupabaseModule],
	controllers: [NotificationsController],
	providers: [NotificationsService, FailedNotificationsService],
	exports: [NotificationsService, FailedNotificationsService]
})
export class NotificationsModule {}
