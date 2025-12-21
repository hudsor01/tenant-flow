import { Controller, Post, Get, Param, ParseUUIDPipe, Query, NotFoundException } from '@nestjs/common'
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

	/**
	 * Get PDF generation status for a lease
	 * Fallback polling endpoint (SSE is primary for real-time updates)
	 *
	 * GET /api/v1/leases/:id/pdf-status?jobId=xxx
	 */
	@Get(':id/pdf-status')
	async getPdfStatus(
		@Param('id', ParseUUIDPipe) leaseId: string,
		@Query('jobId') jobId?: string
	) {
		// If jobId provided, get specific job status
		if (jobId) {
			const job = await this.pdfQueue.getJob(jobId)
			if (!job) {
				throw new NotFoundException(`Job ${jobId} not found`)
			}

			const state = await job.getState()
			const result = job.returnvalue as { pdfUrl?: string } | null

			return {
				leaseId,
				jobId,
				status: state,
				...(state === 'completed' && result?.pdfUrl && { downloadUrl: result.pdfUrl }),
				...(state === 'failed' && { error: job.failedReason })
			}
		}

		// Otherwise, find the latest job for this lease
		const jobs = await this.pdfQueue.getJobs(['completed', 'active', 'waiting', 'failed'])
		const leaseJobs = jobs
			.filter(j => j.data?.leaseId === leaseId)
			.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))

		const latestJob = leaseJobs[0]
		if (!latestJob) {
			return {
				leaseId,
				status: 'not_found',
				message: 'No PDF generation jobs found for this lease'
			}
		}

		const state = await latestJob.getState()
		const result = latestJob.returnvalue as { pdfUrl?: string } | null

		return {
			leaseId,
			jobId: latestJob.id,
			status: state,
			...(state === 'completed' && result?.pdfUrl && { downloadUrl: result.pdfUrl }),
			...(state === 'failed' && { error: latestJob.failedReason })
		}
	}
}
