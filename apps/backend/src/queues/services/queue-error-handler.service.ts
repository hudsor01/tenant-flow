import { Injectable } from '@nestjs/common'
import { Job } from 'bull'
import { ErrorClassificationService } from './error-classification.service'
import { DataSanitizationService } from './data-sanitization.service'
import { ProcessorUtils } from '../utils/processor-utils'
import { QueueLogger } from './queue-logger.service'
import { QUEUE_ERROR_THRESHOLDS, QUEUE_RETRY_CONFIGS } from '../config/queue.constants'

export interface QueueError {
  jobId: string
  queueName: string
  attemptNumber: number
  error: Error
  jobData: unknown
  timestamp: Date
  isRetryable: boolean
}

export interface ErrorHandlingResult {
  shouldRetry: boolean
  retryDelay?: number
  maxRetries?: number
  escalateToAdmin?: boolean
}

/**
 * Centralized error handling service for all queue operations
 * Following official Bull error handling patterns and best practices
 */
@Injectable()
export class QueueErrorHandlerService {
  private readonly logger = new QueueLogger('QueueErrorHandler')

  /**
   * Handle job failure according to Bull best practices
   * @param job Failed Bull job
   * @param error Error that caused the failure
   * @returns Error handling decision
   */
  async handleJobFailure(job: Job, error: Error): Promise<ErrorHandlingResult> {
    const queueError: QueueError = {
      jobId: job.id?.toString() ?? 'unknown',
      queueName: job.queue.name,
      attemptNumber: job.attemptsMade + 1,
      error,
      jobData: DataSanitizationService.sanitize(job.data),
      timestamp: new Date(),
      isRetryable: ErrorClassificationService.isRetryableError(error)
    }

    this.logger.logJobFailure(job, error)

    // Determine retry strategy based on error type and queue
    const result = this.determineRetryStrategy(queueError, job)

    // Log the decision
    if (result.shouldRetry) {
      this.logger.logJobRetry(job, error, queueError.attemptNumber + 1)
    } else {
      this.logger.logQueueEvent('job-permanently-failed', {
        jobId: queueError.jobId,
        attempt: queueError.attemptNumber,
        escalateToAdmin: result.escalateToAdmin
      })
    }

    // Store error for debugging if needed
    await this.storeErrorForDebugging(queueError)

    // Escalate critical failures
    if (result.escalateToAdmin) {
      await this.escalateToAdmin(queueError)
    }

    return result
  }


  /**
   * Determine retry strategy based on queue type and error
   */
  private determineRetryStrategy(queueError: QueueError, job: Job): ErrorHandlingResult {
    if (!queueError.isRetryable) {
      return {
        shouldRetry: false,
        escalateToAdmin: this.shouldEscalateError(queueError)
      }
    }

    // Queue-specific retry policies following Bull best practices
    switch (queueError.queueName) {
      case 'email':
        return this.getEmailRetryStrategy(queueError, job)
      
      case 'payments':
        return this.getPaymentRetryStrategy(queueError, job)
      
      default:
        return this.getDefaultRetryStrategy(queueError, job)
    }
  }

  /**
   * Email queue retry strategy - more aggressive retries
   */
  private getEmailRetryStrategy(queueError: QueueError, _job: Job): ErrorHandlingResult {
    const maxRetries = 5
    const shouldRetry = queueError.attemptNumber < maxRetries

    return {
      shouldRetry,
      retryDelay: ProcessorUtils.calculateBackoffDelay(queueError.attemptNumber, QUEUE_RETRY_CONFIGS.EMAIL.backoff.delay),
      maxRetries,
      escalateToAdmin: !shouldRetry && this.shouldEscalateError(queueError)
    }
  }

  /**
   * Payment queue retry strategy - careful with financial operations
   */
  private getPaymentRetryStrategy(queueError: QueueError, _job: Job): ErrorHandlingResult {
    const maxRetries = 3 // Conservative for payment operations
    const shouldRetry = queueError.attemptNumber < maxRetries

    // Special handling for Stripe errors
    if (this.isStripeRetryableError(queueError.error)) {
      return {
        shouldRetry,
        retryDelay: ProcessorUtils.calculateBackoffDelay(queueError.attemptNumber, QUEUE_RETRY_CONFIGS.PAYMENT.backoff.delay),
        maxRetries,
        escalateToAdmin: !shouldRetry // Always escalate payment failures
      }
    }

    return {
      shouldRetry: false, // Don't retry unknown payment errors
      escalateToAdmin: true
    }
  }

  /**
   * Default retry strategy for other queues
   */
  private getDefaultRetryStrategy(queueError: QueueError, _job: Job): ErrorHandlingResult {
    const maxRetries = 3
    const shouldRetry = queueError.attemptNumber < maxRetries

    return {
      shouldRetry,
      retryDelay: ProcessorUtils.calculateBackoffDelay(queueError.attemptNumber, QUEUE_RETRY_CONFIGS.DEFAULT.backoff.delay),
      maxRetries,
      escalateToAdmin: !shouldRetry && this.shouldEscalateError(queueError)
    }
  }


  /**
   * Check if this is a retryable Stripe error
   */
  private isStripeRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // Stripe retryable error types
    return message.includes('rate_limit') ||
           message.includes('api_connection_error') ||
           message.includes('api_error') ||
           (message.includes('card_error') && message.includes('processing_error'))
  }

  /**
   * Determine if error should be escalated to admin
   */
  private shouldEscalateError(queueError: QueueError): boolean {
    // Always escalate payment failures
    if (queueError.queueName === 'payments') {
      return true
    }

    // Escalate after multiple failed attempts
    if (queueError.attemptNumber >= QUEUE_ERROR_THRESHOLDS.ESCALATION_ATTEMPTS) {
      return true
    }

    // Escalate critical errors
    const criticalKeywords = ['security', 'unauthorized', 'forbidden', 'critical']
    return criticalKeywords.some(keyword => 
      queueError.error.message.toLowerCase().includes(keyword)
    )
  }

  /**
   * Store error information for debugging and analysis
   */
  private async storeErrorForDebugging(queueError: QueueError): Promise<void> {
    try {
      // TODO: Implement error storage (database, file, external service)
      // This could be enhanced to store in a dedicated error tracking system
      this.logger.logQueueEvent('error-stored', {
        jobId: queueError.jobId,
        queueName: queueError.queueName,
        errorType: queueError.error.name,
        timestamp: queueError.timestamp
      })
    } catch (storageError) {
      this.logger.logQueueEvent('error-storage-failed', { error: storageError })
    }
  }

  /**
   * Escalate critical errors to administrators
   */
  private async escalateToAdmin(queueError: QueueError): Promise<void> {
    try {
      // TODO: Implement admin escalation (email, Slack, PagerDuty, etc.)
      // This could send alerts to monitoring systems or admin dashboards
      this.logger.logQueueEvent('escalation-to-admin', {
        jobId: queueError.jobId,
        queueName: queueError.queueName,
        error: queueError.error.message,
        attemptNumber: queueError.attemptNumber,
        timestamp: queueError.timestamp,
        severity: 'CRITICAL'
      })
    } catch (escalationError) {
      this.logger.logQueueEvent('escalation-failed', { error: escalationError })
    }
  }

}