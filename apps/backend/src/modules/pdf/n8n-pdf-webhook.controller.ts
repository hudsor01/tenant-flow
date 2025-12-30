/**
 * N8N PDF Webhook Controller
 *
 * Provides HTTP endpoints for n8n workflows to trigger PDF generation directly,
 * bypassing BullMQ queue processing. This allows n8n to handle:
 * - Retry logic with configurable backoff
 * - Workflow orchestration
 * - Logging and monitoring
 * - Error notifications
 *
 * Security: Protected by a shared secret in the x-n8n-webhook-secret header.
 */

import {
	Body,
	Controller,
	Headers,
	HttpCode,
	HttpStatus,
	Post,
	UnauthorizedException
} from '@nestjs/common'
import { AppLogger } from '../../logger/app-logger.service'
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'
import { LeasePdfMapperService } from './lease-pdf-mapper.service'
import { PdfStorageService } from './pdf-storage.service'
import { LeaseQueryService } from '../leases/lease-query.service'
import { SseService } from '../notifications/sse/sse.service'
import type { PdfGenerationCompletedEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'

interface GenerateLeasePdfPayload {
	leaseId: string
	token: string
}

interface GenerateLeasePdfResponse {
	success: boolean
	pdfUrl?: string
	message: string
}

@Controller('webhooks/n8n/pdf')
export class N8nPdfWebhookController {
	private readonly webhookSecret: string | undefined

	constructor(
		private readonly pdfGeneratorService: LeasePdfGeneratorService,
		private readonly pdfMapperService: LeasePdfMapperService,
		private readonly pdfStorageService: PdfStorageService,
		private readonly leaseQueryService: LeaseQueryService,
		private readonly sseService: SseService,
		private readonly logger: AppLogger
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

	@Post('generate-lease')
	@HttpCode(HttpStatus.OK)
	async handleGenerateLeasePdf(
		@Body() payload: GenerateLeasePdfPayload,
		@Headers('x-n8n-webhook-secret') secret: string | undefined
	): Promise<GenerateLeasePdfResponse> {
		this.validateWebhookSecret(secret)

		const { leaseId, token } = payload

		this.logger.log(
			'[N8N Webhook] Received generate-lease-pdf request',
			{ leaseId }
		)

		try {
			// 1. Fetch lease data
			const leaseData = await this.leaseQueryService.getLeaseDataForPdf(
				token,
				leaseId
			)

			// 2. Map lease data to PDF fields
			const { fields: pdfFields } =
				this.pdfMapperService.mapLeaseToPdfFields(leaseData)

			// 3. Generate PDF
			this.logger.log(`[N8N Webhook] Generating PDF for lease ${leaseId}`)
			const state = leaseData.lease.governing_state ?? 'TX'
			const pdfBuffer = await this.pdfGeneratorService.generateFilledPdf(
				pdfFields,
				leaseId,
				{
					state,
					validateTemplate: true
				}
			)

			// 4. Upload to storage
			this.logger.log(`[N8N Webhook] Uploading PDF for lease ${leaseId}`)
			await this.pdfStorageService.uploadLeasePdf(leaseId, pdfBuffer)

			// 5. Get signed URL
			const pdfUrl = await this.pdfStorageService.getLeasePdfUrl(leaseId)
			if (!pdfUrl) {
				throw new Error(`Failed to get PDF URL for lease ${leaseId}`)
			}

			this.logger.log(
				`[N8N Webhook] Successfully generated PDF for lease ${leaseId}`,
				{ leaseId, pdfUrl }
			)

			// 6. Broadcast SSE event to owner for real-time notification
			const ownerId = leaseData.lease.owner_user_id
			if (ownerId) {
				const sseEvent: PdfGenerationCompletedEvent = {
					type: SSE_EVENT_TYPES.PDF_GENERATION_COMPLETED,
					timestamp: new Date().toISOString(),
					payload: {
						leaseId,
						downloadUrl: pdfUrl
					}
				}
				await this.sseService.broadcast(ownerId, sseEvent)
			}

			return {
				success: true,
				pdfUrl,
				message: 'Lease PDF generated successfully'
			}
		} catch (error) {
			this.logger.error(
				`[N8N Webhook] Failed to generate PDF for lease ${leaseId}`,
				{
					leaseId,
					error: error instanceof Error ? error.message : String(error)
				}
			)
			throw error
		}
	}
}
