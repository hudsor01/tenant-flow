import { Test, TestingModule } from '@nestjs/testing'
import { BullModule, getQueueToken } from '@nestjs/bull'
import { Queue } from 'bull'
import { QueueModule, QUEUE_NAMES } from '../../queue.module'
import { QueueService } from '../../queue.service'
import { QueueErrorHandlerService } from '../../services/queue-error-handler.service'
import { QueueMetricsService } from '../../services/queue-metrics.service'
import { EmailProcessor } from '../../../email/processors/email.processor'
import { PaymentProcessor } from '../../processors/payment.processor'
import { EmailService } from '../../../email/email.service'
import { EmailMetricsService } from '../../../email/services/email-metrics.service'
import {
  QueueTestDataFactory,
  MockQueueFactory,
  QueueTestEnvironment,
  QueueTestTiming,
  QueueTestAssertions,
  TestErrorFactory
} from '../shared/queue-test-utilities'

describe('Queue Flow Integration', () => {
  let module: TestingModule
  let queueService: QueueService
  let errorHandler: QueueErrorHandlerService
  let metricsService: QueueMetricsService
  let emailProcessor: EmailProcessor
  let paymentProcessor: PaymentProcessor
  let emailQueue: jest.Mocked<Queue>
  let paymentQueue: jest.Mocked<Queue>

  beforeAll(() => {
    QueueTestEnvironment.setupTestTimeout()
    QueueTestEnvironment.setupProcessEnv()
  })

  beforeEach(async () => {
    // Create mock queues
    emailQueue = MockQueueFactory.createQueue('email')
    paymentQueue = MockQueueFactory.createQueue('payments')

    // Create mock EmailService and EmailMetricsService
    const mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_123' }),
      sendTenantInvitation: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_456' }),
      sendPaymentReminder: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_789' }),
      sendLeaseExpirationAlert: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_abc' }),
      sendPropertyTips: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_def' }),
      sendFeatureAnnouncement: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_ghi' }),
      sendReEngagementEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_jkl' })
    }

    const mockEmailMetricsService = {
      recordMetric: jest.fn()
    }

    module = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({
          redis: { host: 'localhost', port: 6379 }
        })
      ],
      providers: [
        QueueService,
        QueueErrorHandlerService,
        QueueMetricsService,
        EmailProcessor,
        PaymentProcessor,
        {
          provide: getQueueToken(QUEUE_NAMES.EMAILS),
          useValue: emailQueue
        },
        {
          provide: getQueueToken(QUEUE_NAMES.PAYMENTS),
          useValue: paymentQueue
        },
        {
          provide: EmailService,
          useValue: mockEmailService
        },
        {
          provide: EmailMetricsService,
          useValue: mockEmailMetricsService
        }
      ]
    }).compile()

    queueService = module.get<QueueService>(QueueService)
    errorHandler = module.get<QueueErrorHandlerService>(QueueErrorHandlerService)
    metricsService = module.get<QueueMetricsService>(QueueMetricsService)
    emailProcessor = module.get<EmailProcessor>(EmailProcessor)
    paymentProcessor = module.get<PaymentProcessor>(PaymentProcessor)

    jest.clearAllMocks()
  })

  afterEach(async () => {
    await module.close()
  })

  afterAll(() => {
    QueueTestEnvironment.cleanupProcessEnv()
  })

  describe('Complete Email Flow', () => {
    it('should process email job from start to finish', async () => {
      const emailData = QueueTestDataFactory.createEmailJobData({
        template: 'welcome',
        data: { name: 'Test User', companySize: 'medium', source: 'organic' }
      })

      // Step 1: Add job to queue
      const mockJob = { 
        id: 123, 
        data: emailData,
        progress: jest.fn().mockResolvedValue(undefined),
        attemptsMade: 0
      }
      emailQueue.add.mockResolvedValue(mockJob as any)

      const addedJob = await queueService.addEmailJob(emailData)
      expect(addedJob).toBe(mockJob)

      // Step 2: Process job through EmailProcessor
      const jobResult = await emailProcessor.handleImmediateEmail(mockJob as any)

      // Step 3: Verify successful processing
      expect(jobResult.success).toBe(true)
      expect(jobResult.messageId).toBe('msg_123')
      expect(jobResult.recipientCount).toBe(emailData.to.length)

      // Step 4: Verify queue operations
      QueueTestAssertions.expectQueueOperation(emailQueue, 'add')
      expect(mockJob.progress).toHaveBeenCalled()
    })

    it('should handle email processing failure with retry logic', async () => {
      const emailData = QueueTestDataFactory.createEmailJobData()
      const mockJob = { 
        id: 456, 
        data: emailData,
        progress: jest.fn().mockResolvedValue(undefined),
        attemptsMade: 1,
        queue: { name: 'email' }
      }

      // Simulate processing failure
      const processingError = TestErrorFactory.createNetworkError('Email service unavailable')
      
      // Step 1: Handle job failure through error handler
      const errorResult = await errorHandler.handleJobFailure(mockJob as any, processingError)

      // Step 2: Verify retry strategy
      expect(errorResult.shouldRetry).toBe(true)
      expect(errorResult.retryDelay).toBeGreaterThan(0)
      expect(errorResult.maxRetries).toBe(5) // Email queue allows 5 retries
    })

    it('should process bulk email jobs efficiently', async () => {
      const bulkJobs = Array(3).fill(0).map((_, i) => ({
        name: 'send-bulk',
        data: QueueTestDataFactory.createEmailJobData({ 
          to: [`user${i}@test.com`],
          template: 'feature-announcement'
        })
      }))

      const mockBulkJobs = bulkJobs.map((_, i) => ({ id: 100 + i }))
      emailQueue.addBulk.mockResolvedValue(mockBulkJobs as any)

      const addedJobs = await queueService.addBulkJobs('EMAILS', bulkJobs)

      expect(addedJobs).toHaveLength(3)
      expect(emailQueue.addBulk).toHaveBeenCalledWith(bulkJobs)
    })
  })

  describe('Complete Payment Flow', () => {
    it('should process payment job with proper validation', async () => {
      const paymentData = QueueTestDataFactory.createPaymentJobData({
        type: 'charge',
        amount: 2500,
        currency: 'usd'
      })

      // Step 1: Add payment job
      const mockJob = { 
        id: 789, 
        data: paymentData,
        progress: jest.fn().mockResolvedValue(undefined),
        attemptsMade: 0
      }
      paymentQueue.add.mockResolvedValue(mockJob as any)

      paymentData.type = 'charge'
      const addedJob = await queueService.addPaymentJob(paymentData)
      expect(addedJob).toBe(mockJob)

      // Step 2: Process through PaymentProcessor
      const jobResult = await paymentProcessor.handleCharge(mockJob as any)

      // Step 3: Verify processing completed without errors
      expect(jobResult).toBeUndefined() // PaymentProcessor returns void on success

      // Step 4: Verify correct queue priority for charge
      expect(paymentQueue.add).toHaveBeenCalledWith(
        'charge',
        paymentData,
        expect.objectContaining({ priority: 2 })
      )
    })

    it('should handle payment failure with conservative retry', async () => {
      const paymentData = QueueTestDataFactory.createPaymentJobData({ type: 'refund' })
      const mockJob = { 
        id: 999, 
        data: paymentData,
        progress: jest.fn().mockResolvedValue(undefined),
        attemptsMade: 2,
        queue: { name: 'payments' }
      }

      // Simulate Stripe error
      const stripeError = TestErrorFactory.createStripeError('card_declined', 'card_declined')
      
      const errorResult = await errorHandler.handleJobFailure(mockJob as any, stripeError)

      // Payment errors should not retry and should escalate
      expect(errorResult.shouldRetry).toBe(false)
      expect(errorResult.escalateToAdmin).toBe(true)
    })

    it('should prioritize refund jobs correctly', async () => {
      const refundData = QueueTestDataFactory.createPaymentJobData({ type: 'refund' })
      const chargeData = QueueTestDataFactory.createPaymentJobData({ type: 'charge' })

      refundData.type = 'refund'
      chargeData.type = 'charge'
      await queueService.addPaymentJob(refundData)
      await queueService.addPaymentJob(chargeData)

      // Verify refund gets priority 1 (higher priority)
      expect(paymentQueue.add).toHaveBeenNthCalledWith(
        1,
        'refund',
        refundData,
        expect.objectContaining({ priority: 1 })
      )

      // Verify charge gets priority 2 (lower priority)
      expect(paymentQueue.add).toHaveBeenNthCalledWith(
        2,
        'charge',
        chargeData,
        expect.objectContaining({ priority: 2 })
      )
    })
  })

  describe('Queue Management Integration', () => {
    it('should pause and resume queues correctly', async () => {
      // Test pause
      await queueService.pauseQueue('EMAILS')
      QueueTestAssertions.expectQueueOperation(emailQueue, 'pause')

      // Test resume
      await queueService.resumeQueue('EMAILS')
      QueueTestAssertions.expectQueueOperation(emailQueue, 'resume')

      // Verify independence of queues
      expect(paymentQueue.pause).not.toHaveBeenCalled()
      expect(paymentQueue.resume).not.toHaveBeenCalled()
    })

    it('should clean queues with proper grace periods', async () => {
      await queueService.cleanQueue('PAYMENTS', 3600)

      expect(paymentQueue.clean).toHaveBeenCalledWith(3600, 'completed')
      expect(paymentQueue.clean).toHaveBeenCalledWith(3600, 'failed')
      expect(paymentQueue.clean).toHaveBeenCalledTimes(2)
    })

    it('should collect queue statistics accurately', async () => {
      // Setup mock statistics
      emailQueue.getWaitingCount.mockResolvedValue(15)
      emailQueue.getActiveCount.mockResolvedValue(3)
      emailQueue.getCompletedCount.mockResolvedValue(250)
      emailQueue.getFailedCount.mockResolvedValue(5)
      emailQueue.getDelayedCount.mockResolvedValue(2)

      const stats = await queueService.getJobCounts('EMAILS')

      QueueTestAssertions.expectQueueStats(stats, {
        waiting: 15,
        active: 3,
        completed: 250,
        failed: 5,
        delayed: 2
      })
    })
  })

  describe('Metrics Integration', () => {
    it('should generate Prometheus metrics for monitoring', async () => {
      // Setup queue statistics
      emailQueue.getWaitingCount.mockResolvedValue(10)
      emailQueue.getActiveCount.mockResolvedValue(2)
      emailQueue.getCompletedCount.mockResolvedValue(100)
      emailQueue.getFailedCount.mockResolvedValue(3)
      emailQueue.getDelayedCount.mockResolvedValue(1)

      paymentQueue.getWaitingCount.mockResolvedValue(5)
      paymentQueue.getActiveCount.mockResolvedValue(1)
      paymentQueue.getCompletedCount.mockResolvedValue(200)
      paymentQueue.getFailedCount.mockResolvedValue(0)
      paymentQueue.getDelayedCount.mockResolvedValue(0)

      const metrics = await metricsService.getPrometheusMetrics()

      // Verify metrics contain expected queue data
      expect(metrics).toContain('tenantflow_queue_jobs_waiting{queue="emails"} 10')
      expect(metrics).toContain('tenantflow_queue_jobs_failed{queue="emails"} 3')
      expect(metrics).toContain('tenantflow_queue_jobs_waiting{queue="payments"} 5')
      expect(metrics).toContain('tenantflow_queue_jobs_failed{queue="payments"} 0')
    })

    it('should provide accurate health checks', async () => {
      // Setup healthy email queue, unhealthy payment queue
      emailQueue.getWaitingCount.mockResolvedValue(5)
      emailQueue.getActiveCount.mockResolvedValue(1)
      emailQueue.getCompletedCount.mockResolvedValue(100)
      emailQueue.getFailedCount.mockResolvedValue(2) // 2/108 = ~1.8% failure rate (healthy)
      emailQueue.getDelayedCount.mockResolvedValue(0)

      paymentQueue.getWaitingCount.mockResolvedValue(10)
      paymentQueue.getActiveCount.mockResolvedValue(5)
      paymentQueue.getCompletedCount.mockResolvedValue(50)
      paymentQueue.getFailedCount.mockResolvedValue(20) // 20/85 = ~23% failure rate (unhealthy)
      paymentQueue.getDelayedCount.mockResolvedValue(0)

      const healthCheck = await metricsService.getHealthCheck()

      expect(healthCheck.healthy).toBe(false) // Overall unhealthy due to payment queue
      expect(healthCheck.details.emails.healthy).toBe(true)
      expect(healthCheck.details.payments.healthy).toBe(false)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle cascading failures gracefully', async () => {
      const emailData = QueueTestDataFactory.createEmailJobData()
      const paymentData = QueueTestDataFactory.createPaymentJobData()

      // Simulate queue failures
      emailQueue.add.mockRejectedValue(TestErrorFactory.createNetworkError('Email queue down'))
      paymentQueue.add.mockRejectedValue(TestErrorFactory.createNetworkError('Payment queue down'))

      // Both operations should fail but not crash the system
      await expect(queueService.addEmailJob(emailData)).rejects.toThrow('Email queue down')
      paymentData.type = 'charge'
      await expect(queueService.addPaymentJob(paymentData)).rejects.toThrow('Payment queue down')

      // Metrics should still work with queue failures
      emailQueue.getWaitingCount.mockRejectedValue(TestErrorFactory.createNetworkError('Stats unavailable'))
      const metrics = await metricsService.getPrometheusMetrics()
      expect(metrics).toBe('# ERROR: Failed to generate queue metrics\n')
    })

    it('should maintain queue isolation during failures', async () => {
      // Fail email queue operations
      emailQueue.add.mockRejectedValue(TestErrorFactory.createNetworkError('Email service down'))
      
      // Payment queue should still work
      const paymentData = QueueTestDataFactory.createPaymentJobData()
      const mockPaymentJob = { id: 888 }
      paymentQueue.add.mockResolvedValue(mockPaymentJob as any)

      await expect(queueService.addEmailJob(
        QueueTestDataFactory.createEmailJobData()
      )).rejects.toThrow('Email service down')

      paymentData.type = 'charge'
      const paymentJob = await queueService.addPaymentJob(paymentData)
      expect(paymentJob).toBe(mockPaymentJob)
    })
  })

  describe('Performance Integration', () => {
    it('should handle concurrent job processing', async () => {
      const concurrentJobs = Array(10).fill(0).map((_, i) => ({
        emailData: QueueTestDataFactory.createEmailJobData({ to: [`user${i}@test.com`] }),
        paymentData: QueueTestDataFactory.createPaymentJobData({ paymentId: `pi_${i}` })
      }))

      // Setup mock responses
      emailQueue.add.mockResolvedValue({ id: 100 } as any)
      paymentQueue.add.mockResolvedValue({ id: 200 } as any)

      // Process all jobs concurrently
      const promises = concurrentJobs.flatMap(({ emailData, paymentData }) => [
        queueService.addEmailJob(emailData),
        (() => { paymentData.type = 'charge'; return queueService.addPaymentJob(paymentData); })()
      ])

      const results = await Promise.all(promises)

      expect(results).toHaveLength(20) // 10 email + 10 payment jobs
      expect(emailQueue.add).toHaveBeenCalledTimes(10)
      expect(paymentQueue.add).toHaveBeenCalledTimes(10)
    })

    it('should maintain performance under load', async () => {
      // Simulate realistic queue statistics
      const setupQueueStats = (queue: jest.Mocked<Queue>) => {
        queue.getWaitingCount.mockResolvedValue(50)
        queue.getActiveCount.mockResolvedValue(10)
        queue.getCompletedCount.mockResolvedValue(1000)
        queue.getFailedCount.mockResolvedValue(20)
        queue.getDelayedCount.mockResolvedValue(5)
      }

      setupQueueStats(emailQueue)
      setupQueueStats(paymentQueue)

      // Measure metrics generation time
      const { result: metrics, time } = await QueueTestTiming.measureExecutionTime(
        () => metricsService.getPrometheusMetrics()
      )

      expect(metrics).toContain('tenantflow_queue_')
      expect(time).toBeLessThan(100) // Should complete within 100ms
    })
  })

  describe('Configuration Integration', () => {
    it('should respect queue-specific job options', async () => {
      const emailData = QueueTestDataFactory.createEmailJobData()
      const paymentData = QueueTestDataFactory.createPaymentJobData({ type: 'subscription' })

      await queueService.addEmailJob(emailData)
      paymentData.type = 'charge'
      await queueService.addPaymentJob(paymentData)

      // Verify email job options
      expect(emailQueue.add).toHaveBeenCalledWith(
        'welcome',
        emailData,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 }
        }
      )

      // Verify payment job options
      expect(paymentQueue.add).toHaveBeenCalledWith(
        'charge',
        paymentData,
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          priority: 2
        }
      )
    })

    it('should handle recurring job scheduling', async () => {
      const cronExpression = '0 9 * * 1' // Every Monday at 9 AM
      const jobData = { type: 'weekly-report' }

      await queueService.addRecurringJob('EMAILS', 'weekly-report', jobData, cronExpression)

      expect(emailQueue.add).toHaveBeenCalledWith(
        'weekly-report',
        jobData,
        {
          repeat: { cron: cronExpression },
          removeOnComplete: 10,
          removeOnFail: 10
        }
      )
    })
  })
})