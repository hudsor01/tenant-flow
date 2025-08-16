import {
	Body,
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Param,
	Post,
	Query
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { EmailService } from '../email.service'
import { EmailQueueService } from '../services/email-queue.service'
import { EmailMetricsService } from '../services/email-metrics.service'
import {
	EmailTemplateName,
	type ExtractEmailData
} from '../types/email-templates.types'

@ApiTags('Email')
@Controller('email')
export class EmailController {
	constructor(
		private readonly emailService: EmailService,
		private readonly queueService: EmailQueueService,
		private readonly metricsService: EmailMetricsService
	) {}

	/**
	 * Email service health check
	 */
	@Get('health')
	@ApiOperation({ summary: 'Get email service health status' })
	@ApiResponse({
		status: 200,
		description: 'Health status retrieved successfully'
	})
	async getHealthStatus() {
		const emailHealth = this.emailService.getHealthStatus()
		const queueHealth = await this.queueService.getQueueHealth()
		const systemStats = this.metricsService.getSystemStats()
		const alerts = this.metricsService.getAlerts()

		return {
			status: emailHealth.healthy ? 'healthy' : 'unhealthy',
			timestamp: new Date().toISOString(),
			services: {
				emailService: {
					healthy: emailHealth.healthy,
					circuitBreaker: emailHealth.circuitBreakerState,
					failureCount: emailHealth.failureCount,
					lastFailure: emailHealth.lastFailureTime
				},
				queueService: {
					redis: queueHealth.redis,
					workers: queueHealth.workers,
					queues: Object.keys(queueHealth.queues).reduce(
						(acc, key) => {
							acc[key] = {
								queueDepth:
									queueHealth.queues[
										key as keyof typeof queueHealth.queues
									].queueDepth,
								sent: queueHealth.queues[
									key as keyof typeof queueHealth.queues
								].sent,
								failed: queueHealth.queues[
									key as keyof typeof queueHealth.queues
								].failed
							}
							return acc
						},
						{} as Record<string, unknown>
					)
				}
			},
			metrics: {
				totalSent: systemStats.totalSent,
				totalFailed: systemStats.totalFailed,
				successRate: systemStats.successRate,
				avgProcessingTime: systemStats.avgProcessingTime,
				lastHour: systemStats.lastHour,
				last24Hours: systemStats.last24Hours
			},
			alerts: alerts.length > 0 ? alerts : undefined
		}
	}

	/**
	 * Get email metrics
	 */
	@Get('metrics')
	@ApiOperation({ summary: 'Get email system metrics' })
	@ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
	async getMetrics(@Query('template') template?: string) {
		const systemStats = this.metricsService.getSystemStats()

		let templateStats = systemStats.templatesStats

		if (template) {
			templateStats = templateStats.filter(t => t.template === template)
		}

		return {
			system: {
				totalSent: systemStats.totalSent,
				totalFailed: systemStats.totalFailed,
				successRate: systemStats.successRate,
				avgProcessingTime: systemStats.avgProcessingTime,
				queueDepth: systemStats.queueDepth
			},
			timeframes: {
				lastHour: systemStats.lastHour,
				last24Hours: systemStats.last24Hours,
				last7Days: systemStats.last7Days
			},
			templates: templateStats.map(t => ({
				template: t.template,
				sent: t.sent,
				failed: t.failed,
				deliveryRate: t.deliveryRate,
				openRate: t.openRate,
				clickRate: t.clickRate,
				avgProcessingTime: t.avgProcessingTime
			}))
		}
	}

	/**
	 * Get queue status
	 */
	@Get('queue/status')
	@ApiOperation({ summary: 'Get email queue status' })
	@ApiResponse({
		status: 200,
		description: 'Queue status retrieved successfully'
	})
	async getQueueStatus() {
		const queueHealth = await this.queueService.getQueueHealth()

		return {
			redis: queueHealth.redis,
			workers: queueHealth.workers,
			queues: {
				immediate: {
					name: 'Immediate Emails',
					description: 'Welcome, invitations, critical notifications',
					...queueHealth.queues.immediate
				},
				scheduled: {
					name: 'Scheduled Emails',
					description:
						'Payment reminders, lease alerts, scheduled campaigns',
					...queueHealth.queues.scheduled
				},
				bulk: {
					name: 'Bulk Campaigns',
					description: 'Newsletter, announcements, marketing emails',
					...queueHealth.queues.bulk
				},
				deadLetter: {
					name: 'Dead Letter Queue',
					description: 'Failed emails requiring manual intervention',
					...queueHealth.queues.deadLetter
				}
			}
		}
	}

	/**
	 * Send test email
	 */
	@Post('test')
	@ApiOperation({ summary: 'Send test email' })
	@ApiResponse({ status: 200, description: 'Test email sent successfully' })
	async sendTestEmail(
		@Body()
		body: {
			to: string
			template: EmailTemplateName
			data?: unknown
		}
	) {
		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(body.to)) {
			throw new HttpException(
				'Invalid email address',
				HttpStatus.BAD_REQUEST
			)
		}

		// Default test data based on template
		const testData = this.getTestData(body.template, body.data)

		try {
			// Send via queue for consistency
			const job = await this.queueService.addImmediateEmail(
				body.to,
				body.template,
				testData,
				{
					trackingId: `test_${Date.now()}`
				}
			)

			return {
				success: true,
				jobId: job.id || 'unknown',
				message: `Test email queued for ${body.to}`,
				template: body.template,
				data: testData
			}
		} catch (error) {
			throw new HttpException(
				`Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Retry failed email
	 */
	@Post('retry/:jobId')
	@ApiOperation({ summary: 'Retry failed email job' })
	@ApiResponse({
		status: 200,
		description: 'Email retry queued successfully'
	})
	async retryFailedEmail(@Param('jobId') jobId: string) {
		try {
			const retryJob = await this.queueService.retryFailedEmail(jobId)

			if (!retryJob) {
				throw new HttpException(
					'Failed job not found',
					HttpStatus.NOT_FOUND
				)
			}

			return {
				success: true,
				retryJobId: retryJob.id,
				originalJobId: jobId,
				message: 'Email retry queued successfully'
			}
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				`Failed to retry email: ${error instanceof Error ? error.message : 'Unknown error'}`,
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Pause email queue
	 */
	@Post('queue/pause')
	@ApiOperation({ summary: 'Pause email queue processing' })
	@ApiResponse({
		status: 200,
		description: 'Email queue paused successfully'
	})
	async pauseQueue() {
		await this.queueService.pauseQueue()
		return {
			success: true,
			message: 'Email queue paused',
			timestamp: new Date().toISOString()
		}
	}

	/**
	 * Resume email queue
	 */
	@Post('queue/resume')
	@ApiOperation({ summary: 'Resume email queue processing' })
	@ApiResponse({
		status: 200,
		description: 'Email queue resumed successfully'
	})
	async resumeQueue() {
		await this.queueService.resumeQueue()
		return {
			success: true,
			message: 'Email queue resumed',
			timestamp: new Date().toISOString()
		}
	}

	/**
	 * Get test data for templates
	 */
	private getTestData<T extends EmailTemplateName>(
		template: T,
		providedData?: unknown
	): ExtractEmailData<T> {
		const providedDataObject =
			providedData && typeof providedData === 'object' ? providedData : {}

		switch (template) {
			case 'welcome':
				return {
					name: 'Test User',
					companySize: 'medium' as const,
					source: 'test',
					...providedDataObject
				} as ExtractEmailData<T>

			case 'tenant-invitation':
				return {
					tenantName: 'Test Tenant',
					propertyAddress: '123 Test Street, Test City, TC 12345',
					invitationLink: 'https://tenantflow.app/invite/test123',
					landlordName: 'Test Landlord',
					...providedDataObject
				} as ExtractEmailData<T>

			case 'payment-reminder':
				return {
					tenantName: 'Test Tenant',
					amountDue: 1500,
					dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
					propertyAddress: '123 Test Street, Test City, TC 12345',
					paymentLink: 'https://tenantflow.app/pay/test123',
					...providedDataObject
				} as ExtractEmailData<T>

			case 'lease-expiration':
				return {
					tenantName: 'Test Tenant',
					propertyAddress: '123 Test Street, Test City, TC 12345',
					expirationDate: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000
					),
					renewalLink: 'https://tenantflow.app/renew/test123',
					leaseId: 'lease_test_123',
					...providedDataObject
				} as ExtractEmailData<T>

			case 'property-tips':
				return {
					landlordName: 'Test Landlord',
					tips: [
						'Keep your property well-maintained to attract quality tenants',
						'Screen tenants thoroughly to reduce turnover',
						'Stay updated on local rental laws and regulations'
					],
					...providedDataObject
				} as ExtractEmailData<T>

			case 'feature-announcement':
				return {
					userName: 'Test User',
					features: [
						{
							title: 'Enhanced Dashboard',
							description: 'New analytics and reporting features'
						},
						{
							title: 'Mobile App',
							description: 'Manage your properties on the go'
						}
					],
					actionUrl: 'https://tenantflow.app/features',
					...providedDataObject
				} as ExtractEmailData<T>

			case 're-engagement':
				return {
					firstName: 'Test',
					lastActiveDate: '30 days ago',
					specialOffer: {
						title: 'Welcome Back!',
						description: 'Special offer for returning users',
						discount: '20%',
						expires: new Date(
							Date.now() + 30 * 24 * 60 * 60 * 1000
						).toISOString()
					},
					...providedDataObject
				} as ExtractEmailData<T>

			case 'day3-education':
				return {
					firstName: 'Test',
					...providedDataObject
				} as ExtractEmailData<T>

			case 'day7-demo':
				return {
					firstName: 'Test',
					demoLink: 'https://tenantflow.app/demo',
					...providedDataObject
				} as ExtractEmailData<T>

			default:
				return providedDataObject as ExtractEmailData<T>
		}
	}
}
