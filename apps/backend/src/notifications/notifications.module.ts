import { Module } from '@nestjs/common'
import { SubscriptionNotificationService } from './subscription-notification.service'
import { SubscriptionEventListener } from './subscription-event.listener'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { EmailModule } from '../email/email.module'

@Module({
	imports: [SupabaseModule, EmailModule],
	providers: [SubscriptionNotificationService, SubscriptionEventListener],
	exports: [SubscriptionNotificationService]
})
export class NotificationsModule {}
