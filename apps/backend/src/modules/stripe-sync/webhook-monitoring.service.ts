/**
 * Webhook Monitoring Service
 *
 * Tracks webhook performance metrics, failures, and health status
 * Provides observability and alerting for webhook processing
 */

import { Injectable, Logger } from '@nestjs/common'

export interface WebhookMetrics {
	stripeEventId: string
	eventType: string
	processingDurationMs: number
	signatureVerificationMs?: number
	businessLogicMs?: number
	databaseOperationsMs?: number
	success: boolean
}

export interface WebhookFailure {
	stripeEventId: string
	eventType: string
	failureReason: 'signature_invalid' | 'processing_error' | 'database_error' | 'business_logic_error'
	errorMessage: string
	errorStack?: string
	rawEventData?: unknown
}

export interface WebhookHealthIssue {
	issue_type: string
	severity: 'critical' | 'warning' | 'info'
	description: string
	affected_count: number
	first_occurrence: string
	last_occurrence: string
}

export interface WebhookFailureRecord {
	id: string
	stripe_event_id: string
	event_type: string
	failure_reason: string
	error_message: string | null
	error_stack: string | null
	raw_event_data: unknown
	retry_count: number | null
	created_at: string | null
	last_retry_at: string | null
	resolved_at: string | null
}

export interface WebhookHealthSummary {
	hour: string | null
	total_events: number | null
	successful_events: number | null
	failed_events: number | null
	avg_duration_ms: number | null
	min_duration_ms: number | null
	max_duration_ms: number | null
	success_rate_percentage: number | null
}

export interface WebhookEventTypeSummary {
	event_type: string | null
	total_count: number | null
	successful_count: number | null
	failed_count: number | null
	avg_duration_ms: number | null
	last_received_at: string | null
}

@Injectable()
export class WebhookMonitoringService {
	private readonly logger = new Logger(WebhookMonitoringService.name)

	constructor() {}

	/**
	 * Record webhook processing metrics for performance monitoring
	 * NOTE: Webhook metrics infrastructure not fully deployed - currently logs only
	 */
	async recordMetrics(metrics: WebhookMetrics): Promise<void> {
		this.logger.debug('Webhook metrics recorded (logging only)', {
			eventType: metrics.eventType,
			duration: metrics.processingDurationMs,
			success: metrics.success
		})
	}

	/**
	 * Record webhook processing failure for monitoring and debugging
	 * NOTE: Webhook failures table not deployed - currently logs only
	 */
	async recordFailure(failure: WebhookFailure): Promise<void> {
		this.logger.warn('Webhook failure detected (logging only)', {
			stripeEventId: failure.stripeEventId,
			eventType: failure.eventType,
			failureReason: failure.failureReason,
			errorMessage: failure.errorMessage
		})
	}

	/**
	 * Get webhook health summary for the last 24 hours
	 * NOTE: Health summary views not yet deployed
	 */
	async getHealthSummary(): Promise<WebhookHealthSummary[]> {
		this.logger.debug('Webhook health summary requested (no data available)')
		return []
	}

	/**
	 * Get event type breakdown for the last 7 days
	 * NOTE: Event type summary views not yet deployed
	 */
	async getEventTypeSummary(): Promise<WebhookEventTypeSummary[]> {
		this.logger.debug('Event type summary requested (no data available)')
		return []
	}

	/**
	 * Detect current webhook health issues
	 * NOTE: Health detection RPC not yet deployed
	 */
	async detectHealthIssues(): Promise<WebhookHealthIssue[]> {
		this.logger.debug('Health issues detection requested (no data available)')
		return []
	}

	/**
	 * Get unresolved webhook failures
	 * NOTE: Webhook failures tracking not yet deployed
	 */
	async getUnresolvedFailures(): Promise<WebhookFailureRecord[]> {
		this.logger.debug('Unresolved failures requested (no data available)')
		return []
	}

	/**
	 * Mark failure as resolved
	 * NOTE: Webhook failures table not deployed
	 */
	async resolveFailure(failureId: string): Promise<void> {
		this.logger.debug('Resolve failure requested', { failureId })
	}

	/**
	 * Cleanup old webhook data (retention policy enforcement)
	 * NOTE: Cleanup RPC not yet deployed
	 */
	async cleanupOldData(): Promise<{ table_name: string; rows_deleted: number }[]> {
		this.logger.debug('Webhook data cleanup requested (no data available)')
		return []
	}
}
