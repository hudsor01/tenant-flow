import { Module, forwardRef } from '@nestjs/common'
import { BillingController } from './billing.controller'
import { StripeModule } from '../stripe/stripe.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ErrorModule } from '../common/errors/error.module'
import { MeasureLoadTime } from '../common/performance/performance.decorators'

@MeasureLoadTime('BillingModule')
@Module({
  imports: [
    StripeModule, // StripeModule exports StripeBillingService
    forwardRef(() => SubscriptionsModule), // Prevent circular dependency
    ErrorModule // Consolidated error handling with GlobalExceptionFilter
  ],
  controllers: [BillingController],
  providers: [],
  exports: []
})
export class BillingModule {
  // Remove static logger and constructor to improve load time
}