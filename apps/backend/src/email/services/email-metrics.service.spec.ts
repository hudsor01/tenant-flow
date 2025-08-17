import { Test, TestingModule } from '@nestjs/testing'
import {
	EmailMetricsService,
	EmailMetric,
	TemplateStats
} from './email-metrics.service'

// Mock schedule module
jest.mock('@nestjs/schedule', () => ({
	Cron: () => (target: any, propertyKey: string) => {},
	CronExpression: {
		EVERY_HOUR: '0 * * * *',
		EVERY_DAY_AT_9AM: '0 9 * * *',
		EVERY_DAY_AT_MIDNIGHT: '0 0 * * *'
	}
}))

describe('EmailMetricsService', () => {
	let service: EmailMetricsService

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [EmailMetricsService]
		}).compile()

		service = module.get<EmailMetricsService>(EmailMetricsService)
	})

	describe('recordMetric', () => {
		it('should record email metric with generated ID and timestamp', () => {
			const metricData = {
				template: 'welcome',
				recipient: 'test@example.com',
				status: 'sent' as const,
				processingTime: 500,
				messageId: 'msg_123'
			}

			service.recordMetric(metricData)

			const metrics = service.getMetrics({ limit: 1 })
			expect(metrics).toHaveLength(1)
			expect(metrics[0]).toMatchObject({
				id: expect.stringMatching(/^metric_\d+_[a-z0-9]+$/),
				timestamp: expect.any(Date),
				...metricData
			})
		})

		it('should maintain metrics within maxMetrics limit', () => {
			// Record more metrics than the limit
			for (let i = 0; i < 10002; i++) {
				service.recordMetric({
					template: 'welcome',
					recipient: `test${i}@example.com`,
					status: 'sent'
				})
			}

			const metrics = service.getMetrics({})
			expect(metrics.length).toBeLessThanOrEqual(10000)
		})

		it('should log warning for failed emails', () => {
			const loggerSpy = jest
				.spyOn(service['logger'], 'warn')
				.mockImplementation()

			service.recordMetric({
				template: 'welcome',
				recipient: 'test@example.com',
				status: 'failed',
				error: 'API Error'
			})

			expect(loggerSpy).toHaveBeenCalledWith('Email failed', {
				template: 'welcome',
				recipient: 'test@example.com',
				error: 'API Error'
			})

			loggerSpy.mockRestore()
		})
	})

	describe('getSystemStats', () => {
		beforeEach(() => {
			// Clear any existing metrics
			service['metrics'] = []
		})

		it('should return correct system statistics', () => {
			// Record test metrics
			const testMetrics = [
				{
					template: 'welcome',
					recipient: 'user1@test.com',
					status: 'sent',
					processingTime: 200
				},
				{
					template: 'welcome',
					recipient: 'user2@test.com',
					status: 'delivered',
					processingTime: 300
				},
				{
					template: 'payment-reminder',
					recipient: 'user3@test.com',
					status: 'failed'
				},
				{
					template: 'tenant-invitation',
					recipient: 'user4@test.com',
					status: 'opened',
					processingTime: 150
				}
			] as const

			testMetrics.forEach(metric => service.recordMetric(metric))

			const stats = service.getSystemStats()

			expect(stats).toMatchObject({
				totalSent: 3, // sent, delivered, opened
				totalFailed: 1, // failed
				successRate: 75, // 3/4 * 100
				avgProcessingTime: expect.closeTo(216.67, 2), // (200 + 300 + 150) / 3
				lastHour: 4,
				last24Hours: 4,
				last7Days: 4,
				templatesStats: expect.arrayContaining([
					expect.objectContaining({
						template: 'welcome',
						sent: 2,
						failed: 0
					}),
					expect.objectContaining({
						template: 'payment-reminder',
						sent: 0,
						failed: 1
					})
				])
			})
		})

		it('should handle empty metrics gracefully', () => {
			const stats = service.getSystemStats()

			expect(stats).toMatchObject({
				totalSent: 0,
				totalFailed: 0,
				successRate: 0,
				avgProcessingTime: 0,
				lastHour: 0,
				last24Hours: 0,
				last7Days: 0,
				templatesStats: []
			})
		})

		it('should filter metrics by time ranges correctly', () => {
			// Clear existing metrics first
			service['metrics'] = []

			// Use jest.spyOn to mock Date.now
			const currentTime = Date.now()
			const oneHour = 60 * 60 * 1000
			const oneDay = 24 * oneHour
			const dateSpy = jest.spyOn(Date, 'now')

			// Manually create metrics with specific timestamps relative to current time
			const veryRecentMetric = {
				id: 'very_recent_metric',
				template: 'welcome',
				recipient: 'very_recent@test.com',
				status: 'sent' as const,
				timestamp: new Date(currentTime - 30 * 60 * 1000) // 30 minutes ago (within last hour)
			}

			const recentMetric = {
				id: 'recent_metric',
				template: 'welcome',
				recipient: 'recent@test.com',
				status: 'sent' as const,
				timestamp: new Date(currentTime - 2 * oneHour) // 2 hours ago (within last 24 hours, outside last hour)
			}

			const oldMetric = {
				id: 'old_metric',
				template: 'welcome',
				recipient: 'old@test.com',
				status: 'sent' as const,
				timestamp: new Date(currentTime - 2 * oneDay) // 2 days ago (outside last 24 hours, within last 7 days)
			}

			service['metrics'] = [veryRecentMetric, recentMetric, oldMetric]

			// Set current time for stats calculation
			dateSpy.mockReturnValue(currentTime)

			const stats = service.getSystemStats()

			expect(stats.lastHour).toBe(1) // veryRecentMetric only
			expect(stats.last24Hours).toBe(2) // veryRecentMetric and recentMetric
			expect(stats.last7Days).toBe(3) // All metrics

			// Restore Date.now
			dateSpy.mockRestore()
		})
	})

	describe('getTemplateStats', () => {
		beforeEach(() => {
			service['metrics'] = []
		})

		it('should calculate template statistics correctly', () => {
			const testMetrics = [
				{
					template: 'welcome',
					recipient: 'user1@test.com',
					status: 'sent',
					processingTime: 200
				},
				{
					template: 'welcome',
					recipient: 'user2@test.com',
					status: 'delivered',
					processingTime: 300
				},
				{
					template: 'welcome',
					recipient: 'user3@test.com',
					status: 'opened',
					processingTime: 250
				},
				{
					template: 'welcome',
					recipient: 'user4@test.com',
					status: 'clicked',
					processingTime: 180
				},
				{
					template: 'welcome',
					recipient: 'user5@test.com',
					status: 'failed'
				},
				{
					template: 'payment-reminder',
					recipient: 'user6@test.com',
					status: 'bounced'
				}
			] as const

			testMetrics.forEach(metric => service.recordMetric(metric))

			const templateStats = service.getTemplateStats()
			const welcomeStats = templateStats.find(
				t => t.template === 'welcome'
			)

			expect(welcomeStats).toMatchObject({
				template: 'welcome',
				sent: 4, // sent, delivered, opened, clicked
				failed: 1, // failed
				bounced: 0,
				delivered: 3, // delivered, opened, clicked
				opened: 2, // opened, clicked
				clicked: 1, // clicked
				deliveryRate: 75, // 3/4 * 100
				openRate: expect.closeTo(66.67, 1), // 2/3 * 100 (approximately) - more tolerance
				clickRate: 50, // 1/2 * 100
				avgProcessingTime: 232.5 // (200 + 300 + 250 + 180) / 4
			})
		})

		it('should handle templates with no metrics', () => {
			const templateStats = service.getTemplateStats()
			expect(templateStats).toEqual([])
		})
	})

	describe('getMetrics', () => {
		beforeEach(() => {
			service['metrics'] = []

			// Record test data with specific timestamps
			const baseTime = 1640995200000 // Fixed base time
			const testMetrics = [
				{
					template: 'welcome',
					recipient: 'user1@test.com',
					status: 'sent',
					timestamp: new Date(baseTime - 1000)
				},
				{
					template: 'payment-reminder',
					recipient: 'user2@test.com',
					status: 'failed',
					timestamp: new Date(baseTime - 2000)
				},
				{
					template: 'welcome',
					recipient: 'user3@test.com',
					status: 'delivered',
					timestamp: new Date(baseTime - 3000)
				}
			] as const

			testMetrics.forEach((metric, index) => {
				service['metrics'].push({
					id: `test_${baseTime}_${index}`,
					...metric
				} as EmailMetric)
			})
		})

		it('should filter by template', () => {
			const metrics = service.getMetrics({ template: 'welcome' })
			expect(metrics).toHaveLength(2)
			expect(metrics.every(m => m.template === 'welcome')).toBe(true)
		})

		it('should filter by status', () => {
			const metrics = service.getMetrics({ status: 'sent' })
			expect(metrics).toHaveLength(1)
			expect(metrics[0].status).toBe('sent')
		})

		it('should filter by date range', () => {
			const baseTime = 1640995200000
			const startDate = new Date(baseTime - 2500)
			const endDate = new Date(baseTime - 1500)

			const metrics = service.getMetrics({ startDate, endDate })
			expect(metrics).toHaveLength(1)
			expect(metrics[0].recipient).toBe('user2@test.com')
		})

		it('should limit results', () => {
			const metrics = service.getMetrics({ limit: 2 })
			expect(metrics).toHaveLength(2)
		})
	})

	describe('getAlerts', () => {
		beforeEach(() => {
			service['metrics'] = []
		})

		it('should return critical alert for very low success rate', () => {
			// Create mostly failed metrics
			for (let i = 0; i < 100; i++) {
				service.recordMetric({
					template: 'welcome',
					recipient: `user${i}@test.com`,
					status: i < 85 ? 'failed' : 'sent' // 15% success rate
				})
			}

			const alerts = service.getAlerts()
			const criticalAlert = alerts.find(a => a.level === 'critical')

			expect(criticalAlert).toMatchObject({
				level: 'critical',
				message: 'Email success rate critically low',
				metric: 'successRate',
				value: 15,
				threshold: 90
			})
		})

		it('should return warning alert for moderately low success rate', () => {
			// Create metrics with 92% success rate
			for (let i = 0; i < 100; i++) {
				service.recordMetric({
					template: 'welcome',
					recipient: `user${i}@test.com`,
					status: i < 8 ? 'failed' : 'sent' // 92% success rate
				})
			}

			const alerts = service.getAlerts()
			const warningAlert = alerts.find(
				a => a.level === 'warning' && a.metric === 'successRate'
			)

			expect(warningAlert).toMatchObject({
				level: 'warning',
				message: 'Email success rate below target',
				metric: 'successRate',
				value: 92,
				threshold: 95
			})
		})

		it('should return warning for high processing times', () => {
			service.recordMetric({
				template: 'welcome',
				recipient: 'user@test.com',
				status: 'sent',
				processingTime: 5000 // 5 seconds
			})

			const alerts = service.getAlerts()
			const processingAlert = alerts.find(
				a => a.metric === 'avgProcessingTime'
			)

			expect(processingAlert).toMatchObject({
				level: 'warning',
				message: 'High email processing times',
				metric: 'avgProcessingTime',
				value: 5000,
				threshold: 3000
			})
		})

		it('should return template-specific alerts', () => {
			// Clear any existing metrics first
			service['metrics'] = []

			// Create template with low delivery rate
			// Need enough sent emails (> 10) and low delivery rate (< 90%)
			// Create 15 sent and 5 failed to ensure sent > 10
			for (let i = 0; i < 15; i++) {
				service.recordMetric({
					template: 'payment-reminder',
					recipient: `user${i}@test.com`,
					status: 'sent' // These count as sent
				})
			}

			// Add some failed ones to lower the delivery rate
			// Only 5 out of 15 sent will be "delivered" = 33% delivery rate
			for (let i = 15; i < 20; i++) {
				service.recordMetric({
					template: 'payment-reminder',
					recipient: `user${i}@test.com`,
					status: 'failed'
				})
			}

			// Add some delivered to get actual deliveries (but keep rate low)
			for (let i = 20; i < 25; i++) {
				service.recordMetric({
					template: 'payment-reminder',
					recipient: `user${i}@test.com`,
					status: 'delivered'
				})
			}

			const alerts = service.getAlerts()
			const templateAlert = alerts.find(a =>
				a.message.includes('Template payment-reminder')
			)

			expect(templateAlert).toMatchObject({
				level: 'warning',
				message: 'Template payment-reminder has low delivery rate',
				metric: 'deliveryRate',
				value: expect.any(Number),
				threshold: 90
			})

			// Check that the delivery rate is indeed low
			expect(templateAlert?.value).toBeLessThan(90)
		})

		it('should return empty array when no alerts', () => {
			// Create good metrics
			for (let i = 0; i < 10; i++) {
				service.recordMetric({
					template: 'welcome',
					recipient: `user${i}@test.com`,
					status: 'delivered',
					processingTime: 200
				})
			}

			const alerts = service.getAlerts()
			expect(alerts).toEqual([])
		})
	})

	describe('Cron Jobs', () => {
		it('should generate hourly report', () => {
			const loggerSpy = jest
				.spyOn(service['logger'], 'log')
				.mockImplementation()

			// Record some test data
			service.recordMetric({
				template: 'welcome',
				recipient: 'user@test.com',
				status: 'sent',
				processingTime: 300
			})

			service.generateHourlyReport()

			expect(loggerSpy).toHaveBeenCalledWith(
				'📊 Hourly Email Report',
				expect.objectContaining({
					totalSent: expect.any(Number),
					successRate: expect.stringMatching(/\d+\.\d%/),
					lastHour: expect.any(Number),
					avgProcessingTime: expect.stringMatching(/\d+ms/)
				})
			)

			loggerSpy.mockRestore()
		})

		it('should generate daily report', () => {
			const loggerSpy = jest
				.spyOn(service['logger'], 'log')
				.mockImplementation()

			service.generateDailyReport()

			expect(loggerSpy).toHaveBeenCalledWith(
				'📈 Daily Email Report',
				expect.objectContaining({
					last24Hours: expect.any(Number),
					successRate: expect.stringMatching(/\d+\.\d%/),
					templateBreakdown: expect.any(Object)
				})
			)

			loggerSpy.mockRestore()
		})

		it('should cleanup old metrics', () => {
			const debugSpy = jest
				.spyOn(service['logger'], 'debug')
				.mockImplementation()

			// Add old metrics
			const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
			service['metrics'] = [
				{
					id: 'old_1',
					template: 'welcome',
					recipient: 'old@test.com',
					status: 'sent',
					timestamp: new Date(oldTime)
				} as EmailMetric
			]

			service.cleanupOldMetrics()

			expect(service['metrics']).toHaveLength(0)
			expect(debugSpy).toHaveBeenCalledWith(
				'Cleaned up 1 old metrics',
				expect.objectContaining({
					before: 1,
					after: 0
				})
			)

			debugSpy.mockRestore()
		})
	})
})
