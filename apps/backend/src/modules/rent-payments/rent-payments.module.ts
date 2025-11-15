import { Module } from '@nestjs/common'
import { StripeModule } from '../billing/stripe.module'
import { RentPaymentsController } from './rent-payments.controller'
import { RentPaymentsService } from './rent-payments.service'

@Module({
	imports: [StripeModule],
	controllers: [RentPaymentsController],
	providers: [RentPaymentsService],
	exports: [RentPaymentsService]
})
export class RentPaymentsModule {}
