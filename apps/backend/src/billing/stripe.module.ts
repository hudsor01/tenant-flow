import { Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { PaymentNotificationService } from './payment-notification.service'
import { SupabaseModule } from '../database/supabase.module'
import { EmailModule } from '../email/email.module'

@Module({
	imports: [SupabaseModule, EmailModule],
	providers: [StripeService, PaymentNotificationService],
	exports: [StripeService, PaymentNotificationService]
})
export class StripeModule {}
