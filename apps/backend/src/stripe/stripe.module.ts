import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StripeService } from './stripe.service'
import { SubscriptionService } from './subscription.service'
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
	imports: [ConfigModule, PrismaModule],
	controllers: [WebhookController],
	providers: [StripeService, SubscriptionService, WebhookService],
	exports: [StripeService, SubscriptionService]
})
export class StripeModule {}