import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { AppConfigService } from '../../config/app-config.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Email Sender Service - Handles Resend API Integration
 *
 * Ultra-Native: Direct Resend SDK usage with proper error handling
 * Rate-Aware: Respects Resend's 2 req/sec default rate limit
 * Observable: Comprehensive logging for debugging and monitoring
 */
@Injectable()
export class EmailSenderService {
	private readonly resend: InstanceType<typeof Resend> | null

	constructor(
		private readonly config: AppConfigService,
		private readonly logger: AppLogger
	) {
		const apiKey = this.config.getResendApiKey()
		if (!apiKey) {
			this.logger.warn(
				'RESEND_API_KEY not configured - email functionality will be disabled'
			)
			this.resend = null
		} else {
			this.resend = new Resend(apiKey)
		}
	}

	/**
	 * Send email via Resend API
	 */
	async sendEmail(params: {
		from: string
		to: string[]
		subject: string
		html: string
		replyTo?: string
	}): Promise<{ id: string } | null> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping email send', {
				to: params.to,
				subject: params.subject
			})
			return null
		}

		try {
			const { data, error } = await this.resend.emails.send({
				from: params.from,
				to: params.to,
				subject: params.subject,
				html: params.html,
				reply_to: params.replyTo
			})

			if (error) {
				this.logger.error('Resend API error', {
					error: error.message,
					to: params.to,
					subject: params.subject
				})
				throw new Error(`Resend API error: ${error.message}`)
			}

			this.logger.log('Email sent successfully', {
				emailId: data?.id,
				to: params.to,
				subject: params.subject
			})

			return data
		} catch (error) {
			this.logger.error('Failed to send email', {
				error: error instanceof Error ? error.message : String(error),
				to: params.to,
				subject: params.subject
			})
			throw error
		}
	}
}
