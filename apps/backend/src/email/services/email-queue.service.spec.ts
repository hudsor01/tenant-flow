import { Test, TestingModule } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bull'
import { EmailQueueService } from './email-queue.service'
import { EmailTemplateName } from '../types/email-templates.types'
import { EmailPriority } from '../types/email-queue.types'

// Mock Bull queue
const mockQueue = {
  add: jest.fn(),
  getWaiting: jest.fn(),
  getActive: jest.fn(),
  getCompleted: jest.fn(),
  getFailed: jest.fn(),
  getDelayed: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  clean: jest.fn(),
  client: {
    ping: jest.fn(),
    info: jest.fn()
  },
  on: jest.fn()
}

// Mock job
const createMockJob = (id: string, name: string) => ({
  id,
  name,
  data: {},
  opts: { attempts: 3 },
  attemptsMade: 1,
  processedOn: Date.now(),
  finishedOn: Date.now() + 1000
})

describe('EmailQueueService', () => {
  let service: EmailQueueService
  let queue: any

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        {
          provide: getQueueToken('email'),
          useValue: mockQueue
        }
      ]
    }).compile()

    service = module.get<EmailQueueService>(EmailQueueService)
    queue = module.get(getQueueToken('email'))

    // Mock Redis connection
    queue.client.ping.mockResolvedValue('PONG')
    queue.client.info.mockResolvedValue('used_memory:1048576')
    
    // Mock queue methods
    queue.getWaiting.mockResolvedValue([])
    queue.getActive.mockResolvedValue([])
    queue.getCompleted.mockResolvedValue([])
    queue.getFailed.mockResolvedValue([])
    queue.getDelayed.mockResolvedValue([])
  })

  describe('addImmediateEmail', () => {
    it('should add immediate email to queue with correct priority', async () => {
      const mockJob = createMockJob('job_123', 'send-immediate')
      queue.add.mockResolvedValue(mockJob)

      const result = await service.addImmediateEmail(
        'test@example.com',
        'welcome',
        { name: 'Test User' },
        { userId: 'user_123' }
      )

      expect(queue.add).toHaveBeenCalledWith(
        'send-immediate',
        {
          to: ['test@example.com'],
          template: 'welcome',
          data: { name: 'Test User' },
          priority: EmailPriority.CRITICAL,
          metadata: { userId: 'user_123' }
        },
        {
          priority: EmailPriority.CRITICAL,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100,
          removeOnFail: 50
        }
      )
      expect(result).toBe(mockJob)
    })

    it('should handle multiple recipients', async () => {
      const mockJob = createMockJob('job_124', 'send-immediate')
      queue.add.mockResolvedValue(mockJob)

      await service.addImmediateEmail(
        ['test1@example.com', 'test2@example.com'],
        'welcome',
        { name: 'Test User' }
      )

      expect(queue.add).toHaveBeenCalledWith(
        'send-immediate',
        expect.objectContaining({
          to: ['test1@example.com', 'test2@example.com']
        }),
        expect.any(Object)
      )
    })
  })

  describe('addScheduledEmail', () => {
    it('should add scheduled email with delay', async () => {
      const mockJob = createMockJob('job_125', 'send-scheduled')
      queue.add.mockResolvedValue(mockJob)

      const delay = 60000 // 1 minute
      await service.addScheduledEmail(
        'test@example.com',
        'payment-reminder',
        { tenantName: 'Test Tenant', amountDue: 1500 },
        { delay },
        { campaignId: 'test_campaign' }
      )

      expect(queue.add).toHaveBeenCalledWith(
        'send-scheduled',
        expect.objectContaining({
          to: ['test@example.com'],
          template: 'payment-reminder',
          priority: EmailPriority.HIGH
        }),
        expect.objectContaining({
          delay,
          priority: EmailPriority.HIGH,
          attempts: 5
        })
      )
    })

    it('should add scheduled email with specific date', async () => {
      const mockJob = createMockJob('job_126', 'send-scheduled')
      queue.add.mockResolvedValue(mockJob)

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      await service.addScheduledEmail(
        'test@example.com',
        'lease-expiration',
        { tenantName: 'Test Tenant' },
        { at: futureDate }
      )

      expect(queue.add).toHaveBeenCalledWith(
        'send-scheduled',
        expect.any(Object),
        expect.objectContaining({
          delay: expect.any(Number)
        })
      )
    })

    it('should add scheduled email with cron pattern', async () => {
      const mockJob = createMockJob('job_127', 'send-scheduled')
      queue.add.mockResolvedValue(mockJob)

      await service.addScheduledEmail(
        'test@example.com',
        'property-tips',
        { tips: ['Tip 1', 'Tip 2'] },
        { cron: '0 9 * * 1' } // Every Monday at 9 AM
      )

      expect(queue.add).toHaveBeenCalledWith(
        'send-scheduled',
        expect.any(Object),
        expect.objectContaining({
          repeat: { cron: '0 9 * * 1' }
        })
      )
    })
  })

  describe('addBulkCampaign', () => {
    it('should create multiple batches for large recipient list', async () => {
      const recipients = Array.from({ length: 120 }, (_, i) => ({
        email: `user${i}@example.com`,
        data: { name: `User ${i}` }
      }))

      const mockJobs = [
        createMockJob('batch_1', 'send-bulk'),
        createMockJob('batch_2', 'send-bulk'),
        createMockJob('batch_3', 'send-bulk')
      ]
      queue.add.mockResolvedValueOnce(mockJobs[0])
        .mockResolvedValueOnce(mockJobs[1])
        .mockResolvedValueOnce(mockJobs[2])

      const result = await service.addBulkCampaign(
        recipients,
        'welcome',
        { campaignId: 'bulk_test' }
      )

      // Should create 3 batches (50 each for first two, 20 for last)
      expect(queue.add).toHaveBeenCalledTimes(3)
      expect(result).toHaveLength(3)

      // Check first batch
      expect(queue.add).toHaveBeenNthCalledWith(
        1,
        'send-bulk',
        expect.objectContaining({
          to: expect.arrayContaining(['user0@example.com', 'user49@example.com']),
          metadata: expect.objectContaining({
            batchNumber: 1,
            totalBatches: 3
          })
        }),
        expect.objectContaining({
          priority: EmailPriority.BULK,
          delay: 0
        })
      )

      // Check second batch has delay
      expect(queue.add).toHaveBeenNthCalledWith(
        2,
        'send-bulk',
        expect.any(Object),
        expect.objectContaining({
          delay: 50 * 1000 // 50 seconds
        })
      )
    })

    it('should handle small recipient list in single batch', async () => {
      const recipients = [
        { email: 'user1@example.com', data: { name: 'User 1' } },
        { email: 'user2@example.com', data: { name: 'User 2' } }
      ]

      const mockJob = createMockJob('batch_1', 'send-bulk')
      queue.add.mockResolvedValue(mockJob)

      const result = await service.addBulkCampaign(
        recipients,
        'property-tips'
      )

      expect(queue.add).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(1)
    })
  })

  describe('retryFailedEmail', () => {
    it('should retry failed email with exponential backoff', async () => {
      const failedJob = {
        id: 'failed_123',
        data: {
          to: ['test@example.com'],
          template: 'welcome',
          data: { name: 'Test User' }
        },
        attemptsMade: 2
      }
      queue.getFailed.mockResolvedValue([failedJob])

      const retryJob = createMockJob('retry_123', 'retry-failed')
      queue.add.mockResolvedValue(retryJob)

      const result = await service.retryFailedEmail('failed_123')

      expect(queue.add).toHaveBeenCalledWith(
        'retry-failed',
        failedJob.data,
        expect.objectContaining({
          priority: EmailPriority.HIGH,
          attempts: 2,
          delay: 2 * 60000, // 2 minutes based on attemptsMade
          backoff: {
            type: 'exponential',
            delay: 10000
          }
        })
      )
      expect(result).toBe(retryJob)
    })

    it('should return null if failed job not found', async () => {
      queue.getFailed.mockResolvedValue([])

      const result = await service.retryFailedEmail('nonexistent_job')

      expect(result).toBeNull()
    })
  })

  describe('getQueueHealth', () => {
    it('should return comprehensive queue health status', async () => {
      const mockJobs = {
        immediate: [createMockJob('immediate_1', 'send-immediate')],
        scheduled: [createMockJob('scheduled_1', 'send-scheduled')],
        bulk: [createMockJob('bulk_1', 'send-bulk')]
      }

      queue.getWaiting.mockResolvedValue([mockJobs.immediate[0]])
      queue.getActive.mockResolvedValue([mockJobs.scheduled[0]])
      queue.getCompleted.mockResolvedValue([mockJobs.bulk[0], mockJobs.immediate[0]])
      queue.getFailed.mockResolvedValue([])
      queue.getDelayed.mockResolvedValue([])

      const health = await service.getQueueHealth()

      expect(health).toMatchObject({
        redis: {
          connected: true,
          memory: 1048576,
          uptime: expect.any(Number)
        },
        queues: {
          immediate: {
            sent: 1,
            failed: 0,
            queueDepth: 1,
            retried: 0,
            avgProcessingTime: 0,
            lastProcessed: expect.any(Date)
          },
          scheduled: {
            sent: 0,
            failed: 0,
            queueDepth: 0,
            retried: 0,
            avgProcessingTime: 0,
            lastProcessed: expect.any(Date)
          },
          bulk: {
            sent: 1,
            failed: 0,
            queueDepth: 0,
            retried: 0,
            avgProcessingTime: 0,
            lastProcessed: expect.any(Date)
          },
          deadLetter: {
            sent: 0,
            failed: 0,
            queueDepth: 0,
            retried: 0,
            avgProcessingTime: 0,
            lastProcessed: expect.any(Date)
          }
        },
        workers: {
          active: 1,
          waiting: 1,
          completed: 2,
          failed: 0
        }
      })
    })

    it('should handle Redis connection failure', async () => {
      queue.client.ping.mockResolvedValue('ERROR')

      const health = await service.getQueueHealth()

      expect(health.redis.connected).toBe(false)
    })
  })

  describe('pauseQueue and resumeQueue', () => {
    it('should pause queue processing', async () => {
      queue.pause.mockResolvedValue(undefined)

      await service.pauseQueue()

      expect(queue.pause).toHaveBeenCalled()
    })

    it('should resume queue processing', async () => {
      queue.resume.mockResolvedValue(undefined)

      await service.resumeQueue()

      expect(queue.resume).toHaveBeenCalled()
    })
  })

  describe('cleanupOldJobs', () => {
    it('should clean up old completed and failed jobs', async () => {
      queue.clean.mockResolvedValue(undefined)

      await service.cleanupOldJobs()

      expect(queue.clean).toHaveBeenCalledTimes(2)
      expect(queue.clean).toHaveBeenCalledWith(expect.any(Number), 'completed')
      expect(queue.clean).toHaveBeenCalledWith(expect.any(Number), 'failed')
    })
  })

  describe('Queue Event Listeners', () => {
    it('should set up event listeners on module init', async () => {
      // Call onModuleInit to set up event listeners
      await service.onModuleInit()
      
      expect(queue.on).toHaveBeenCalledWith('completed', expect.any(Function))
      expect(queue.on).toHaveBeenCalledWith('failed', expect.any(Function))
      expect(queue.on).toHaveBeenCalledWith('stalled', expect.any(Function))
    })
  })
})