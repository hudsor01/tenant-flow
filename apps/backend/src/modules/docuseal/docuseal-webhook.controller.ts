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
	Post,
	SetMetadata,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBody,
	ApiHeader,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { timingSafeEqual } from 'crypto'

// Bypass global JwtAuthGuard - DocuSeal webhooks use secret-based auth
const Public = () => SetMetadata('isPublic', true)
import { DocuSealWebhookService } from './docuseal-webhook.service'
import {
	formCompletedPayloadSchema,
	submissionCompletedPayloadSchema
} from '@repo/shared/validation/docuseal-webhooks'
import { AppConfigService } from '../../config/app-config.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SupabaseService } from '../../database/supabase.service'
import type { Json } from '@repo/shared/types/supabase'

export interface DocuSealWebhookPayload {
	event_type?: string
	timestamp?: string
	data?: Record<string, unknown>
}

@ApiTags('Docuseal Webhooks')
@Controller('webhooks/docuseal')
@Public()
export class DocuSealWebhookController {
	constructor(
		private readonly webhookService: DocuSealWebhookService,
		private readonly config: AppConfigService,
		private readonly logger: AppLogger,
		private readonly supabaseService: SupabaseService
	) {}

	private async acquireWebhookLock(
		externalId: string,
		eventType: string,
		rawPayload: unknown
	): Promise<boolean> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('acquire_webhook_event_lock_with_id', {
				p_webhook_source: 'custom',
				p_external_id: externalId,
				p_event_type: eventType,
				p_raw_payload: rawPayload as Json
			})

		if (error) {
			this.logger.error('DocuSeal webhook lock failed, processing anyway', {
				error: error.message,
				externalId,
				eventType
			})
			return true
		}

		const rows = Array.isArray(data) ? data : [data]
		return rows.some(row => row?.lock_acquired === true)
	}

	@ApiOperation({
		summary: 'Handle DocuSeal document signing webhook',
		description:
			'Receives webhook events from self-hosted DocuSeal instance. Handles form.completed (individual submitter signed) and submission.completed (all parties signed) events. Authenticated via x-docuseal-secret header.'
	})
	@ApiHeader({
		name: 'x-docuseal-secret',
		required: true,
		description: 'DocuSeal webhook secret for authentication'
	})
	@ApiBody({
		description: 'DocuSeal webhook event payload',
		schema: {
			type: 'object',
			required: ['event_type', 'data'],
			properties: {
				event_type: {
					type: 'string',
					enum: ['form.completed', 'submission.completed'],
					description: 'Type of DocuSeal event'
				},
				timestamp: {
					type: 'string',
					format: 'date-time',
					description: 'Event timestamp'
				},
				data: {
					type: 'object',
					description: 'Event-specific payload data'
				}
			}
		}
	})
	@ApiResponse({
		status: 200,
		description: 'Webhook received and processed',
		schema: {
			type: 'object',
			properties: {
				received: { type: 'boolean', example: true }
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid webhook payload' })
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
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
			// Step 3: Idempotency guard (per webhook_events unique constraint)
			const externalId =
				payload.data && typeof payload.data === 'object' && 'id' in payload.data
					? String((payload.data as { id: unknown }).id)
					: `${payload.event_type}:${payload.timestamp ?? 'unknown'}`

			const lockAcquired = await this.acquireWebhookLock(
				externalId,
				payload.event_type,
				payload
			)

			if (!lockAcquired) {
				this.logger.log(
					'DocuSeal webhook duplicate detected, skipping processing',
					{
						eventType: payload.event_type,
						externalId
					}
				)
				return { received: true }
			}

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
					const result = submissionCompletedPayloadSchema.safeParse(
						payload.data
					)
					if (!result.success) {
						this.logger.warn('Invalid submission.completed payload', {
							errors: result.error.flatten()
						})
						throw new BadRequestException(
							'Invalid submission.completed payload'
						)
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
