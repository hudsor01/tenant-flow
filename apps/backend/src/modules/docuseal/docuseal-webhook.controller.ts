/**
 * DocuSeal Webhook Controller
 *
 * Receives webhook events from self-hosted DocuSeal instance.
 * Validates webhook secret header and routes events to service.
 *
 * Webhook Events:
 * - form.completed: Individual submitter has signed
 * - submission.completed: All parties have signed
 */

import {
	BadRequestException,
	Body,
	Controller,
	Headers,
	Logger,
	Post,
	UnauthorizedException
} from '@nestjs/common'
import { timingSafeEqual } from 'crypto'
import { DocuSealWebhookService } from './docuseal-webhook.service'
import {
	formCompletedPayloadSchema,
	submissionCompletedPayloadSchema
} from '@repo/shared/validation/docuseal-webhooks'
import { AppConfigService } from '../../config/app-config.service'

export interface DocuSealWebhookPayload {
	event_type?: string
	timestamp?: string
	data?: Record<string, unknown>
}

@Controller('webhooks/docuseal')
export class DocuSealWebhookController {
	private readonly logger = new Logger(DocuSealWebhookController.name)

	constructor(
		private readonly webhookService: DocuSealWebhookService,
		private readonly config: AppConfigService
	) {}

	@Post()
	async handleWebhook(
		@Headers() headers: Record<string, string>,
		@Body() payload: DocuSealWebhookPayload
	): Promise<{ received: boolean }> {
		// Step 1: Validate webhook secret (constant-time comparison)
		const webhookSecret = this.config.getDocuSealWebhookSecret()
		const receivedSecret = headers['x-docuseal-secret']

		if (!webhookSecret || webhookSecret.trim().length === 0) {
			this.logger.error('DocuSeal webhook secret not configured or empty')
			throw new UnauthorizedException('Webhook not configured')
		}

		if (!receivedSecret) {
			this.logger.warn('Invalid DocuSeal webhook secret', {
				hasHeader: false
			})
			throw new UnauthorizedException('Invalid webhook secret')
		}

		// Use constant-time comparison to prevent timing attacks
		const receivedBuffer = Buffer.from(receivedSecret)
		const expectedBuffer = Buffer.from(webhookSecret)
		const isValid =
			receivedBuffer.length === expectedBuffer.length &&
			timingSafeEqual(receivedBuffer, expectedBuffer)

		if (!isValid) {
			this.logger.warn('Invalid DocuSeal webhook secret', {
				hasHeader: true
			})
			throw new UnauthorizedException('Invalid webhook secret')
		}

		// Step 2: Validate payload structure
		if (!payload.event_type || !payload.data) {
			this.logger.warn('Malformed DocuSeal webhook payload', { payload })
			throw new BadRequestException('Invalid webhook payload')
		}

		this.logger.log('Received DocuSeal webhook', {
			eventType: payload.event_type,
			timestamp: payload.timestamp
		})

		try {
			// Step 3: Route event to appropriate handler with validated payload
			switch (payload.event_type) {
				case 'form.completed': {
					const result = formCompletedPayloadSchema.safeParse(payload.data)
					if (!result.success) {
						this.logger.warn('Invalid form.completed payload', {
							errors: result.error.flatten()
						})
						throw new BadRequestException('Invalid form.completed payload')
					}
					await this.webhookService.handleFormCompleted(result.data)
					break
				}

				case 'submission.completed': {
					const result = submissionCompletedPayloadSchema.safeParse(payload.data)
					if (!result.success) {
						this.logger.warn('Invalid submission.completed payload', {
							errors: result.error.flatten()
						})
						throw new BadRequestException('Invalid submission.completed payload')
					}
					await this.webhookService.handleSubmissionCompleted(result.data)
					break
				}

				default:
					// Acknowledge unknown events without processing
					this.logger.debug('Unhandled DocuSeal event type', {
						eventType: payload.event_type
					})
			}
		} catch (error) {
			this.logger.error('Error processing DocuSeal webhook', {
				eventType: payload.event_type,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}

		return { received: true }
	}
}
