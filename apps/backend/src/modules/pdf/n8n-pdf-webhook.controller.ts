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
	InternalServerErrorException,
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

// Bypass global JwtAuthGuard - N8N webhooks use secret-based auth
const Public = () => SetMetadata('isPublic', true)
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

@ApiTags('N8N Webhooks')
@Controller('webhooks/n8n/pdf')
@Public()
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

	@ApiOperation({
		summary: 'Generate lease PDF',
		description:
			'N8N webhook to trigger lease PDF generation. Generates PDF, uploads to storage, and broadcasts SSE event to owner. Authenticated via x-n8n-webhook-secret header.'
	})
	@ApiHeader({
		name: 'x-n8n-webhook-secret',
		required: true,
		description: 'N8N shared secret for authentication'
	})
	@ApiBody({
		description: 'Lease PDF generation request',
		schema: {
			type: 'object',
			required: ['leaseId', 'token'],
			properties: {
				leaseId: { type: 'string', format: 'uuid', description: 'UUID of the lease' },
				token: { type: 'string', description: 'JWT token for user authentication' }
			}
		}
	})
	@ApiResponse({
		status: 200,
		description: 'PDF generated successfully',
		schema: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				pdfUrl: { type: 'string', format: 'uri' },
				message: { type: 'string' }
			}
		}
	})
	@ApiResponse({ status: 401, description: 'Invalid or missing webhook secret' })
	@ApiResponse({ status: 500, description: 'PDF generation failed' })
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
				throw new InternalServerErrorException(
					`Failed to get PDF URL for lease ${leaseId}`
				)
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
