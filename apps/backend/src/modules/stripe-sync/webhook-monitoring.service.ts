/**
 * Webhook Monitoring Service
 *
 * Tracks webhook performance metrics, failures, and health status
 * Provides observability and alerting for webhook processing
 */

import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'

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

const SAFE_WEBHOOK_FAILURES_COLUMNS = `
	id,
	stripe_event_id,
	event_type,
	failure_reason,
	error_message,
	error_stack,
	raw_event_data,
	retry_count,
	created_at,
	last_retry_at,
	resolved_at
`.trim()

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

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Record webhook processing metrics for performance monitoring
	 */
	async recordMetrics(metrics: WebhookMetrics): Promise<void> {
		try {
			const { error } = await this.supabaseService
				.getAdminClient()
				.from('webhook_metrics')
				.insert({
					stripe_event_id: metrics.stripeEventId,
					event_type: metrics.eventType,
					processing_duration_ms: metrics.processingDurationMs,
					signature_verification_ms: metrics.signatureVerificationMs ?? null,
					business_logic_ms: metrics.businessLogicMs ?? null,
					database_operations_ms: metrics.databaseOperationsMs ?? null,
					success: metrics.success
				})

			if (error) {
				// Don't fail the webhook processing if metrics recording fails
				this.logger.warn('Failed to record webhook metrics', {
					error: error.message,
					stripeEventId: metrics.stripeEventId
				})
			}
		} catch (error) {
			this.logger.error('Error recording webhook metrics', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	/**
	 * Record webhook processing failure for monitoring and debugging
	 */
	async recordFailure(failure: WebhookFailure): Promise<void> {
		try {
			const { error } = await this.supabaseService
				.getAdminClient()
				.from('webhook_failures')
				.insert({
					stripe_event_id: failure.stripeEventId,
					event_type: failure.eventType,
					failure_reason: failure.failureReason,
					error_message: failure.errorMessage,
					error_stack: failure.errorStack ?? null,
					raw_event_data: (failure.rawEventData ?? null) as never,
					retry_count: 0
				})

			if (error) {
				this.logger.error('Failed to record webhook failure', {
					error: error.message,
					stripeEventId: failure.stripeEventId
				})
			} else {
				this.logger.log('Webhook failure recorded for monitoring', {
					stripeEventId: failure.stripeEventId,
					failureReason: failure.failureReason
				})
			}
		} catch (error) {
			this.logger.error('Error recording webhook failure', {
				error: error instanceof Error ? error.message : 'Unknown error'
			})
		}
	}

	/**
	 * Get webhook health summary for the last 24 hours
	 */
	async getHealthSummary(): Promise<WebhookHealthSummary[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('webhook_health_summary')
			.select('*')
			.limit(24)

		if (error) {
			this.logger.error('Failed to fetch webhook health summary', {
				error: error.message
			})
			return []
		}

		return data || []
	}

	/**
	 * Get event type breakdown for the last 7 days
	 */
	async getEventTypeSummary(): Promise<WebhookEventTypeSummary[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('webhook_event_type_summary')
			.select('*')

		if (error) {
			this.logger.error('Failed to fetch event type summary', {
				error: error.message
			})
			return []
		}

		return data || []
	}

	/**
	 * Detect current webhook health issues
	 */
	async detectHealthIssues(): Promise<WebhookHealthIssue[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('detect_webhook_health_issues')

		if (error) {
			this.logger.error('Failed to detect webhook health issues', {
				error: error.message
			})
			return []
		}

		return (data || []) as WebhookHealthIssue[]
	}

	/**
	 * Get unresolved webhook failures
	 */
	async getUnresolvedFailures(limit = 50): Promise<WebhookFailureRecord[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('webhook_failures')
			.select(SAFE_WEBHOOK_FAILURES_COLUMNS)
			.is('resolved_at', null)
			.order('created_at', { ascending: false })
			.limit(limit)

		if (error) {
			this.logger.error('Failed to fetch unresolved failures', {
				error: error.message
			})
			return []
		}

		return data || []
	}

	/**
	 * Mark failure as resolved
	 */
	async resolveFailure(failureId: string): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('webhook_failures')
			.update({ resolved_at: new Date().toISOString() })
			.eq('id', failureId)

		if (error) {
			this.logger.error('Failed to resolve webhook failure', {
				error: error.message,
				failureId
			})
		}
	}

	/**
	 * Cleanup old webhook data (retention policy enforcement)
	 */
	async cleanupOldData(): Promise<{ table_name: string; rows_deleted: number }[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('cleanup_old_webhook_data')

		if (error) {
			this.logger.error('Failed to cleanup old webhook data', {
				error: error.message
			})
			return []
		}

		this.logger.log('Cleanup old webhook data completed', { result: data })
		return (data as { table_name: string; rows_deleted: number }[]) || []
	}
}
