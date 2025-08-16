import { Injectable, Logger } from '@nestjs/common'
import { QueueService } from '../queue.service'

/**
 * Queue Metrics Service
 * Provides queue metrics in format compatible with existing Prometheus/Grafana setup
 * Focuses on operational metrics, not duplicating existing monitoring
 */
@Injectable()
export class QueueMetricsService {
	private readonly logger = new Logger('QueueMetrics')

	constructor(private readonly queueService: QueueService) {}

	/**
	 * Get queue metrics for Prometheus export
	 * Format compatible with existing monitoring infrastructure
	 */
	async getPrometheusMetrics(): Promise<string> {
		try {
			const emailStats = await this.queueService.getJobCounts('EMAILS')
			const paymentStats =
				await this.queueService.getJobCounts('PAYMENTS')

			const timestamp = Date.now()

			// Format metrics for Prometheus scraping
			const metrics = [
				// Email queue metrics
				`tenantflow_queue_jobs_waiting{queue="emails"} ${emailStats.waiting} ${timestamp}`,
				`tenantflow_queue_jobs_active{queue="emails"} ${emailStats.active} ${timestamp}`,
				`tenantflow_queue_jobs_completed{queue="emails"} ${emailStats.completed} ${timestamp}`,
				`tenantflow_queue_jobs_failed{queue="emails"} ${emailStats.failed} ${timestamp}`,
				`tenantflow_queue_jobs_delayed{queue="emails"} ${emailStats.delayed} ${timestamp}`,

				// Payment queue metrics
				`tenantflow_queue_jobs_waiting{queue="payments"} ${paymentStats.waiting} ${timestamp}`,
				`tenantflow_queue_jobs_active{queue="payments"} ${paymentStats.active} ${timestamp}`,
				`tenantflow_queue_jobs_completed{queue="payments"} ${paymentStats.completed} ${timestamp}`,
				`tenantflow_queue_jobs_failed{queue="payments"} ${paymentStats.failed} ${timestamp}`,
				`tenantflow_queue_jobs_delayed{queue="payments"} ${paymentStats.delayed} ${timestamp}`,

				// Health indicators
				`tenantflow_queue_health{queue="emails"} ${this.calculateQueueHealth(emailStats)} ${timestamp}`,
				`tenantflow_queue_health{queue="payments"} ${this.calculateQueueHealth(paymentStats)} ${timestamp}`
			]

			return metrics.join('\n') + '\n'
		} catch (error) {
			this.logger.error('Failed to generate Prometheus metrics', error)
			return '# ERROR: Failed to generate queue metrics\n'
		}
	}

	/**
	 * Calculate queue health score (0-1)
	 * 1 = healthy, 0 = unhealthy
	 */
	private calculateQueueHealth(stats: {
		waiting: number
		active: number
		completed: number
		failed: number
	}): number {
		const total =
			stats.waiting + stats.active + stats.completed + stats.failed

		if (total === 0) {
			return 1
		} // No jobs is healthy

		const failureRate = stats.failed / total
		const activeRate = stats.active / total

		// Unhealthy if high failure rate or too many active jobs stuck
		if (failureRate > 0.1) {
			return 0
		} // More than 10% failures
		if (activeRate > 0.5 && stats.active > 100) {
			return 0
		} // Too many active jobs

		return 1
	}

	/**
	 * Get simple health check for monitoring
	 */
	async getHealthCheck(): Promise<{
		healthy: boolean
		details: Record<string, unknown>
	}> {
		try {
			const emailStats = await this.queueService.getJobCounts('EMAILS')
			const paymentStats =
				await this.queueService.getJobCounts('PAYMENTS')

			const emailHealthy = this.calculateQueueHealth(emailStats) === 1
			const paymentHealthy = this.calculateQueueHealth(paymentStats) === 1

			return {
				healthy: emailHealthy && paymentHealthy,
				details: {
					emails: { healthy: emailHealthy, stats: emailStats },
					payments: { healthy: paymentHealthy, stats: paymentStats }
				}
			}
		} catch (error) {
			return {
				healthy: false,
				details: {
					error:
						error instanceof Error ? error.message : 'Unknown error'
				}
			}
		}
	}
}
