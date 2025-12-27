import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { Job } from 'bullmq'
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'
import { LeasePdfMapperService } from './lease-pdf-mapper.service'
import { PdfStorageService } from './pdf-storage.service'
import { LeasesService } from '../leases/leases.service'
import { AppLogger } from '../../logger/app-logger.service'
import { SseService } from '../notifications/sse/sse.service'
import type { PdfGenerationCompletedEvent } from '@repo/shared/events/sse-events'
import { SSE_EVENT_TYPES } from '@repo/shared/events/sse-events'

@Processor('pdf-generation', {
	concurrency: Number.parseInt(process.env.PDF_QUEUE_CONCURRENCY ?? '2', 10),
	limiter: {
		max: Number.parseInt(process.env.PDF_QUEUE_LIMIT_MAX ?? '20', 10),
		duration: Number.parseInt(process.env.PDF_QUEUE_LIMIT_DURATION_MS ?? '60000', 10)
	}
})
@Injectable()
export class PdfGenerationProcessor extends WorkerHost {
	constructor(
		private readonly pdfGeneratorService: LeasePdfGeneratorService,
		private readonly pdfMapperService: LeasePdfMapperService,
		private readonly pdfStorageService: PdfStorageService,
		private readonly leasesService: LeasesService,
		private readonly logger: AppLogger,
		private readonly sseService: SseService
	) {
		super()
	}

	async process(job: Job<{ leaseId: string; token: string }>): Promise<{ pdfUrl: string }> {
		const { leaseId, token } = job.data

		this.logger.log(`[PDF Queue] Processing job ${job.id} for lease ${leaseId}`, {
			jobId: job.id,
			leaseId,
			attempt: job.attemptsMade + 1
		})

		try {
			// 1. Fetch lease data
		const leaseData = await this.leasesService.getLeaseDataForPdf(token, leaseId)

			// 2. Map lease data to PDF fields
		const { fields: pdfFields } = this.pdfMapperService.mapLeaseToPdfFields(leaseData)

		// 3. Generate PDF
		this.logger.log(`[PDF Queue] Generating PDF for lease ${leaseId}`)
		const state = leaseData.lease.governing_state ?? 'TX'
		const pdfBuffer = await this.pdfGeneratorService.generateFilledPdf(pdfFields, leaseId, {
				state,
				validateTemplate: true
			})

			// 4. Upload to storage
			this.logger.log(`[PDF Queue] Uploading PDF for lease ${leaseId}`)
			await this.pdfStorageService.uploadLeasePdf(leaseId, pdfBuffer)

			// 5. Get signed URL
			const pdfUrl = await this.pdfStorageService.getLeasePdfUrl(leaseId)
			if (!pdfUrl) {
				throw new Error(`Failed to get PDF URL for lease ${leaseId}`)
			}

			this.logger.log(`[PDF Queue] Successfully generated PDF for lease ${leaseId}`, {
				jobId: job.id,
				leaseId,
				pdfUrl
			})

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

			return { pdfUrl }
		} catch (error) {
			this.logger.error(`[PDF Queue] Failed to generate PDF for lease ${leaseId}`, {
				jobId: job.id,
				leaseId,
				attempt: job.attemptsMade + 1,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}
