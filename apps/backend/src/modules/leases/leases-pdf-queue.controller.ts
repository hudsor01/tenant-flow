import { Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'

/**
 * Lease PDF Queue Controller
 *
 * Handles async PDF generation via background queue
 * to avoid blocking HTTP requests
 */
@Controller('leases')
export class LeasesPdfQueueController {
	constructor(@InjectQueue('pdf-generation') private pdfQueue: Queue) {}

	/**
	 * Queue PDF generation for a lease
	 * Returns immediately with job ID for status polling
	 *
	 * POST /api/v1/leases/:id/queue-pdf
	 */
	@Post(':id/queue-pdf')
	async queuePdfGeneration(
		@Param('id', ParseUUIDPipe) leaseId: string,
		@JwtToken() token: string
	) {
		const job = await this.pdfQueue.add('generate-lease-pdf', {
			leaseId,
			token
		})

		return {
			message: 'PDF generation queued',
			jobId: job.id,
			statusUrl: `/api/v1/leases/${leaseId}/pdf-status`
		}
	}
}
