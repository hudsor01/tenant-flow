import { Injectable, Logger } from '@nestjs/common'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { StripeEvent } from '@repo/shared/types/stripe'

export interface WebhookError {
	id: string
	eventType: string
	eventId: string
	correlationId: string
	timestamp: Date
	errorType: string
	errorMessage: string
	errorStack?: string
	stripeEventData?: Record<string, unknown>
	retryAttempt: number
	isRetriable: boolean
	severity: 'low' | 'medium' | 'high' | 'critical'
	context: Record<string, unknown>
}

export interface ErrorAlert {
	type:
		| 'error_rate'
		| 'consecutive_failures'
		| 'critical_error'
		| 'system_overload'
	severity: 'warning' | 'critical'
	message: string
	context: Record<string, unknown>
	timestamp: Date
	eventType?: string
	correlationId?: string
}

export interface RetryPolicy {
	maxRetries: number
	baseDelayMs: number
	maxDelayMs: number
	backoffMultiplier: number
	retriableErrors: string[]
}

export interface DeadLetterQueue {
	event: StripeEvent
	error: WebhookError
	retryHistory: {
		attempt: number
		timestamp: Date
		error: string
	}[]
	finalFailureTime: Date
	needsManualReview: boolean
}

@Injectable()
export class WebhookErrorMonitorService {
	private readonly logger = new Logger(WebhookErrorMonitorService.name)
	private readonly structuredLogger: StructuredLoggerService
	private readonly errors: WebhookError[] = []
	private readonly deadLetterQueue: DeadLetterQueue[] = []
	private readonly maxErrorHistory = 1000
	private readonly maxDLQSize = 100

	// Error tracking for alerting
	private errorRateWindow: { timestamp: Date; eventType: string }[] = []
	private consecutiveFailures = new Map<string, number>()

	// Alert thresholds
	private readonly alertThresholds = {
		errorRatePerMinute: 10, // Alert if more than 10 errors per minute
		consecutiveFailureLimit: 5, // Alert after 5 consecutive failures
		criticalErrorTypes: ['TypeError', 'ReferenceError', 'SyntaxError'], // Immediate alerts
		errorRateWindowMinutes: 5 // Window for error rate calculation
	}

	// Default retry policy
	private retryPolicy: RetryPolicy = {
		maxRetries: 3,
		baseDelayMs: 1000, // 1 second
		maxDelayMs: 30000, // 30 seconds
		backoffMultiplier: 2,
		retriableErrors: [
			'TimeoutError',
			'NetworkError',
			'DatabaseError',
			'TemporaryError',
			'RateLimitError'
		]
	}

	constructor(
		// private readonly errorHandler: ErrorHandlerService, // Reserved for future error handling integration
		private readonly eventEmitter: EventEmitter2
	) {
		this.structuredLogger = new StructuredLoggerService(
			'WebhookErrorMonitor'
		)

		// Clean up old errors every hour
		setInterval(
			() => {
				this.cleanupOldErrors()
			},
			60 * 60 * 1000
		)

		// Check error rates every minute
		setInterval(() => {
			this.checkErrorRates()
		}, 60 * 1000)
	}

	/**
	 * Record a webhook processing error
	 */
	recordError(
		eventType: string,
		eventId: string,
		correlationId: string,
		error: Error,
		stripeEvent?: StripeEvent,
		retryAttempt = 0
	): WebhookError {
		const webhookError: WebhookError = {
			id: `${eventId}-${Date.now()}`,
			eventType,
			eventId,
			correlationId,
			timestamp: new Date(),
			errorType: error.constructor.name,
			errorMessage: error.message,
			errorStack: error.stack,
			stripeEventData: stripeEvent
				? this.sanitizeEventData(stripeEvent)
				: undefined,
			retryAttempt,
			isRetriable: this.isErrorRetriable(error),
			severity: this.calculateErrorSeverity(error, eventType),
			context: {
				eventType,
				eventId,
				correlationId,
				retryAttempt,
				timestamp: new Date().toISOString()
			}
		}

		// Store error
		this.errors.push(webhookError)
		this.trimErrorHistory()

		// Track for alerting
		this.errorRateWindow.push({ timestamp: new Date(), eventType })
		this.updateConsecutiveFailures(eventType, true)

		// Log structured error
		this.logStructuredError(webhookError)

		// Check for immediate alerts
		this.checkForAlerts(webhookError)

		// Emit error event for other systems
		this.eventEmitter.emit('webhook.error', webhookError)

		return webhookError
	}

