import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bull'
import { Queue, JobOptions } from 'bull'
import { QueueService } from '../queue.service'
import { QUEUE_NAMES } from '../constants/queue-names'
import {
  QueueTestDataFactory,
  MockQueueFactory,
  QueueTestModuleBuilder,
  QueueTestAssertions,
  QueueTestEnvironment,
  TestErrorFactory
} from './shared/queue-test-utilities'

describe('QueueService', () => {
  let service: QueueService
  let emailQueue: jest.Mocked<Queue>
  let paymentQueue: jest.Mocked<Queue>
  let module: TestingModule

  beforeAll(() => {
    QueueTestEnvironment.setupTestTimeout()
    QueueTestEnvironment.setupProcessEnv()
  })

  beforeEach(async () => {
    emailQueue = MockQueueFactory.createQueue('email')
    paymentQueue = MockQueueFactory.createQueue('payments')

    module = await QueueTestModuleBuilder.create()
      .withProvider({
        provide: getQueueToken(QUEUE_NAMES.EMAILS),
        useValue: emailQueue
      })
      .withProvider({
        provide: getQueueToken(QUEUE_NAMES.PAYMENTS),
        useValue: paymentQueue
      })
      .withProvider(QueueService)
      .build()

    service = module.get<QueueService>(QueueService)
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await module.close()
  })

  afterAll(() => {
    QueueTestEnvironment.cleanupProcessEnv()
  })

  describe('addEmailJob', () => {
    it('should add email job with exact production configuration', async () => {
      const emailData = {
        to: ['user1@test.com', 'user2@test.com'],
        subject: 'Test Subject',
        template: 'welcome'
      }
      const mockJob = { id: 123 }
      emailQueue.add.mockResolvedValue(mockJob as any)

      const result = await service.addEmailJob(emailData)

      // Test exact production behavior
      expect(emailQueue.add).toHaveBeenCalledWith('send-email', emailData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 }
      })
      expect(result).toBe(mockJob)
    })

    it('should log exact production message format for array recipients', async () => {
      const emailData = {
        to: ['user1@test.com', 'user2@test.com'],
        subject: 'Test'
      }
      const loggerSpy = jest.spyOn(service['logger'], 'log')
      const mockJob = { id: 456 }
      emailQueue.add.mockResolvedValue(mockJob as any)

      await service.addEmailJob(emailData)

      // Test exact log format: "Added email job {id} to {recipients}"
      expect(loggerSpy).toHaveBeenCalledWith(
        'Added email job 456 to user1@test.com,user2@test.com'
      )
    })

    it('should log exact production message format for single recipient', async () => {
      const emailData = {
        to: 'single@test.com',
        subject: 'Test'
      }
      const loggerSpy = jest.spyOn(service['logger'], 'log')
      const mockJob = { id: 789 }
      emailQueue.add.mockResolvedValue(mockJob as any)

      await service.addEmailJob(emailData)

      // Test exact log format for non-array recipient
      expect(loggerSpy).toHaveBeenCalledWith(
        'Added email job 789 to single@test.com'
      )
    })

    it('should handle email job addition failure', async () => {
      const emailData = { to: 'test@test.com', subject: 'Test' }
      const error = TestErrorFactory.createNetworkError('Queue unavailable')
      emailQueue.add.mockRejectedValue(error)

      await expect(service.addEmailJob(emailData)).rejects.toThrow(error)
    })

    it('should log exact error message format', async () => {
      const emailData = { to: 'test@test.com', subject: 'Test' }
      const error = TestErrorFactory.createNetworkError('Queue unavailable')
      const loggerSpy = jest.spyOn(service['logger'], 'error')
      emailQueue.add.mockRejectedValue(error)

      await expect(service.addEmailJob(emailData)).rejects.toThrow()

      // Test exact error log format
      expect(loggerSpy).toHaveBeenCalledWith('Failed to add email job:', error)
    })
  })

  describe('addPaymentJob', () => {
    it('should add refund job with exact priority 1', async () => {
      const paymentData = {
        type: 'refund' as const,
        paymentId: 'pi_123',
        customerId: 'cus_456'
      }
      const mockJob = { id: 789 }
      paymentQueue.add.mockResolvedValue(mockJob as any)

      const result = await service.addPaymentJob(paymentData)

      // Test exact production priority logic: refunds = 1
      expect(paymentQueue.add).toHaveBeenCalledWith('process-refund', paymentData, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        priority: 1
      })
      expect(result).toBe(mockJob)
    })

    it('should add non-refund jobs with exact priority 2', async () => {
      const testCases = [
        { type: 'charge' as const, expectedPriority: 2 },
        { type: 'subscription' as const, expectedPriority: 2 },
        { type: 'invoice' as const, expectedPriority: 2 }
      ]

      for (const { type, expectedPriority } of testCases) {
        paymentQueue.add.mockClear()
        const paymentData = {
          type,
          paymentId: 'pi_123',
          customerId: 'cus_456'
        }

        await service.addPaymentJob(paymentData)

        expect(paymentQueue.add).toHaveBeenCalledWith(
          `process-${type}`,
          paymentData,
          expect.objectContaining({ priority: expectedPriority })
        )
      }
    })

    it('should log exact production message format', async () => {
      const paymentData = {
        type: 'charge' as const,
        paymentId: 'pi_test123',
        customerId: 'cus_456'
      }
      const loggerSpy = jest.spyOn(service['logger'], 'log')
      const mockJob = { id: 999 }
      paymentQueue.add.mockResolvedValue(mockJob as any)

      await service.addPaymentJob(paymentData)

      // Test exact log format: "Added payment job {id} for {type} {paymentId}"
      expect(loggerSpy).toHaveBeenCalledWith(
        'Added payment job 999 for charge pi_test123'
      )
    })

    it('should handle payment job addition failure', async () => {
      const paymentData = {
        type: 'charge' as const,
        paymentId: 'pi_123',
        customerId: 'cus_456'
      }
      const error = TestErrorFactory.createStripeError('Payment processing unavailable')
      paymentQueue.add.mockRejectedValue(error)

      await expect(service.addPaymentJob(paymentData)).rejects.toThrow(error)
    })

    it('should log exact error message format for payments', async () => {
      const paymentData = {
        type: 'charge' as const,
        paymentId: 'pi_123',
        customerId: 'cus_456'
      }
      const error = TestErrorFactory.createStripeError('Processing failed')
      const loggerSpy = jest.spyOn(service['logger'], 'error')
      paymentQueue.add.mockRejectedValue(error)

      await expect(service.addPaymentJob(paymentData)).rejects.toThrow()

      // Test exact error log format
      expect(loggerSpy).toHaveBeenCalledWith('Failed to add payment job:', error)
    })
  })

  describe('addJob (generic method)', () => {
    it('should add job to specified queue', async () => {
      const testData = { test: 'data' }
      const options: JobOptions = { delay: 5000, attempts: 2 }
      const mockJob = { id: 999 }
      emailQueue.add.mockResolvedValue(mockJob as any)

      const result = await service.addJob('EMAILS', 'test-job', testData, options)

      expect(emailQueue.add).toHaveBeenCalledWith('test-job', testData, options)
      expect(result).toBe(mockJob)
    })

    it('should handle invalid queue name', async () => {
      await expect(
        service.addJob('INVALID' as any, 'test', {})
      ).rejects.toThrow('Unknown queue')
    })

    it('should log exact generic job addition format', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log')
      paymentQueue.add.mockResolvedValue({ id: 888 } as any)

      await service.addJob('PAYMENTS', 'test-job', {})

      // Test exact log format: "Added {jobName} job {id} to {queueName} queue"
      expect(loggerSpy).toHaveBeenCalledWith(
        'Added test-job job 888 to PAYMENTS queue'
      )
    })
  })

  describe('addBulkJobs', () => {
    it('should add multiple jobs in bulk', async () => {
      const jobs = [
        { name: 'job1', data: { id: 1 } },
        { name: 'job2', data: { id: 2 } }
      ]
      const mockJobs = [{ id: 111 }, { id: 222 }]
      emailQueue.addBulk.mockResolvedValue(mockJobs as any)

      const result = await service.addBulkJobs('EMAILS', jobs)

      expect(emailQueue.addBulk).toHaveBeenCalledWith(jobs)
      expect(result).toBe(mockJobs)
    })

    it('should log exact bulk job count from returned jobs', async () => {
      const jobs = Array(5).fill(0).map((_, i) => ({ name: `job${i}`, data: { id: i } }))
      const mockJobs = Array(5).fill(0).map((_, i) => ({ id: 100 + i }))
      const loggerSpy = jest.spyOn(service['logger'], 'log')
      emailQueue.addBulk.mockResolvedValue(mockJobs as any)

      await service.addBulkJobs('EMAILS', jobs)

      // Test exact log format: "Added {bulkJobs.length} bulk jobs to {queueName}"
      expect(loggerSpy).toHaveBeenCalledWith('Added 5 bulk jobs to EMAILS')
    })

    it('should log zero when no jobs returned', async () => {
      const jobs = [{ name: 'job1', data: {} }]
      const loggerSpy = jest.spyOn(service['logger'], 'log')
      emailQueue.addBulk.mockResolvedValue([] as any) // Empty return

      await service.addBulkJobs('EMAILS', jobs)

      // Test actual production behavior when queue returns empty array
      expect(loggerSpy).toHaveBeenCalledWith('Added 0 bulk jobs to EMAILS')
    })

    it('should handle bulk job addition failure', async () => {
      const jobs = [{ name: 'job1', data: {} }]
      const error = TestErrorFactory.createNetworkError('Bulk operation failed')
      emailQueue.addBulk.mockRejectedValue(error)

      await expect(service.addBulkJobs('EMAILS', jobs)).rejects.toThrow(error)
    })

    it('should log exact bulk error format', async () => {
      const jobs = [{ name: 'job1', data: {} }]
      const error = TestErrorFactory.createNetworkError('Bulk failed')
      const loggerSpy = jest.spyOn(service['logger'], 'error')
      emailQueue.addBulk.mockRejectedValue(error)

      await expect(service.addBulkJobs('EMAILS', jobs)).rejects.toThrow()

      // Test exact error format: "Failed to add bulk jobs to {queueName}:"
      expect(loggerSpy).toHaveBeenCalledWith('Failed to add bulk jobs to EMAILS:', error)
    })
  })

  describe('addRecurringJob', () => {
    it('should add recurring job with cron schedule', async () => {
      const cron = '0 9 * * 1' // Every Monday at 9 AM
      const jobData = { type: 'weekly-report' }

      await service.addRecurringJob('EMAILS', 'weekly-report', jobData, cron)

      expect(emailQueue.add).toHaveBeenCalledWith('weekly-report', jobData, {
        repeat: { cron },
        removeOnComplete: 10,
        removeOnFail: 10
      })
    })

    it('should log exact recurring job format', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log')
      const cron = '0 0 * * *'

      await service.addRecurringJob('PAYMENTS', 'daily-cleanup', {}, cron)

      // Test exact log format from production code
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Added recurring job daily-cleanup to PAYMENTS')
      )
    })
  })

  describe('getJobCounts', () => {
    it('should return job counts for specified queue', async () => {
      emailQueue.getWaitingCount.mockResolvedValue(5)
      emailQueue.getActiveCount.mockResolvedValue(2)
      emailQueue.getCompletedCount.mockResolvedValue(100)
      emailQueue.getFailedCount.mockResolvedValue(3)
      emailQueue.getDelayedCount.mockResolvedValue(1)

      const counts = await service.getJobCounts('EMAILS')

      QueueTestAssertions.expectQueueStats(counts, {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1
      })
    })

    it('should handle job count retrieval failure', async () => {
      emailQueue.getWaitingCount.mockRejectedValue(
        TestErrorFactory.createNetworkError('Queue connection lost')
      )

      await expect(service.getJobCounts('EMAILS')).rejects.toThrow('Queue connection lost')
    })
  })

  describe('queue management operations', () => {
    describe('cleanQueue', () => {
      it('should clean queue with default grace period', async () => {
        emailQueue.clean.mockResolvedValue(25)

        await service.cleanQueue('EMAILS')

        expect(emailQueue.clean).toHaveBeenCalledWith(0, 'completed')
        expect(emailQueue.clean).toHaveBeenCalledWith(0, 'failed')
      })

      it('should clean queue with custom grace period', async () => {
        await service.cleanQueue('PAYMENTS', 3600)

        expect(paymentQueue.clean).toHaveBeenCalledWith(3600, 'completed')
        expect(paymentQueue.clean).toHaveBeenCalledWith(3600, 'failed')
      })

      it('should log exact queue cleaning format', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'log')

        await service.cleanQueue('EMAILS')

        // Test exact log format: "Cleaned queue {queueName}"
        expect(loggerSpy).toHaveBeenCalledWith('Cleaned queue EMAILS')
      })
    })

    describe('pauseQueue', () => {
      it('should pause specified queue', async () => {
        await service.pauseQueue('PAYMENTS')

        QueueTestAssertions.expectQueueOperation(paymentQueue, 'pause')
      })

      it('should log exact pause format', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'log')

        await service.pauseQueue('EMAILS')

        // Test exact log format: "Paused queue {queueName}"
        expect(loggerSpy).toHaveBeenCalledWith('Paused queue EMAILS')
      })
    })

    describe('resumeQueue', () => {
      it('should resume specified queue', async () => {
        await service.resumeQueue('EMAILS')

        QueueTestAssertions.expectQueueOperation(emailQueue, 'resume')
      })

      it('should log exact resume format', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'log')

        await service.resumeQueue('PAYMENTS')

        // Test exact log format: "Resumed queue {queueName}"
        expect(loggerSpy).toHaveBeenCalledWith('Resumed queue PAYMENTS')
      })
    })
  })

  describe('getQueue (private method)', () => {
    it('should return correct queue instance', () => {
      const emailQueueResult = service['getQueue']('EMAILS')
      const paymentQueueResult = service['getQueue']('PAYMENTS')

      expect(emailQueueResult).toBe(emailQueue)
      expect(paymentQueueResult).toBe(paymentQueue)
    })

    it('should throw exact error for unknown queue', () => {
      expect(() => service['getQueue']('UNKNOWN' as any)).toThrow('Unknown queue: UNKNOWN')
    })
  })

  describe('error handling and logging', () => {
    it('should log errors with exact format', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error')
      const error = TestErrorFactory.createRetryableError('Service temporarily unavailable')
      emailQueue.add.mockRejectedValue(error)

      await expect(
        service.addEmailJob({ to: 'test@test.com', subject: 'Test' })
      ).rejects.toThrow()

      // Test exact error log format
      expect(loggerSpy).toHaveBeenCalledWith('Failed to add email job:', error)
    })

    it('should handle queue operation failures gracefully', async () => {
      const operationError = TestErrorFactory.createNetworkError('Redis connection lost')
      paymentQueue.pause.mockRejectedValue(operationError)

      await expect(service.pauseQueue('PAYMENTS')).rejects.toThrow(operationError)
    })
  })

  describe('integration scenarios', () => {
    it('should handle multiple concurrent operations', async () => {
      const emailData = { to: 'test@test.com', subject: 'Test' }
      const paymentData = {
        type: 'charge' as const,
        paymentId: 'pi_123',
        customerId: 'cus_456'
      }
      
      emailQueue.add.mockResolvedValue({ id: 1 } as any)
      paymentQueue.add.mockResolvedValue({ id: 2 } as any)

      const [emailJob, paymentJob] = await Promise.all([
        service.addEmailJob(emailData),
        service.addPaymentJob(paymentData)
      ])

      expect(emailJob.id).toBe(1)
      expect(paymentJob.id).toBe(2)
      expect(emailQueue.add).toHaveBeenCalledTimes(1)
      expect(paymentQueue.add).toHaveBeenCalledTimes(1)
    })

    it('should maintain queue isolation', async () => {
      await service.pauseQueue('EMAILS')
      await service.addPaymentJob({
        type: 'charge' as const,
        paymentId: 'pi_123',
        customerId: 'cus_456'
      })

      expect(emailQueue.pause).toHaveBeenCalled()
      expect(paymentQueue.pause).not.toHaveBeenCalled()
      expect(paymentQueue.add).toHaveBeenCalled()
    })

    it('should handle queue statistics for all queues', async () => {
      // Setup mock return values
      emailQueue.getWaitingCount.mockResolvedValue(10)
      emailQueue.getActiveCount.mockResolvedValue(5)
      emailQueue.getCompletedCount.mockResolvedValue(200)
      emailQueue.getFailedCount.mockResolvedValue(2)
      emailQueue.getDelayedCount.mockResolvedValue(3)

      paymentQueue.getWaitingCount.mockResolvedValue(2)
      paymentQueue.getActiveCount.mockResolvedValue(1)
      paymentQueue.getCompletedCount.mockResolvedValue(150)
      paymentQueue.getFailedCount.mockResolvedValue(0)
      paymentQueue.getDelayedCount.mockResolvedValue(0)

      const [emailStats, paymentStats] = await Promise.all([
        service.getJobCounts('EMAILS'),
        service.getJobCounts('PAYMENTS')
      ])

      expect(emailStats.waiting).toBe(10)
      expect(emailStats.failed).toBe(2)
      expect(paymentStats.waiting).toBe(2)
      expect(paymentStats.failed).toBe(0)
    })
  })
})