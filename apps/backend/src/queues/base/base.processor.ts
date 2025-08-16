import type { Job } from 'bull'
import { ErrorClassificationService } from '../services/error-classification.service'
import { DataSanitizationService } from '../services/data-sanitization.service'
import { ProcessorUtils } from '../utils/processor-utils'
import { QueueLogger } from '../services/queue-logger.service'

/**
 * Base interface for all job data
 * Following official Bull pattern recommendations
 */
export interface BaseJobData {
	organizationId?: string
	userId?: string
	correlationId?: string
	timestamp?: string
	metadata?: Record<string, unknown>
}

/**
 * Standard job result interface
 * Ensures consistent return types across all processors
 */
export interface ProcessorResult {
	success: boolean
	data?: unknown
	error?: string
	processingTime: number
	timestamp: Date
}

/**
 * Abstract base processor following official Bull/NestJS patterns
 * Provides standardized error handling, logging, and progress reporting
 *
 * @template T Job data type extending BaseJobData
 */
export abstract class BaseProcessor<T extends BaseJobData> {
	protected readonly logger: QueueLogger

	constructor(processorName: string) {
		this.logger = new QueueLogger(processorName)
	}

	/**
	 * Main processing method to be implemented by concrete processors
	 * @param job Bull job instance with typed data
	 * @returns Promise resolving to processor result
	 */
	protected abstract processJob(job: Job<T>): Promise<ProcessorResult>

	/**
	 * Standardized job handling with error management and metrics
	 * Following official Bull error handling patterns
	 */
	protected async handleJob(job: Job<T>): Promise<ProcessorResult> {
		const startTime = Date.now()
		const jobId = job.id?.toString() ?? 'unknown'
		const correlationId = job.data?.correlationId ?? jobId

		try {
			// Validate job data first
			this.validateJobData(job.data)

			this.logger.logJobStart(job, { correlationId })

			// Update job progress to indicate processing started
			await this.updateProgress(job, 0, 'Processing started')

			// Execute the actual job processing
			const result = await this.processJob(job)

			// Update progress to completion
			await this.updateProgress(job, 100, 'Processing completed')

			const processingTime = Date.now() - startTime

			this.logger.logJobSuccess(job, processingTime, result)

			return {
				...result,
				processingTime,
				timestamp: new Date()
			}
		} catch (error) {
			const processingTime = Date.now() - startTime
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			this.logger.logJobFailure(
				job,
				error instanceof Error ? error : new Error(errorMessage),
				processingTime
			)

			// For failed jobs, record failure reason
			await this.updateProgress(
				job,
				job.progress() || 0,
				`Failed: ${errorMessage}`
			)

			return {
				success: false,
				error: errorMessage,
				processingTime,
				timestamp: new Date()
			}
		}
	}

	/**
	 * Standardized progress update following Bull patterns
	 * @param job Bull job instance
	 * @param progress Progress percentage (0-100)
	 * @param message Optional progress message
	 */
	protected async updateProgress(
		job: Job<T>,
		progress: number,
		message?: string
	): Promise<void> {
		try {
			await job.progress(progress)
			if (message) {
				this.logger.logJobProgress(job, progress, message)
			}
		} catch (error) {
			// Progress update failures shouldn't fail the job
			this.logger.logQueueEvent('progress-update-failed', {
				jobId: job.id,
				error
			})
		}
	}

	/**
	 * Validate job data before processing
	 * Override in concrete processors for specific validation
	 */
	protected validateJobData(data: T): void {
		if (!data) {
			throw new Error('Job data is required')
		}

		// Basic validation - can be extended by concrete processors
		if (data.organizationId && typeof data.organizationId !== 'string') {
			throw new Error('organizationId must be a string')
		}

		if (data.userId && typeof data.userId !== 'string') {
			throw new Error('userId must be a string')
		}
	}

	/**
	 * Sanitize sensitive data for logging - uses centralized service
	 */
	protected sanitizeLogData(data: T): Partial<T> {
		return DataSanitizationService.sanitize(data)
	}

	/**
	 * Calculate retry delay - uses centralized utility
	 */
	protected calculateRetryDelay(
		attemptNumber: number,
		baseDelay = 1000,
		maxDelay = 60000
	): number {
		return ProcessorUtils.calculateBackoffDelay(
			attemptNumber,
			baseDelay,
			maxDelay
		)
	}

	/**
	 * Determine if error is retryable - uses centralized service
	 */
	protected isRetryableError(error: Error): boolean {
		return ErrorClassificationService.isRetryableError(error)
	}
}