	/**
	 * Record successful webhook processing (resets consecutive failures)
	 */
	recordSuccess(eventType: string, correlationId: string): void {
		this.updateConsecutiveFailures(eventType, false)

		this.structuredLogger.debug('Webhook processing success recorded', {
			eventType,
			correlationId,
			operation: 'webhook.success'
		})
	}

	/**
	 * Add event to dead letter queue after max retries
	 */
	addToDeadLetterQueue(
		event: StripeEvent,
		finalError: WebhookError,
		retryHistory: { attempt: number; timestamp: Date; error: string }[]
	): void {
		const dlqEntry: DeadLetterQueue = {
			event,
			error: finalError,
			retryHistory,
			finalFailureTime: new Date(),
			needsManualReview: this.needsManualReview(finalError)
		}

		this.deadLetterQueue.push(dlqEntry)
		this.trimDeadLetterQueue()

		// Log critical failure
		this.logger.error(
			`🚨 DEAD LETTER QUEUE: Event ${event.id} failed after ${this.retryPolicy.maxRetries} retries`,
			{
				eventType: event.type,
				eventId: event.id,
				correlationId: finalError.correlationId,
				finalError: finalError.errorMessage,
				retryHistory,
				needsManualReview: dlqEntry.needsManualReview
			}
		)

		// Emit critical alert
		this.emitAlert({
			type: 'critical_error',
			severity: 'critical',
			message: `Event ${event.id} (${event.type}) failed permanently and added to dead letter queue`,
			context: {
				eventType: event.type,
				eventId: event.id,
				correlationId: finalError.correlationId,
				retryCount: this.retryPolicy.maxRetries,
				needsManualReview: dlqEntry.needsManualReview
			},
			timestamp: new Date(),
			eventType: event.type,
			correlationId: finalError.correlationId
		})
	}

	/**
	 * Get retry delay for next attempt
	 */
	getRetryDelay(attemptNumber: number): number {
		const delay = Math.min(
			this.retryPolicy.baseDelayMs *
				Math.pow(this.retryPolicy.backoffMultiplier, attemptNumber),
			this.retryPolicy.maxDelayMs
		)

		// Add jitter to prevent thundering herd
		const jitter = Math.random() * 0.1 * delay
		return Math.floor(delay + jitter)
	}

	/**
	 * Check if error should be retried
	 */
	shouldRetry(error: Error, attemptNumber: number): boolean {
		if (attemptNumber >= this.retryPolicy.maxRetries) {
			return false
		}

		return this.isErrorRetriable(error)
	}

	/**
	 * Get recent errors with filtering
	 */
	getRecentErrors(
		hours = 24,
		eventType?: string,
		severity?: WebhookError['severity']
	): WebhookError[] {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

		return this.errors.filter(error => {
			if (error.timestamp < cutoff) {
				return false
			}
			if (eventType && error.eventType !== eventType) {
				return false
			}
			if (severity && error.severity !== severity) {
				return false
			}
			return true
		})
	}

	/**
	 * Get error statistics
	 */
	getErrorStatistics(hours = 24): {
		totalErrors: number
		errorsByType: Record<string, number>
		errorsBySeverity: Record<string, number>
		retriableErrors: number
		nonRetriableErrors: number
		averageRetryAttempts: number
		deadLetterQueueSize: number
		topErrorMessages: { message: string; count: number }[]
	} {
		const recentErrors = this.getRecentErrors(hours)

		const errorsByType: Record<string, number> = {}
		const errorsBySeverity: Record<string, number> = {}
		const errorMessages: Record<string, number> = {}
		let totalRetryAttempts = 0
		let retriableCount = 0

		recentErrors.forEach(error => {
			errorsByType[error.errorType] =
				(errorsByType[error.errorType] || 0) + 1
			errorsBySeverity[error.severity] =
				(errorsBySeverity[error.severity] || 0) + 1
			errorMessages[error.errorMessage] =
				(errorMessages[error.errorMessage] || 0) + 1
			totalRetryAttempts += error.retryAttempt
			if (error.isRetriable) {
				retriableCount++
			}
		})

		const topErrorMessages = Object.entries(errorMessages)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([message, count]) => ({ message, count }))

