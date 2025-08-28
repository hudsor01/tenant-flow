import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { WebhookController } from './webhook.controller'

/**
 * WebhooksModule - Handles all external webhook endpoints
 * Currently supports: Stripe payment webhooks
 */
@Module({
	imports: [ConfigModule],
	controllers: [WebhookController]
})
export class WebhooksModule {}
