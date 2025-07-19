import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from 'nestjs-prisma'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'
import { StripeModule } from '../stripe/stripe.module'

@Module({
	imports: [ConfigModule, PrismaModule, forwardRef(() => StripeModule)],
	controllers: [SubscriptionsController],
	providers: [
		SubscriptionsService,
	],
	exports: [
		SubscriptionsService,
	]
})
export class SubscriptionsModule {}
