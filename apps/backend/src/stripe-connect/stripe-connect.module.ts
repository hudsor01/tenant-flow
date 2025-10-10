import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { StripeConnectController } from './stripe-connect.controller'
import { StripeConnectService } from './stripe-connect.service'

@Module({
	imports: [SupabaseModule],
	controllers: [StripeConnectController],
	providers: [StripeConnectService],
	exports: [StripeConnectService]
})
export class StripeConnectModule {}
