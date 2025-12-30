/**
 * N8N Lease Cron Webhook Controller
 *
 * HTTP endpoints for n8n to trigger lease-related cron jobs.
 * Replaces @Cron decorators when N8N_CRON_MODE is enabled.
 *
 * Endpoints:
 * - POST /webhooks/n8n/cron/lease-expiry-check - Daily at 9 AM
 * - POST /webhooks/n8n/cron/subscription-retry - Every 5 minutes
 */

import {
	Controller,
	Headers,
	HttpCode,
	HttpStatus,
	Post,
	UnauthorizedException
} from '@nestjs/common'
import { AppLogger } from '../../logger/app-logger.service'
import { LeaseExpiryCheckerService } from './lease-expiry-checker.service'
import { SubscriptionRetryService } from './subscription-retry.service'

interface CronJobResult {
	success: boolean
	message: string
	stats?: Record<string, unknown>
}

@Controller('webhooks/n8n/cron')
export class N8nLeaseCronWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly leaseExpiryChecker: LeaseExpiryCheckerService,
		private readonly subscriptionRetry: SubscriptionRetryService,
		private readonly logger: AppLogger
	) {
		this.webhookSecret = process.env.N8N_WEBHOOK_SECRET
	}

	private validateWebhookSecret(secret: string | undefined): void {
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
	 * Check for expiring leases and send notifications
	 * Recommended schedule: Daily at 9 AM
	 */
	@Post('lease-expiry-check')
	@HttpCode(HttpStatus.OK)
	async handleLeaseExpiryCheck(
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<CronJobResult> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Cron] Received lease-expiry-check request')

		try {
			await this.leaseExpiryChecker.checkLeaseExpiries()
			return {
				success: true,
				message: 'Lease expiry check completed successfully'
			}
		} catch (error) {
			this.logger.error('[N8N Cron] Failed to check lease expiries', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Retry failed Stripe subscription creations
	 * Recommended schedule: Every 5 minutes
	 */
	@Post('subscription-retry')
	@HttpCode(HttpStatus.OK)
	async handleSubscriptionRetry(
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<CronJobResult> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Cron] Received subscription-retry request')

		try {
			await this.subscriptionRetry.retryFailedSubscriptions()
			return {
				success: true,
				message: 'Subscription retry completed successfully'
			}
		} catch (error) {
			this.logger.error('[N8N Cron] Failed to retry subscriptions', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}
