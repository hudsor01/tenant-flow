import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { SupabaseModule } from '../database/supabase.module'

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
