import { Module } from '@nestjs/common'
import { StripeController } from './stripe.controller'
import { StripeModule as BillingStripeModule } from '../billing/stripe.module'

@Module({
  imports: [BillingStripeModule],
  controllers: [StripeController],
  exports: []
})
export class StripeModule {}