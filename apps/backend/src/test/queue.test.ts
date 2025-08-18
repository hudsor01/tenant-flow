import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { QueueService } from '../queues/queue.service'
import { EmailProcessor } from '../email/processors/email.processor'
import { PaymentProcessor } from '../queues/processors/payment.processor'
import { BaseProcessor, ProcessorResult } from '../queues/base/base.processor'
import { EmailJobData, PaymentJobData } from '../queues/types/job.interfaces'
import {
	MockConfigService,
	MockQueue,
	createMockJob,
	TestTimer,
	TestModuleBuilder
} from './test-utilities'
import { Job } from 'bull'

describe('Queue System Integration', () => {
	let queueService: QueueService
	let emailProcessor: EmailProcessor
	let paymentProcessor: PaymentProcessor
	let mockEmailQueue: MockQueue
	let mockPaymentQueue: MockQueue
	let mockConfig: MockConfigService
	let timer: TestTimer

	beforeEach(async () => {
		mockEmailQueue = new MockQueue()
		mockPaymentQueue = new MockQueue()
		mockConfig = new MockConfigService()
		timer = new TestTimer()

		const module = await new TestModuleBuilder()
			.addProvider(QueueService)
			.addMockProvider('BullQueue_email', mockEmailQueue)
			.addMockProvider('BullQueue_payments', mockPaymentQueue)
			.addMockProvider('ConfigService', mockConfig)
			.build()

		queueService = module.get<QueueService>(QueueService)
	})

	describe('QueueService Operations', () => {
		it('should add email job successfully', async () => {
			const emailData: EmailJobData = {
				to: ['test@example.com'],
				template: 'welcome',
				data: { name: 'Test User' },
				priority: 'normal'
			}

			const job = await queueService.addEmailJob(
				'send-immediate',
				emailData
			)

			expect(job).toBeDefined()
			expect(mockEmailQueue.getAddedJobs()).toHaveLength(1)

			const addedJob = mockEmailQueue.getAddedJobs()[0]
			expect(addedJob.name).toBe('send-immediate')
			expect(addedJob.data).toEqual(emailData)
		})

		it('should add payment job successfully', async () => {
			const paymentData: PaymentJobData = {
				type: 'charge',
				paymentId: 'pay_123',
				amount: 5000,
				currency: 'usd',
				customerId: 'cus_123'
			}

			const job = await queueService.addPaymentJob(
				'process-payment',
				paymentData
			)

			expect(job).toBeDefined()
			expect(mockPaymentQueue.getAddedJobs()).toHaveLength(1)

			const addedJob = mockPaymentQueue.getAddedJobs()[0]
			expect(addedJob.name).toBe('process-payment')
			expect(addedJob.data).toEqual(paymentData)
		})

		it('should handle bulk job operations', async () => {
			const bulkEmailData = Array(5)
				.fill(null)
				.map((_, i) => ({
					name: 'send-bulk',
					data: {
						to: [`user${i}@example.com`],
						template: 'newsletter',
						data: { name: `User ${i}` }
					} as EmailJobData
				}))

			const jobs = await queueService.addBulkJobs('email', bulkEmailData)

			expect(jobs).toHaveLength(5)
			expect(mockEmailQueue.getBulkJobs()).toHaveLength(5)
		})

		it('should get queue statistics', async () => {
			mockEmailQueue.setCounts({
				waiting: 10,
				active: 2,
				completed: 50,
				failed: 3
			})

			const stats = await queueService.getQueueStats('email')

			expect(stats.waiting).toBe(10)
			expect(stats.active).toBe(2)
			expect(stats.completed).toBe(50)
			expect(stats.failed).toBe(3)
		})

		it('should pause and resume queues', async () => {
			await queueService.pauseQueue('email')
			expect(mockEmailQueue.isPaused()).toBe(true)

			await queueService.resumeQueue('email')
			expect(mockEmailQueue.isPaused()).toBe(false)
		})

		it('should clean completed jobs', async () => {
			const cleanSpy = jest.spyOn(mockEmailQueue, 'clean')

			await queueService.cleanQueue('email', 3600, 'completed')

			expect(cleanSpy).toHaveBeenCalledWith(3600, 'completed')
		})
	})

	describe('BaseProcessor Functionality', () => {
		let testProcessor: TestableBaseProcessor
		let mockJob: Job<EmailJobData>

		beforeEach(() => {
			testProcessor = new TestableBaseProcessor()
			mockJob = createMockJob({
				to: ['test@example.com'],
				template: 'test',
				data: { message: 'test' }
			})
		})

		it('should handle job processing successfully', async () => {
			testProcessor.setProcessResult({
				success: true,
				data: { result: 'processed' }
			})

			timer.start()
			const result = await testProcessor.handleJob(mockJob)
			const elapsed = timer.end()

			expect(result.success).toBe(true)
			expect(result.processingTime).toBeGreaterThan(0)
			expect(result.timestamp).toBeInstanceOf(Date)
			expect(elapsed).toBeLessThan(100) // Should be fast for mock processing
		})

		it('should handle job processing errors gracefully', async () => {
			testProcessor.setProcessResult({
				success: false,
				error: 'Processing failed'
			})

			const result = await testProcessor.handleJob(mockJob)

			expect(result.success).toBe(false)
			expect(result.error).toBe('Processing failed')
			expect(result.processingTime).toBeGreaterThan(0)
		})

		it('should validate job data correctly', () => {
			const validData: EmailJobData = {
				to: ['test@example.com'],
				template: 'test',
				data: {}
			}

			expect(() => testProcessor.validateJobData(validData)).not.toThrow()

			const invalidData = null as any
			expect(() => testProcessor.validateJobData(invalidData)).toThrow(
				'Job data is required'
			)
		})

		it('should sanitize sensitive data for logging', () => {
			const sensitiveData = {
				to: ['test@example.com'],
				template: 'test',
				data: {
					password: 'secret123',
					apiKey: 'key123',
					message: 'safe'
				}
			}

			const sanitized = testProcessor.sanitizeLogData(sensitiveData)

			expect(sanitized.to).toEqual(['test@example.com'])
			expect(sanitized.template).toBe('test')
			expect((sanitized as any).password).toBeUndefined()
			expect((sanitized as any).apiKey).toBeUndefined()
			expect((sanitized.data as any)?.message).toBe('safe')
		})

		it('should calculate retry delays with exponential backoff', () => {
			const delay1 = testProcessor.calculateRetryDelay(1)
			const delay2 = testProcessor.calculateRetryDelay(2)
			const delay3 = testProcessor.calculateRetryDelay(3)

			expect(delay2).toBeGreaterThan(delay1)
			expect(delay3).toBeGreaterThan(delay2)
			expect(delay3).toBeLessThan(60000) // Max delay cap
		})

		it('should determine retryable errors correctly', () => {
			const retryableErrors = [
				new Error('Network timeout'),
				new Error('Connection refused'),
				new Error('Service unavailable')
			]

			const nonRetryableErrors = [
				new Error('Validation failed: invalid email'),
				new Error('Unauthorized access'),
				new Error('Forbidden operation')
			]

			retryableErrors.forEach(error => {
				expect(testProcessor.isRetryableError(error)).toBe(true)
			})

			nonRetryableErrors.forEach(error => {
				expect(testProcessor.isRetryableError(error)).toBe(false)
			})
		})
	})

	describe('Email Processor Integration', () => {
		beforeEach(async () => {
			// Import the actual services for proper dependency injection
			const { EmailService } = await import('../email/email.service')
			const { EmailMetricsService } = await import(
				'../email/services/email-metrics.service'
			)

			const emailModule = await new TestModuleBuilder()
				.addProvider(EmailProcessor)
				.addMockProvider(EmailService, {
					sendWelcomeEmail: jest
						.fn()
						.mockImplementation((email: string) => {
							if (email === 'invalid-email') {
								return Promise.resolve({
									success: false,
									error: 'Invalid email address'
								})
							}
							return Promise.resolve({
								success: true,
								messageId: 'msg_123'
							})
						}),
					sendTenantInvitation: jest.fn().mockResolvedValue({
						success: true,
						messageId: 'msg_456'
					}),
					sendPaymentReminder: jest.fn().mockResolvedValue({
						success: true,
						messageId: 'msg_789'
					})
				})
				.addMockProvider(EmailMetricsService, {
					recordMetric: jest.fn()
				})
				.build()

			emailProcessor = emailModule.get<EmailProcessor>(EmailProcessor)
		})

		it('should process immediate email successfully', async () => {
			const emailJob = createMockJob({
				to: ['user@example.com'],
				template: 'welcome',
				data: { name: 'Test User', companySize: 'medium' as const }
			})

			const result = await emailProcessor.handleImmediateEmail(emailJob)

			expect(result.success).toBe(true)
			expect(result.messageId).toBe('msg_123')
			expect(result.recipientCount).toBe(1)
		})

		it('should process bulk emails efficiently', async () => {
			const bulkEmailJob = createMockJob({
				to: [
					'user1@example.com',
					'user2@example.com',
					'user3@example.com'
				],
				template: 'welcome',
				data: {
					name: 'Test User',
					companySize: 'medium',
					source: 'test'
				}
			})

			timer.start()
			const result = await emailProcessor.handleBulkEmail(bulkEmailJob)
			const elapsed = timer.end()

			expect(result.success).toBe(true)
			expect(result.recipientCount).toBe(3)
			expect(elapsed).toBeGreaterThan(1000) // Bulk processing has artificial delay
		})

		it('should validate email addresses correctly', async () => {
			const invalidEmailJob = createMockJob({
				to: ['invalid-email'],
				template: 'welcome',
				data: {}
			})

			const result =
				await emailProcessor.handleImmediateEmail(invalidEmailJob)

			// Check for structured error response instead of exception
			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid email address')
		})

		it('should handle email template routing', async () => {
			const templates = [
				{ template: 'welcome', data: { name: 'User' } },
				{
					template: 'tenant-invitation',
					data: {
						tenantName: 'John',
						propertyAddress: '123 Main St',
						invitationLink: 'https://invite.com',
						landlordName: 'Bob'
					}
				},
				{
					template: 'payment-reminder',
					data: {
						tenantName: 'Jane',
						amountDue: 1000,
						dueDate: '2024-01-01',
						propertyAddress: '456 Oak St',
						paymentLink: 'https://pay.com'
					}
				}
			]

			for (const { template, data } of templates) {
				const emailJob = createMockJob({
					to: ['user@example.com'],
					template,
					data
				})

				const result =
					await emailProcessor.handleImmediateEmail(emailJob)
				expect(result.success).toBe(true)
			}
		})
	})

	describe('Payment Processor Integration', () => {
		beforeEach(async () => {
			// PaymentProcessor only extends BaseProcessor, no external dependencies
			const paymentModule = await new TestModuleBuilder()
				.addProvider(PaymentProcessor)
				.build()

			paymentProcessor =
				paymentModule.get<PaymentProcessor>(PaymentProcessor)
		})

		it('should process payment charge successfully', async () => {
			const paymentJob = createMockJob({
				type: 'charge' as const,
				paymentId: 'pay_123',
				amount: 5000,
				currency: 'usd',
				customerId: 'cus_123'
			})

			const result = await paymentProcessor.handleCharge(paymentJob)
			expect(result).toBeUndefined() // Method doesn't return a value, just processes
		})

		it('should process refund successfully', async () => {
			const refundJob = createMockJob({
				type: 'refund' as const,
				paymentId: 'pay_123',
				amount: 2500,
				currency: 'usd',
				customerId: 'cus_123'
			})

			const result = await paymentProcessor.handleRefund(refundJob)
			expect(result).toBeUndefined() // Method doesn't return a value, just processes
		})

		it('should validate payment amounts', async () => {
			const invalidPaymentJob = createMockJob({
				type: 'charge' as const,
				paymentId: 'pay_123',
				amount: -100, // Invalid negative amount
				currency: 'usd',
				customerId: 'cus_123'
			})

			await expect(
				paymentProcessor.handleCharge(invalidPaymentJob)
			).rejects.toThrow(
				'Amount is required and must be positive for charges'
			)
		})

		it('should handle different payment types', async () => {
			const paymentJobs = [
				{ type: 'charge' as const, method: 'handleCharge' },
				{ type: 'refund' as const, method: 'handleRefund' },
				{ type: 'subscription' as const, method: 'handleSubscription' },
				{ type: 'invoice' as const, method: 'handleInvoice' }
			]

			for (const { type, method } of paymentJobs) {
				const paymentJob = createMockJob({
					type,
					paymentId: `pay_${type}`,
					amount: 1000,
					currency: 'usd',
					customerId: 'cus_123'
				})

				const result = await (paymentProcessor as any)[method](
					paymentJob
				)
				expect(result).toBeUndefined() // All methods just process without return
			}
		})
	})

	describe('Queue Performance and Reliability', () => {
		it('should handle high-volume job processing', async () => {
			const jobCount = 100
			const jobs = Array(jobCount)
				.fill(null)
				.map((_, i) => ({
					to: [`user${i}@example.com`],
					template: 'bulk-notification',
					data: { userId: i }
				}))

			timer.start()
			const promises = jobs.map(data =>
				queueService.addEmailJob('send-immediate', data)
			)
			await Promise.all(promises)
			const elapsed = timer.end()

			expect(mockEmailQueue.getAddedJobs()).toHaveLength(jobCount)
			expect(elapsed).toBeLessThan(5000) // Should handle 100 jobs under 5 seconds
		})

		it('should handle concurrent queue operations safely', async () => {
			const operations = [
				() =>
					queueService.addEmailJob('send-immediate', {
						to: ['test1@example.com'],
						template: 'test',
						data: {}
					}),
				() =>
					queueService.addPaymentJob('process-payment', {
						type: 'charge',
						paymentId: 'pay_1',
						customerId: 'cus_1'
					}),
				() => queueService.getQueueStats('email'),
				() => queueService.pauseQueue('payments'),
				() => queueService.resumeQueue('payments')
			]

			await expect(
				Promise.all(operations.map(op => op()))
			).resolves.toBeDefined()
		})

		it('should maintain queue isolation', async () => {
			await queueService.addEmailJob('send-immediate', {
				to: ['email@test.com'],
				template: 'test',
				data: {}
			})
			await queueService.addPaymentJob('process-payment', {
				type: 'charge',
				paymentId: 'pay_1',
				customerId: 'cus_1'
			})

			expect(mockEmailQueue.getAddedJobs()).toHaveLength(1)
			expect(mockPaymentQueue.getAddedJobs()).toHaveLength(1)

			// Operations on one queue shouldn't affect the other
			await queueService.pauseQueue('email')
			expect(mockEmailQueue.isPaused()).toBe(true)
			expect(mockPaymentQueue.isPaused()).toBe(false)
		})
	})

	describe('Error Handling and Recovery', () => {
		it('should handle queue connection failures gracefully', async () => {
			const faultyQueue = new MockQueue()
			faultyQueue.add = jest
				.fn()
				.mockRejectedValue(new Error('Redis connection failed'))

			const faultyService = new QueueService(
				faultyQueue as any,
				faultyQueue as any
			)

			await expect(
				faultyService.addEmailJob('send-immediate', {
					to: ['test@example.com'],
					template: 'test',
					data: {}
				})
			).rejects.toThrow('Redis connection failed')
		})

		it('should provide meaningful error messages', async () => {
			try {
				await queueService.addEmailJob('send-immediate', null as any)
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('data')
			}
		})

		it('should handle processor failures without crashing', async () => {
			const failingProcessor = new TestableBaseProcessor()
			failingProcessor.setProcessResult({
				success: false,
				error: 'Processor crashed'
			})

			const job = createMockJob({
				to: ['test@example.com'],
				template: 'test',
				data: {}
			})
			const result = await failingProcessor.handleJob(job)

			expect(result.success).toBe(false)
			expect(result.error).toBe('Processor crashed')
		})
	})
})

// Test implementation of BaseProcessor for testing
class TestableBaseProcessor extends BaseProcessor<EmailJobData> {
	private processResult: Partial<ProcessorResult> = { success: true }

	constructor() {
		super('TestProcessor')
	}

	setProcessResult(result: Partial<ProcessorResult>) {
		this.processResult = result
	}

	protected async processJob(
		_job: Job<EmailJobData>
	): Promise<ProcessorResult> {
		// Simulate processing time
		await new Promise(resolve => setTimeout(resolve, 10))

		return {
			success: this.processResult.success ?? true,
			data: this.processResult.data,
			error: this.processResult.error,
			processingTime: 10,
			timestamp: new Date()
		}
	}

	// Expose protected methods for testing
	public validateJobData(data: EmailJobData): void {
		super.validateJobData(data)
	}

	public sanitizeLogData(data: EmailJobData): Partial<EmailJobData> {
		return super.sanitizeLogData(data)
	}

	public calculateRetryDelay(
		attemptNumber: number,
		baseDelay?: number,
		maxDelay?: number
	): number {
		return super.calculateRetryDelay(attemptNumber, baseDelay, maxDelay)
	}

	public isRetryableError(error: Error): boolean {
		return super.isRetryableError(error)
	}
}
