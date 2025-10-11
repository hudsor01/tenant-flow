import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { NotificationsController } from './notifications.controller'

/**
 * ULTRA-NATIVE Notifications Module
 * No service layer - controllers use Supabase directly
 */
@Module({
	imports: [SupabaseModule],
	controllers: [NotificationsController],
	providers: [],
	exports: []
})
export class NotificationsModule {}
