import { Module } from '@nestjs/common'
import { BillingController } from './billing.controller'
import { StripeModule } from '../stripe/stripe.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ErrorHandlerModule } from '../common/errors/error-handler.module'

@Module({
  imports: [
    StripeModule,
    SubscriptionsModule,
    ErrorHandlerModule
  ],
  controllers: [BillingController],
  exports: []
})
export class BillingModule {}