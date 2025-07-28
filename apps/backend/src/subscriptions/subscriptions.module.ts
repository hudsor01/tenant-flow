import { Module, forwardRef } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsManagerService } from './subscriptions-manager.service';
import { StripeModule } from '../stripe/stripe.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
	imports: [
		PrismaModule,
		forwardRef(() => StripeModule)
	],
	controllers: [SubscriptionsController],
	providers: [SubscriptionsManagerService],
	exports: [SubscriptionsManagerService]
})
export class SubscriptionsModule {}