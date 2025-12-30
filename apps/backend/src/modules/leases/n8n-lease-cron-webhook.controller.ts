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
	SetMetadata,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiHeader,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { timingSafeEqual } from 'crypto'

// Bypass global JwtAuthGuard - N8N webhooks use secret-based auth
const Public = () => SetMetadata('isPublic', true)
import { AppLogger } from '../../logger/app-logger.service'
import { LeaseExpiryCheckerService } from './lease-expiry-checker.service'
import { SubscriptionRetryService } from './subscription-retry.service'

interface CronJobResult {
	success: boolean
	message: string
	stats?: Record<string, unknown>
}

@ApiTags('N8N Webhooks')
@Controller('webhooks/n8n/cron')
@Public()
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
		// FAIL CLOSED - reject if secret not configured (security requirement)
		if (!this.webhookSecret) {
			this.logger.error(
				'N8N_WEBHOOK_SECRET not configured - rejecting webhook request'
			)
			throw new UnauthorizedException('Webhook authentication not configured')
		}

		if (!secret) {
			throw new UnauthorizedException('Missing x-n8n-webhook-secret header')
		}

		// Timing-safe comparison to prevent timing attacks
		const receivedBuffer = Buffer.from(secret)
		const expectedBuffer = Buffer.from(this.webhookSecret)
		const isValid =
			receivedBuffer.length === expectedBuffer.length &&
			timingSafeEqual(receivedBuffer, expectedBuffer)

		if (!isValid) {
			throw new UnauthorizedException('Invalid webhook secret')
		}
	}

	/**
	 * Check for expiring leases and send notifications
	 * Recommended schedule: Daily at 9 AM
	 */
	@ApiOperation({
		summary: 'Check for expiring leases',
		description:
			'N8N cron webhook to check for expiring leases and send notifications. Identifies leases expiring within configured thresholds and notifies owners. Recommended schedule: Daily at 9 AM. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiResponse({
		status: 200,
		description: 'Lease expiry check completed successfully',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				message: { type: 'string' },
				stats: { type: 'object' }
			}
		}
	})
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
	@ApiResponse({ status: 500, description: 'Lease expiry check failed' })
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
	@ApiOperation({
		summary: 'Retry failed Stripe subscriptions',
		description:
			'N8N cron webhook to retry failed Stripe subscription creations. Picks up subscriptions in failed/pending state and attempts to create them again. Recommended schedule: Every 5 minutes. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiResponse({
		status: 200,
		description: 'Subscription retry completed successfully',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				message: { type: 'string' },
				stats: { type: 'object' }
			}
		}
	})
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
	@ApiResponse({ status: 500, description: 'Subscription retry failed' })
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
