import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StripeService } from './stripe.service'
import { StripeDBService } from './stripe-db.service'
import { StripeSubscriptionService } from './stripe-subscription.service';
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
	imports: [PrismaModule],
	controllers: [WebhookController],
	providers: [StripeService, StripeDBService, StripeSubscriptionService, WebhookService, ConfigService],
	exports: [StripeService, StripeDBService, StripeSubscriptionService]
})
export class StripeModule {}