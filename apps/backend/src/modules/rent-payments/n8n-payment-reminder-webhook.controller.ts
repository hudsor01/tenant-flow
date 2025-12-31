/**
 * N8N Payment Reminder Webhook Controller
 *
 * HTTP endpoint for n8n to trigger payment reminder processing.
 * Replaces @Cron decorator when N8N_CRON_MODE is enabled.
 *
 * Recommended n8n schedule: Daily at 9 AM
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
import { PaymentReminderService } from './payment-reminder.service'

interface CronJobResult {
	success: boolean
	message: string
	stats?: Record<string, unknown>
}

@ApiTags('N8N Webhooks')
@Controller('webhooks/n8n/cron')
@Public()
export class N8nPaymentReminderWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly paymentReminderService: PaymentReminderService,
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
	 * Trigger payment reminder processing
	 * Recommended schedule: Daily at 9 AM
	 */
	@ApiOperation({
		summary: 'Process payment reminders',
		description:
			'N8N cron webhook to trigger daily payment reminder processing. Sends email reminders to tenants with upcoming rent due. Recommended schedule: Daily at 9 AM. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiResponse({
		status: 200,
		description: 'Payment reminders processed successfully',
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
	@ApiResponse({ status: 500, description: 'Payment reminder processing failed' })
	@Post('payment-reminders')
	@HttpCode(HttpStatus.OK)
	async handlePaymentReminders(
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<CronJobResult> {
		this.validateWebhookSecret(secret)

		this.logger.log('[N8N Cron] Received payment-reminders request')

		try {
			await this.paymentReminderService.sendPaymentReminders()
			return {
				success: true,
				message: 'Payment reminders processed successfully'
			}
		} catch (error) {
			this.logger.error('[N8N Cron] Failed to process payment reminders', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}
