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
import { DocuSealWebhookService, FormCompletedPayload, SubmissionCompletedPayload } from './docuseal-webhook.service'
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
		// Step 1: Validate webhook secret
		const webhookSecret = this.config.getDocuSealWebhookSecret()
		const receivedSecret = headers['x-docuseal-secret']

		if (!receivedSecret || receivedSecret !== webhookSecret) {
			this.logger.warn('Invalid DocuSeal webhook secret', {
				hasHeader: !!receivedSecret
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
			// Step 3: Route event to appropriate handler
			switch (payload.event_type) {
				case 'form.completed':
					await this.webhookService.handleFormCompleted(payload.data as unknown as FormCompletedPayload)
					break

				case 'submission.completed':
					await this.webhookService.handleSubmissionCompleted(payload.data as unknown as SubmissionCompletedPayload)
					break

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
