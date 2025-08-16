import { Injectable, Logger } from '@nestjs/common'
import { Job } from 'bull'
import { DataSanitizationService } from './data-sanitization.service'

/**
 * Centralized logging service for queue infrastructure
 * Single source of truth for ALL queue logging - eliminates ALL duplication
 */
@Injectable()
export class QueueLogger {
  private readonly logger: Logger

  constructor(context: string) {
    this.logger = new Logger(context)
  }

  /**
   * Log job start - standardized across ALL processors
   */
  logJobStart(job: Job, additionalContext?: Record<string, unknown>): void {
    const sanitizedData = DataSanitizationService.sanitize(job.data)
    this.logger.log(`Starting job ${job.id}`, {
      jobId: job.id?.toString() ?? 'unknown',
      queueName: job.queue.name,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
      data: sanitizedData,
      ...additionalContext
    })
  }

  /**
   * Log job completion - standardized across ALL processors
   */
  logJobSuccess(job: Job, processingTime: number, result?: unknown): void {
    this.logger.log(`✅ Job ${job.id} completed successfully`, {
      jobId: job.id?.toString() ?? 'unknown',
      queueName: job.queue.name,
      jobName: job.name,
      processingTime,
      attempts: job.attemptsMade + 1,
      result: result ? DataSanitizationService.sanitize(result) : undefined
    })
  }

  /**
   * Log job failure - standardized across ALL processors
   */
  logJobFailure(job: Job, error: Error, processingTime?: number): void {
    this.logger.error(`❌ Job ${job.id} failed`, {
      jobId: job.id?.toString() ?? 'unknown',
      queueName: job.queue.name,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
      processingTime,
      error: error.message,
      stack: error.stack
    })
  }

  /**
   * Log job retry - standardized across ALL processors
   */
  logJobRetry(job: Job, error: Error, nextAttempt: number): void {
    this.logger.warn(`🔄 Job ${job.id} will be retried`, {
      jobId: job.id?.toString() ?? 'unknown',
      queueName: job.queue.name,
      jobName: job.name,
      currentAttempt: job.attemptsMade + 1,
      nextAttempt,
      error: error.message
    })
  }

  /**
   * Log job progress - standardized across ALL processors
   */
  logJobProgress(job: Job, progress: number, message?: string): void {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`, {
      jobId: job.id?.toString() ?? 'unknown',
      queueName: job.queue.name,
      progress,
      message
    })
  }

  /**
   * Log queue event - standardized across ALL processors
   */
  logQueueEvent(eventType: string, details: Record<string, unknown>): void {
    const sanitizedDetails = DataSanitizationService.sanitize(details)
    this.logger.log(`Queue event: ${eventType}`, sanitizedDetails)
  }

  /**
   * Log queue health - standardized monitoring
   */
  logQueueHealth(queueName: string, metrics: Record<string, unknown>): void {
    this.logger.log(`Queue health check: ${queueName}`, metrics)
  }

  /**
   * Log processing simulation - development only
   */
  logSimulation(type: string, delay: number): void {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`Simulating ${type} processing: ${Math.round(delay)}ms`)
    }
  }
}