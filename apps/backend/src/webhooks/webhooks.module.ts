import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { UnifiedWebhookController } from './webhook.controller'

/**
 * WebhooksModule - Handles all external webhook endpoints
 * Currently supports: Stripe payment webhooks
 */
@Module({
	imports: [ConfigModule],
	controllers: [UnifiedWebhookController]
})
export class WebhooksModule {}
