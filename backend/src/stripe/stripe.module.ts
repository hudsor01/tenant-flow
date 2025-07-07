import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UsersModule } from '../users/users.module'
import { SubscriptionController } from './controllers/subscription.controller'
import { PortalController } from './controllers/portal.controller'
import { WebhookController } from './controllers/webhook.controller'
import { SubscriptionService } from './services/subscription.service'
import { PortalService } from './services/portal.service'
import { WebhookService } from './services/webhook.service'
import { StripeService } from './services/stripe.service'
import { SupabaseService } from './services/supabase.service'

@Module({
	imports: [ConfigModule, UsersModule],
	controllers: [SubscriptionController, PortalController, WebhookController],
	providers: [
		SubscriptionService,
		PortalService,
		WebhookService,
		StripeService,
		SupabaseService,
	],
	exports: [
		SubscriptionService,
		PortalService,
		WebhookService,
		StripeService,
		SupabaseService,
	],
})
export class StripeModule {}