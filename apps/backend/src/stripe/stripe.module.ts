import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from 'nestjs-prisma'
import { UsersModule } from '../users/users.module'
import { PortalController } from './controllers/portal.controller'
import { WebhookController } from './controllers/webhook.controller'
import { PortalService } from './services/portal.service'
import { WebhookService } from './services/webhook.service'
import { StripeService } from './services/stripe.service'
import { SupabaseService } from './services/supabase.service'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

@Module({
	imports: [
		ConfigModule, 
		PrismaModule,
		UsersModule,
		forwardRef(() => SubscriptionsModule)
	],
	controllers: [PortalController, WebhookController],
	providers: [
		StripeService,
		PortalService,
		WebhookService,
		SupabaseService,
	],
	exports: [
		StripeService,
		PortalService,
		WebhookService,
		SupabaseService,
	],
})
export class StripeModule {}