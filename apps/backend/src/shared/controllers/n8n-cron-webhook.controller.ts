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
	SetMetadata,
	UnauthorizedException,
	forwardRef
} from '@nestjs/common'
import {
	ApiHeader,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { timingSafeEqual } from 'crypto'
import { AppLogger } from '../../logger/app-logger.service'

// Bypass global JwtAuthGuard - N8N webhooks use secret-based auth
const Public = () => SetMetadata('isPublic', true)
import { EventIdempotencyService } from '../services/event-idempotency.service'

// Forward references for lazy loading - these services are in different modules
// We use dynamic imports to avoid circular dependencies
interface CronJobResult {
	success: boolean
	message: string
	stats?: Record<string, unknown>
}

@ApiTags('N8N Webhooks')
@Controller('webhooks/n8n/cron')
@Public()
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
	 * Cleanup old internal events
	 * Recommended schedule: Daily at midnight
	 */
	@ApiOperation({
		summary: 'Cleanup old webhook events',
		description:
			'N8N cron webhook to cleanup old internal events and webhook records. Removes processed events older than retention period. Recommended schedule: Daily at midnight. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiResponse({
		status: 200,
		description: 'Event cleanup completed successfully',
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
	@ApiResponse({ status: 500, description: 'Event cleanup failed' })
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
