import { Module } from '@nestjs/common'
import { SupabaseHelpersModule } from '../../shared/supabase/supabase-helpers.module'
import { StripeModule } from '../billing/stripe.module'
import { RentPaymentsController } from './rent-payments.controller'
import { RentPaymentsService } from './rent-payments.service'

@Module({
	imports: [StripeModule, SupabaseHelpersModule],
	controllers: [RentPaymentsController],
	providers: [RentPaymentsService],
	exports: [RentPaymentsService]
})
export class RentPaymentsModule {}
