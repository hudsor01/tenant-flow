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
	UnauthorizedException
} from '@nestjs/common'
import { AppLogger } from '../../logger/app-logger.service'
import { PaymentReminderService } from './payment-reminder.service'

interface CronJobResult {
	success: boolean
	message: string
	stats?: Record<string, unknown>
}

@Controller('webhooks/n8n/cron')
export class N8nPaymentReminderWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly paymentReminderService: PaymentReminderService,
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
	 * Trigger payment reminder processing
	 * Recommended schedule: Daily at 9 AM
	 */
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
