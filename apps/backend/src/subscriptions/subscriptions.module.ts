import { Module, forwardRef } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'
import { StripeModule } from '../stripe/stripe.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
	imports: [
		PrismaModule,
		forwardRef(() => StripeModule)
	],
	controllers: [SubscriptionsController],
	providers: [SubscriptionsService],
	exports: [SubscriptionsService]
})
export class SubscriptionsModule {}