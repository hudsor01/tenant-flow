import { Test, TestingModule } from '@nestjs/testing'
import { QueueMetricsService } from '../../services/queue-metrics.service'
import { QueueService } from '../../queue.service'
import {
	MockQueueFactory,
	QueueTestModuleBuilder,
	QueueTestEnvironment,
	TestErrorFactory
} from '../shared/queue-test-utilities'

describe('QueueMetricsService', () => {
	let service: QueueMetricsService
	let queueService: jest.Mocked<QueueService>
	let module: TestingModule

	beforeAll(() => {
		QueueTestEnvironment.setupTestTimeout()
		QueueTestEnvironment.setupProcessEnv()
	})

	beforeEach(async () => {
		// Create mock QueueService
		queueService = {
			getJobCounts: jest.fn()
		} as any

		module = await QueueTestModuleBuilder.create()
			.withProvider({
				provide: QueueService,
				useValue: queueService
			})
			.withProvider(QueueMetricsService)
			.build()

		service = module.get<QueueMetricsService>(QueueMetricsService)
		jest.clearAllMocks()
	})

	afterEach(async () => {
		await module.close()
	})

	afterAll(() => {
		QueueTestEnvironment.cleanupProcessEnv()
	})

	describe('getPrometheusMetrics', () => {
		it('should generate Prometheus-compatible metrics format', async () => {
			// Setup mock queue statistics
			queueService.getJobCounts
				.mockResolvedValueOnce({
					waiting: 10,
					active: 2,
					completed: 150,
					failed: 3,
					delayed: 1
				})
				.mockResolvedValueOnce({
					waiting: 5,
					active: 1,
					completed: 200,
					failed: 0,
					delayed: 0
				})

			const metrics = await service.getPrometheusMetrics()

			// Verify metrics format
			expect(metrics).toContain(
				'tenantflow_queue_jobs_waiting{queue="emails"} 10'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_active{queue="emails"} 2'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_completed{queue="emails"} 150'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_failed{queue="emails"} 3'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_delayed{queue="emails"} 1'
			)

			expect(metrics).toContain(
				'tenantflow_queue_jobs_waiting{queue="payments"} 5'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_active{queue="payments"} 1'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_completed{queue="payments"} 200'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_failed{queue="payments"} 0'
			)
			expect(metrics).toContain(
				'tenantflow_queue_jobs_delayed{queue="payments"} 0'
			)
		})

		it('should include health metrics for both queues', async () => {
			queueService.getJobCounts
				.mockResolvedValueOnce({
					waiting: 5,
					active: 1,
					completed: 100,
					failed: 2, // Low failure rate - healthy
					delayed: 0
				})
				.mockResolvedValueOnce({
					waiting: 10,
					active: 2,
					completed: 50,
					failed: 15, // High failure rate - unhealthy
					delayed: 1
				})

			const metrics = await service.getPrometheusMetrics()

			expect(metrics).toContain(
				'tenantflow_queue_health{queue="emails"} 1'
			) // Healthy
			expect(metrics).toContain(
				'tenantflow_queue_health{queue="payments"} 0'
			) // Unhealthy
		})

		it('should include timestamps in metrics', async () => {
			queueService.getJobCounts.mockResolvedValue({
				waiting: 0,
				active: 0,
				completed: 0,
				failed: 0,
				delayed: 0
			})

			const beforeTime = Date.now()
			const metrics = await service.getPrometheusMetrics()
			const afterTime = Date.now()

			// Extract timestamp from first metric line
			const timestampMatch = metrics.match(/(\d{13})/)
			expect(timestampMatch).toBeTruthy()

			if (timestampMatch) {
				const timestamp = parseInt(timestampMatch[1])
				expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
				expect(timestamp).toBeLessThanOrEqual(afterTime)
			}
		})

		it('should handle queue service errors gracefully', async () => {
			queueService.getJobCounts.mockRejectedValue(
				TestErrorFactory.createNetworkError('Queue connection failed')
			)

			const metrics = await service.getPrometheusMetrics()

			expect(metrics).toBe('# ERROR: Failed to generate queue metrics\n')
		})

		it('should log errors when metrics generation fails', async () => {
			const error =
				TestErrorFactory.createRetryableError('Redis unavailable')
			queueService.getJobCounts.mockRejectedValue(error)
			const loggerSpy = jest.spyOn(service['logger'], 'error')

			await service.getPrometheusMetrics()

			expect(loggerSpy).toHaveBeenCalledWith(
				'Failed to generate Prometheus metrics',
				error
			)
		})

		it('should end metrics with newline for proper Prometheus format', async () => {
			queueService.getJobCounts.mockResolvedValue({
				waiting: 0,
				active: 0,
				completed: 0,
				failed: 0,
				delayed: 0
			})

			const metrics = await service.getPrometheusMetrics()

			expect(metrics.endsWith('\n')).toBe(true)
		})
	})

	describe('calculateQueueHealth', () => {
		it('should return healthy (1) for queue with no jobs', () => {
			const emptyStats = {
				waiting: 0,
				active: 0,
				completed: 0,
				failed: 0,
				delayed: 0
			}

			const health = service['calculateQueueHealth'](emptyStats)

			expect(health).toBe(1)
		})

		it('should return healthy (1) for queue with low failure rate', () => {
			const healthyStats = {
				waiting: 10,
				active: 5,
				completed: 100,
				failed: 5, // 5/120 = ~4% failure rate (under 10% threshold)
				delayed: 0
			}

			const health = service['calculateQueueHealth'](healthyStats)

			expect(health).toBe(1)
		})

		it('should return unhealthy (0) for queue with high failure rate', () => {
			const unhealthyStats = {
				waiting: 10,
				active: 5,
				completed: 50,
				failed: 15, // 15/80 = 18.75% failure rate (over 10% threshold)
				delayed: 0
			}

			const health = service['calculateQueueHealth'](unhealthyStats)

			expect(health).toBe(0)
		})

		it('should return unhealthy (0) for queue with too many stuck active jobs', () => {
			const stuckStats = {
				waiting: 10,
				active: 150, // High number of active jobs
				completed: 100,
				failed: 5,
				delayed: 0
			}
			// 150/265 = ~56% active rate with >100 active jobs (should be unhealthy)

			const health = service['calculateQueueHealth'](stuckStats)

			expect(health).toBe(0)
		})

		it('should return healthy (1) for acceptable active job ratio with low count', () => {
			const acceptableStats = {
				waiting: 5,
				active: 10, // High percentage but low absolute count
				completed: 5,
				failed: 0,
				delayed: 0
			}
			// 10/20 = 50% active rate but only 10 active jobs (should be healthy)

			const health = service['calculateQueueHealth'](acceptableStats)

			expect(health).toBe(1)
		})

		it('should handle edge case with exactly 10% failure rate', () => {
			const edgeCaseStats = {
				waiting: 0,
				active: 0,
				completed: 90,
				failed: 10, // Exactly 10% failure rate
				delayed: 0
			}

			const health = service['calculateQueueHealth'](edgeCaseStats)

			expect(health).toBe(1) // Should be healthy at exactly 10% (production logic: > 0.1 triggers unhealthy)
		})
	})

	describe('getHealthCheck', () => {
		it('should return healthy status when all queues are healthy', async () => {
			queueService.getJobCounts
				.mockResolvedValueOnce({
					waiting: 5,
					active: 2,
					completed: 100,
					failed: 1, // Low failure rate
					delayed: 0
				})
				.mockResolvedValueOnce({
					waiting: 3,
					active: 1,
					completed: 200,
					failed: 0, // No failures
					delayed: 0
				})

			const healthCheck = await service.getHealthCheck()

			expect(healthCheck.healthy).toBe(true)
			expect(healthCheck.details.emails.healthy).toBe(true)
			expect(healthCheck.details.payments.healthy).toBe(true)
			expect(healthCheck.details.emails.stats).toBeDefined()
			expect(healthCheck.details.payments.stats).toBeDefined()
		})

		it('should return unhealthy status when any queue is unhealthy', async () => {
			queueService.getJobCounts
				.mockResolvedValueOnce({
					waiting: 5,
					active: 2,
					completed: 100,
					failed: 1, // Healthy
					delayed: 0
				})
				.mockResolvedValueOnce({
					waiting: 10,
					active: 5,
					completed: 50,
					failed: 20, // Unhealthy (high failure rate)
					delayed: 0
				})

			const healthCheck = await service.getHealthCheck()

			expect(healthCheck.healthy).toBe(false)
			expect(healthCheck.details.emails.healthy).toBe(true)
			expect(healthCheck.details.payments.healthy).toBe(false)
		})

		it('should handle queue service errors in health check', async () => {
			const error =
				TestErrorFactory.createNetworkError('Queue unavailable')
			queueService.getJobCounts.mockRejectedValue(error)

			const healthCheck = await service.getHealthCheck()

			expect(healthCheck.healthy).toBe(false)
			expect(healthCheck.details.error).toBe(error.message)
		})

		it('should include detailed statistics for each queue', async () => {
			const emailStats = {
				waiting: 10,
				active: 2,
				completed: 150,
				failed: 3,
				delayed: 1
			}
			const paymentStats = {
				waiting: 5,
				active: 1,
				completed: 200,
				failed: 0,
				delayed: 0
			}

			queueService.getJobCounts
				.mockResolvedValueOnce(emailStats)
				.mockResolvedValueOnce(paymentStats)

			const healthCheck = await service.getHealthCheck()

			expect(healthCheck.details.emails.stats).toEqual(emailStats)
			expect(healthCheck.details.payments.stats).toEqual(paymentStats)
		})
	})

	describe('integration with existing monitoring', () => {
		it('should provide metrics compatible with Prometheus scraping', async () => {
			queueService.getJobCounts.mockResolvedValue({
				waiting: 1,
				active: 2,
				completed: 3,
				failed: 4,
				delayed: 5
			})

			const metrics = await service.getPrometheusMetrics()

			// Verify Prometheus metric format: metric_name{labels} value timestamp
			const metricLines = metrics.split('\n').filter(line => line.trim())

			metricLines.forEach(line => {
				if (!line.startsWith('#')) {
					// Skip error comments
					expect(line).toMatch(
						/^tenantflow_queue_\w+\{queue="(emails|payments)"\} \d+ \d{13}$/
					)
				}
			})
		})

		it('should not duplicate existing monitoring capabilities', async () => {
			queueService.getJobCounts.mockResolvedValue({
				waiting: 0,
				active: 0,
				completed: 0,
				failed: 0,
				delayed: 0
			})

			const metrics = await service.getPrometheusMetrics()

			// Verify we only provide queue-specific metrics, not system-wide metrics
			expect(metrics).not.toContain('cpu_usage')
			expect(metrics).not.toContain('memory_usage')
			expect(metrics).not.toContain('disk_usage')
			expect(metrics).not.toContain('network_io')

			// Should only contain queue-specific metrics
			expect(metrics).toContain('tenantflow_queue_jobs_')
			expect(metrics).toContain('tenantflow_queue_health')
		})

		it('should provide health check compatible with existing monitoring', async () => {
			queueService.getJobCounts.mockResolvedValue({
				waiting: 1,
				active: 0,
				completed: 100,
				failed: 2,
				delayed: 0
			})

			const healthCheck = await service.getHealthCheck()

			// Verify simple boolean health status for integration
			expect(typeof healthCheck.healthy).toBe('boolean')
			expect(healthCheck.details).toBeDefined()
			expect(healthCheck.details.emails).toBeDefined()
			expect(healthCheck.details.payments).toBeDefined()
		})
	})

	describe('performance and reliability', () => {
		it('should handle concurrent metrics requests', async () => {
			queueService.getJobCounts.mockResolvedValue({
				waiting: 1,
				active: 1,
				completed: 1,
				failed: 1,
				delayed: 1
			})

			const concurrentRequests = Array(5)
				.fill(0)
				.map(() => service.getPrometheusMetrics())

			const results = await Promise.all(concurrentRequests)

			// All results should be valid metrics
			results.forEach(metrics => {
				expect(metrics).toContain('tenantflow_queue_jobs_')
				expect(metrics).toContain('tenantflow_queue_health')
			})

			// QueueService should be called appropriately (2 calls per request = 10 total)
			expect(queueService.getJobCounts).toHaveBeenCalledTimes(10)
		})

		it('should handle queue service timeouts gracefully', async () => {
			queueService.getJobCounts.mockImplementation(
				() =>
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Timeout')), 100)
					)
			)

			const metrics = await service.getPrometheusMetrics()

			expect(metrics).toBe('# ERROR: Failed to generate queue metrics\n')
		})

		it('should provide consistent metric format across calls', async () => {
			const sameStats = {
				waiting: 10,
				active: 5,
				completed: 100,
				failed: 2,
				delayed: 1
			}
			queueService.getJobCounts.mockResolvedValue(sameStats)

			const metrics1 = await service.getPrometheusMetrics()
			const metrics2 = await service.getPrometheusMetrics()

			// Remove timestamps for comparison
			const cleanMetrics1 = metrics1.replace(/\d{13}/g, 'TIMESTAMP')
			const cleanMetrics2 = metrics2.replace(/\d{13}/g, 'TIMESTAMP')

			expect(cleanMetrics1).toBe(cleanMetrics2)
		})
	})
})
