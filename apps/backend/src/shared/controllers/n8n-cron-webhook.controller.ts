/**
 * N8N Cron Webhook Controller
 *
 * Provides HTTP endpoints for n8n scheduled workflows to trigger cron jobs,
 * bypassing @nestjs/schedule decorators. This allows n8n to handle:
 * - Cron scheduling with visual configuration
 * - Retry logic and error handling
 * - Centralized logging and monitoring
 * - Easy schedule changes without code deployment
 *
 * Security: Protected by a shared secret in the x-n8n-webhook-secret header.
 *
 * Endpoints:
 * - POST /webhooks/n8n/cron/cleanup-events - Daily event cleanup (midnight)
 * - POST /webhooks/n8n/cron/payment-reminders - Daily payment reminders (9 AM)
 * - POST /webhooks/n8n/cron/lease-expiry-check - Daily lease expiry check (9 AM)
 * - POST /webhooks/n8n/cron/subscription-retry - Retry failed subscriptions (every 5 min)
 */

import {
	Controller,
	Headers,
	HttpCode,
	HttpStatus,
	Inject,
	Post,
	UnauthorizedException,
	forwardRef
} from '@nestjs/common'
import { AppLogger } from '../../logger/app-logger.service'
import { EventIdempotencyService } from '../services/event-idempotency.service'

// Forward references for lazy loading - these services are in different modules
// We use dynamic imports to avoid circular dependencies
interface CronJobResult {
	success: boolean
	message: string
	stats?: Record<string, unknown>
}

@Controller('webhooks/n8n/cron')
export class N8nCronWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly logger: AppLogger,
		@Inject(forwardRef(() => EventIdempotencyService))
		private readonly eventIdempotencyService: EventIdempotencyService
	) {
		this.webhookSecret = process.env.N8N_WEBHOOK_SECRET
	}

	private validateWebhookSecret(secret: string | undefined): void {
		// Skip validation if no secret is configured (development mode)
		if (!this.webhookSecret) {
			this.logger.warn(
				'N8N_WEBHOOK_SECRET not configured - webhook authentication disabled'
			)
			return
		}

		if (secret !== this.webhookSecret) {
			throw new UnauthorizedException('Invalid webhook secret')
		}
	}

	/**
	 * Cleanup old internal events
	 * Recommended schedule: Daily at midnight
	 */
	@Post('cleanup-events')
	@HttpCode(HttpStatus.OK)
	async handleCleanupEvents(
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<CronJobResult> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Cron] Received cleanup-events request')

		try {
			await this.eventIdempotencyService.handleScheduledCleanup()
			return {
				success: true,
				message: 'Event cleanup completed successfully'
			}
		} catch (error) {
			this.logger.error('[N8N Cron] Failed to cleanup events', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}
