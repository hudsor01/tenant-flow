/**
 * Shared Services Module
 *
 * Provides utility services that replace database functions
 * These services are available globally across the application
 */

import { Global, Module } from '@nestjs/common'
import { UtilityService } from './utility.service'
import { AuthRequestCache } from './auth-request-cache.service'
import { EventIdempotencyService } from './event-idempotency.service'
import { N8nCronWebhookController } from '../controllers/n8n-cron-webhook.controller'

/**
 * N8N Cron Mode: When enabled, exposes HTTP endpoints for n8n to trigger
 * scheduled jobs instead of using @nestjs/schedule decorators.
 */
const N8N_CRON_MODE_ENABLED = process.env.N8N_CRON_MODE === 'true'

@Global()
@Module({
	imports: [],
	controllers: [...(N8N_CRON_MODE_ENABLED ? [N8nCronWebhookController] : [])],
	providers: [UtilityService, AuthRequestCache, EventIdempotencyService],
	exports: [UtilityService, AuthRequestCache, EventIdempotencyService]
})
export class ServicesModule {}