		return {
			totalErrors: recentErrors.length,
			errorsByType,
			errorsBySeverity,
			retriableErrors: retriableCount,
			nonRetriableErrors: recentErrors.length - retriableCount,
			averageRetryAttempts:
				recentErrors.length > 0
					? totalRetryAttempts / recentErrors.length
					: 0,
			deadLetterQueueSize: this.deadLetterQueue.length,
			topErrorMessages
		}
	}

	/**
	 * Get dead letter queue entries
	 */
	getDeadLetterQueue(): DeadLetterQueue[] {
		return [...this.deadLetterQueue]
	}

	/**
	 * Retry an event from dead letter queue
	 */
	async retryFromDeadLetterQueue(eventId: string): Promise<{
		success: boolean
		error?: string
	}> {
		const entryIndex = this.deadLetterQueue.findIndex(
			entry => entry.event.id === eventId
		)

		if (entryIndex === -1) {
			return {
				success: false,
				error: 'Event not found in dead letter queue'
			}
		}

		const entry = this.deadLetterQueue[entryIndex]

		if (!entry) {
			return { success: false, error: 'Event entry is invalid' }
		}

		try {
			// Remove from DLQ and emit retry event
			this.deadLetterQueue.splice(entryIndex, 1)

			this.logger.log(`Retrying event from dead letter queue: ${eventId}`)
			this.eventEmitter.emit('webhook.retry_from_dlq', entry.event)

			return { success: true }
		} catch (error) {
			this.logger.error(
				`Failed to retry event from dead letter queue: ${eventId}`,
				error
			)
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	}

	/**
	 * Update retry policy
	 */
	updateRetryPolicy(policy: Partial<RetryPolicy>): void {
		this.retryPolicy = { ...this.retryPolicy, ...policy }
		this.logger.log('Updated retry policy', {
			retryPolicy: this.retryPolicy
		})
	}

	/**
	 * Get current retry policy
	 */
	getRetryPolicy(): RetryPolicy {
		return { ...this.retryPolicy }
	}

	/**
	 * Clear all error data (useful for testing)
	 */
	clearErrorData(): void {
		this.errors.length = 0
		this.deadLetterQueue.length = 0
		this.errorRateWindow.length = 0
		this.consecutiveFailures.clear()
		this.logger.log('Webhook error data cleared')
	}

	private isErrorRetriable(error: Error): boolean {
		const errorType = error.constructor.name
		return (
			this.retryPolicy.retriableErrors.includes(errorType) ||
			error.message.toLowerCase().includes('timeout') ||
			error.message.toLowerCase().includes('network') ||
			error.message.toLowerCase().includes('connection')
		)
	}

	private calculateErrorSeverity(
		error: Error,
		eventType: string
	): WebhookError['severity'] {
		const errorType = error.constructor.name

		// Critical errors that indicate code issues
		if (this.alertThresholds.criticalErrorTypes.includes(errorType)) {
			return 'critical'
		}

		// High severity for payment-related events
		if (eventType.includes('payment') || eventType.includes('invoice')) {
			return 'high'
		}

		// Medium for subscription events
		if (
			eventType.includes('subscription') ||
			eventType.includes('customer')
		) {
			return 'medium'
		}

		// Low for everything else
		return 'low'
	}

	private sanitizeEventData(event: StripeEvent): Record<string, unknown> {
		// Remove sensitive data and keep only essential fields for debugging
		return {
			id: event.id,
			type: event.type,
			created: event.created,
			livemode: event.livemode,
			api_version: event.api_version,
			object_id: (event.data?.object as { id?: string })?.id
			// Don't include full data.object to avoid storing sensitive info
		}
	}

	private updateConsecutiveFailures(
		eventType: string,
		isFailure: boolean
	): void {
		if (isFailure) {
			const current = this.consecutiveFailures.get(eventType) || 0
			this.consecutiveFailures.set(eventType, current + 1)
		} else {
			this.consecutiveFailures.delete(eventType)
		}
	}

	private checkForAlerts(error: WebhookError): void {
		const alerts: ErrorAlert[] = []

		// Check for critical error types
		if (this.alertThresholds.criticalErrorTypes.includes(error.errorType)) {
			alerts.push({
				type: 'critical_error',
				severity: 'critical',
				message: `Critical error detected: ${error.errorType} in ${error.eventType}`,
				context: {
					errorType: error.errorType,
					errorMessage: error.errorMessage,
					eventType: error.eventType,
					correlationId: error.correlationId
				},
				timestamp: new Date(),
				eventType: error.eventType,
				correlationId: error.correlationId
			})
		}

		// Check consecutive failures
		const consecutiveCount =
			this.consecutiveFailures.get(error.eventType) || 0
		if (consecutiveCount >= this.alertThresholds.consecutiveFailureLimit) {
			alerts.push({
				type: 'consecutive_failures',
				severity: 'critical',
				message: `${consecutiveCount} consecutive failures for ${error.eventType}`,
				context: {
					eventType: error.eventType,
					consecutiveFailures: consecutiveCount,
					threshold: this.alertThresholds.consecutiveFailureLimit
				},
				timestamp: new Date(),
				eventType: error.eventType
			})
		}

		// Emit all alerts
		alerts.forEach(alert => this.emitAlert(alert))
	}

	private checkErrorRates(): void {
		const now = new Date()
		const windowStart = new Date(
			now.getTime() -
				this.alertThresholds.errorRateWindowMinutes * 60 * 1000
		)

		// Clean old entries from error rate window
		this.errorRateWindow = this.errorRateWindow.filter(
			entry => entry.timestamp >= windowStart
		)

		// Check if error rate exceeds threshold
		const errorsInWindow = this.errorRateWindow.length
		const errorsPerMinute =
			errorsInWindow / this.alertThresholds.errorRateWindowMinutes

		if (errorsPerMinute > this.alertThresholds.errorRatePerMinute) {
			this.emitAlert({
				type: 'error_rate',
				severity: 'warning',
				message: `High error rate detected: ${errorsPerMinute.toFixed(1)} errors/min`,
				context: {
					errorsPerMinute,
					threshold: this.alertThresholds.errorRatePerMinute,
					windowMinutes: this.alertThresholds.errorRateWindowMinutes,
					totalErrors: errorsInWindow
				},
				timestamp: now
			})
		}
	}

	private emitAlert(alert: ErrorAlert): void {
		this.logger.error(`🚨 WEBHOOK ALERT: ${alert.message}`, {
			alert: alert.type,
			severity: alert.severity,
			context: alert.context,
			eventType: alert.eventType,
			correlationId: alert.correlationId
		})

		this.eventEmitter.emit('webhook.alert', alert)
	}

	private logStructuredError(error: WebhookError): void {
		this.structuredLogger.error(
			`Webhook processing failed: ${error.errorMessage}`,
			new Error(error.errorMessage),
			{
				eventType: error.eventType,
				eventId: error.eventId,
				correlationId: error.correlationId,
				errorType: error.errorType,
				retryAttempt: error.retryAttempt,
				isRetriable: error.isRetriable,
				severity: error.severity,
				operation: 'webhook.process_error'
			}
		)
	}

	private needsManualReview(error: WebhookError): boolean {
		// Events that require manual review due to their importance or error type
		return (
			error.severity === 'critical' ||
			error.eventType.includes('payment') ||
			error.eventType.includes('subscription') ||
			this.alertThresholds.criticalErrorTypes.includes(error.errorType)
		)
	}

	private trimErrorHistory(): void {
		if (this.errors.length > this.maxErrorHistory) {
			this.errors.splice(0, this.errors.length - this.maxErrorHistory)
		}
	}

	private trimDeadLetterQueue(): void {
		if (this.deadLetterQueue.length > this.maxDLQSize) {
			this.deadLetterQueue.splice(
				0,
				this.deadLetterQueue.length - this.maxDLQSize
			)
		}
	}

	private cleanupOldErrors(): void {
		const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
		const initialCount = this.errors.length

		// Remove errors older than 7 days
		const filteredErrors = this.errors.filter(
			error => error.timestamp >= cutoff
		)
		this.errors.length = 0
		this.errors.push(...filteredErrors)

		const removed = initialCount - this.errors.length
		if (removed > 0) {
			this.logger.log(`Cleaned up ${removed} old webhook errors`)
		}
	}
}
