import { Test, TestingModule } from '@nestjs/testing'
import { Job } from 'bull'
import { EmailProcessor } from './email.processor'
import { EmailService } from '../email.service'
import { EmailMetricsService } from '../services/email-metrics.service'
import { EmailJob, EmailPriority } from '../types/email-queue.types'

// Mock dependencies
const mockEmailService = {
  sendWelcomeEmail: jest.fn(),
  sendTenantInvitation: jest.fn(),
  sendPaymentReminder: jest.fn(),
  sendLeaseExpirationAlert: jest.fn(),
  sendPropertyTips: jest.fn(),
  sendFeatureAnnouncement: jest.fn(),
  sendReEngagementEmail: jest.fn()
}

const mockMetricsService = {
  recordMetric: jest.fn()
}

// Mock Bull job
const createMockJob = (data: EmailJob, id?: string): Job<EmailJob> => ({
  id: id || 'job_123',
  name: 'send-immediate',
  data,
  opts: {},
  attemptsMade: 1,
  processedOn: Date.now(),
  finishedOn: Date.now() + 1000,
  progress: jest.fn(),
  log: jest.fn(),
  moveToCompleted: jest.fn(),
  moveToFailed: jest.fn(),
  remove: jest.fn(),
  retry: jest.fn(),
  promote: jest.fn(),
  update: jest.fn()
} as any)

describe('EmailProcessor', () => {
  let processor: EmailProcessor
  let emailService: jest.Mocked<typeof mockEmailService>
  let metricsService: jest.Mocked<typeof mockMetricsService>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        {
          provide: EmailService,
          useValue: mockEmailService
        },
        {
          provide: EmailMetricsService,
          useValue: mockMetricsService
        }
      ]
    }).compile()

    processor = module.get<EmailProcessor>(EmailProcessor)
    emailService = module.get(EmailService)
    metricsService = module.get(EmailMetricsService)
  })

  describe('handleImmediateEmail', () => {
    it('should process welcome email successfully', async () => {
      const jobData: EmailJob = {
        to: ['test@example.com'],
        template: 'welcome',
        data: { name: 'Test User', email: 'test@example.com' },
        priority: EmailPriority.CRITICAL,
        metadata: { userId: 'user_123' }
      }

      const job = createMockJob(jobData)
      emailService.sendWelcomeEmail.mockResolvedValue({
        success: true,
        messageId: 'msg_123'
      })

      const startTime = Date.now()
      const result = await processor.handleImmediateEmail(job)

      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        'medium',
        'organic'
      )

      expect(result).toEqual({
        jobId: 'job_123',
        success: true,
        messageId: 'msg_123',
        error: undefined,
        timestamp: expect.any(Date),
        processingTime: expect.any(Number),
        recipientCount: 1
      })

      expect(metricsService.recordMetric).toHaveBeenCalledWith({
        template: 'welcome',
        recipient: 'test@example.com',
        status: 'sent',
        messageId: 'msg_123',
        processingTime: expect.any(Number),
        metadata: {
          userId: 'user_123',
          jobId: 'job_123'
        }
      })

      expect(result.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should process tenant invitation successfully', async () => {
      const jobData: EmailJob = {
        to: ['tenant@example.com'],
        template: 'tenant-invitation',
        data: {
          email: 'tenant@example.com',
          tenantName: 'John Tenant',
          propertyAddress: '123 Main St',
          invitationLink: 'https://app.tenantflow.app/invite/abc123',
          landlordName: 'Jane Landlord'
        },
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)
      emailService.sendTenantInvitation.mockResolvedValue({
        success: true,
        messageId: 'msg_456'
      })

      const result = await processor.handleImmediateEmail(job)

      expect(emailService.sendTenantInvitation).toHaveBeenCalledWith(
        'tenant@example.com',
        'John Tenant',
        '123 Main St',
        'https://app.tenantflow.app/invite/abc123',
        'Jane Landlord'
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_456')
    })

    it('should handle email service failures', async () => {
      const jobData: EmailJob = {
        to: ['fail@example.com'],
        template: 'welcome',
        data: { name: 'Test User', email: 'fail@example.com' },
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)
      emailService.sendWelcomeEmail.mockResolvedValue({
        success: false,
        error: 'API Error: Invalid email address'
      })

      const result = await processor.handleImmediateEmail(job)

      expect(result).toEqual({
        jobId: 'job_123',
        success: false,
        messageId: undefined,
        error: 'API Error: Invalid email address',
        timestamp: expect.any(Date),
        processingTime: expect.any(Number),
        recipientCount: 1
      })

      expect(metricsService.recordMetric).toHaveBeenCalledWith({
        template: 'welcome',
        recipient: 'fail@example.com',
        status: 'failed',
        error: 'API Error: Invalid email address',
        processingTime: expect.any(Number),
        metadata: {
          jobId: 'job_123'
        }
      })
    })

    it('should handle multiple recipients', async () => {
      const jobData: EmailJob = {
        to: ['user1@example.com', 'user2@example.com'],
        template: 'welcome',
        data: { name: 'Test User' },
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)
      emailService.sendWelcomeEmail
        .mockResolvedValueOnce({ success: true, messageId: 'msg_1' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg_2' })

      const result = await processor.handleImmediateEmail(job)

      expect(emailService.sendWelcomeEmail).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
      expect(result.recipientCount).toBe(2)
      expect(metricsService.recordMetric).toHaveBeenCalledTimes(2)
    })

    it('should handle partially failed multiple recipients', async () => {
      const jobData: EmailJob = {
        to: ['success@example.com', 'fail@example.com'],
        template: 'welcome',
        data: { name: 'Test User' },
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)
      emailService.sendWelcomeEmail
        .mockResolvedValueOnce({ success: true, messageId: 'msg_success' })
        .mockResolvedValueOnce({ success: false, error: 'Failed to send' })

      const result = await processor.handleImmediateEmail(job)

      expect(result.success).toBe(false) // Overall failure due to partial failure
      expect(result.recipientCount).toBe(2)
      expect(result.error).toContain('1 failed')
    })
  })

  describe('handleScheduledEmail', () => {
    it('should process scheduled payment reminder', async () => {
      const jobData: EmailJob = {
        to: ['tenant@example.com'],
        template: 'payment-reminder',
        data: {
          email: 'tenant@example.com',
          tenantName: 'Bob Tenant',
          amountDue: 1500,
          dueDate: new Date('2025-02-01'),
          propertyAddress: '456 Oak Ave',
          paymentLink: 'https://app.tenantflow.app/pay/xyz789'
        },
        priority: EmailPriority.HIGH,
        metadata: { organizationId: 'org_123' }
      }

      const job = createMockJob(jobData, 'scheduled_456')
      emailService.sendPaymentReminder.mockResolvedValue({
        success: true,
        messageId: 'msg_payment'
      })

      const result = await processor.handleScheduledEmail(job)

      expect(emailService.sendPaymentReminder).toHaveBeenCalledWith(
        'tenant@example.com',
        'Bob Tenant',
        1500,
        new Date('2025-02-01'),
        '456 Oak Ave',
        'https://app.tenantflow.app/pay/xyz789'
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_payment')
    })

    it('should process lease expiration alert', async () => {
      const jobData: EmailJob = {
        to: ['tenant@example.com'],
        template: 'lease-expiration',
        data: {
          email: 'tenant@example.com',
          tenantName: 'Alice Tenant',
          propertyAddress: '789 Pine St',
          expirationDate: new Date('2025-03-31'),
          renewalLink: 'https://app.tenantflow.app/renew/lease123',
          leaseId: 'lease_123'
        },
        priority: EmailPriority.HIGH
      }

      const job = createMockJob(jobData)
      emailService.sendLeaseExpirationAlert.mockResolvedValue({
        success: true,
        messageId: 'msg_lease'
      })

      const result = await processor.handleScheduledEmail(job)

      expect(emailService.sendLeaseExpirationAlert).toHaveBeenCalledWith(
        'tenant@example.com',
        'Alice Tenant',
        '789 Pine St',
        new Date('2025-03-31'),
        'https://app.tenantflow.app/renew/lease123',
        'lease_123'
      )

      expect(result.success).toBe(true)
    })
  })

  describe('handleBulkEmail', () => {
    it('should process property tips campaign', async () => {
      const jobData: EmailJob = {
        to: ['landlord1@example.com', 'landlord2@example.com'],
        template: 'property-tips',
        data: {
          tips: [
            'Keep properties well-maintained',
            'Screen tenants carefully',
            'Stay compliant with local laws'
          ]
        },
        priority: EmailPriority.BULK,
        metadata: { campaignId: 'tips_jan_2025', batchNumber: 1 }
      }

      const job = createMockJob(jobData)
      emailService.sendPropertyTips
        .mockResolvedValueOnce({ success: true, messageId: 'msg_tips_1' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg_tips_2' })

      const result = await processor.handleBulkEmail(job)

      expect(emailService.sendPropertyTips).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
      expect(result.recipientCount).toBe(2)
    })

    it('should process feature announcement campaign', async () => {
      const jobData: EmailJob = {
        to: ['user@example.com'],
        template: 'feature-announcement',
        data: {
          name: 'Test User',
          features: [
            {
              title: 'New Dashboard',
              description: 'Enhanced analytics and reporting'
            }
          ],
          actionUrl: 'https://app.tenantflow.app/features'
        },
        priority: EmailPriority.BULK
      }

      const job = createMockJob(jobData)
      emailService.sendFeatureAnnouncement.mockResolvedValue({
        success: true,
        messageId: 'msg_feature'
      })

      const result = await processor.handleBulkEmail(job)

      expect(emailService.sendFeatureAnnouncement).toHaveBeenCalledWith(
        'user@example.com',
        'Test User',
        [{ title: 'New Dashboard', description: 'Enhanced analytics and reporting' }],
        'https://app.tenantflow.app/features'
      )

      expect(result.success).toBe(true)
    })

    it('should add artificial delay for bulk processing', async () => {
      const jobData: EmailJob = {
        to: ['user@example.com'],
        template: 'property-tips',
        data: { tips: ['Tip 1'] },
        priority: EmailPriority.BULK
      }

      const job = createMockJob(jobData)
      emailService.sendPropertyTips.mockResolvedValue({
        success: true,
        messageId: 'msg_bulk'
      })

      const startTime = Date.now()
      await processor.handleBulkEmail(job)
      const endTime = Date.now()

      // Should have at least 1 second delay for bulk processing
      expect(endTime - startTime).toBeGreaterThan(900) // Account for timing variations
    })
  })

  describe('handleRetryEmail', () => {
    it('should retry failed email successfully', async () => {
      const jobData: EmailJob = {
        to: ['retry@example.com'],
        template: 'welcome',
        data: { name: 'Retry User', email: 'retry@example.com' },
        priority: EmailPriority.HIGH,
        metadata: { retryCount: 2 }
      }

      const job = createMockJob(jobData)
      emailService.sendWelcomeEmail.mockResolvedValue({
        success: true,
        messageId: 'msg_retry_success'
      })

      const result = await processor.handleRetryEmail(job)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg_retry_success')
      
      expect(metricsService.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'welcome',
          recipient: 'retry@example.com',
          status: 'sent',
          metadata: expect.objectContaining({
            retryCount: 2
          })
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle service exceptions gracefully', async () => {
      const jobData: EmailJob = {
        to: ['error@example.com'],
        template: 'welcome',
        data: { name: 'Error User' },
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)
      emailService.sendWelcomeEmail.mockRejectedValue(new Error('Service unavailable'))

      const result = await processor.handleImmediateEmail(job)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Service unavailable')

      expect(metricsService.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Service unavailable'
        })
      )
    })

    it('should handle unknown email templates', async () => {
      const jobData: EmailJob = {
        to: ['test@example.com'],
        template: 'unknown-template' as any,
        data: {},
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)

      const result = await processor.handleImmediateEmail(job)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown email template')
    })

    it('should handle missing required data fields', async () => {
      const jobData: EmailJob = {
        to: ['test@example.com'],
        template: 'tenant-invitation',
        data: {}, // Missing required fields
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)

      const result = await processor.handleImmediateEmail(job)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required data for tenant invitation')
    })
  })

  describe('Processing Performance', () => {
    it('should track processing time accurately', async () => {
      const jobData: EmailJob = {
        to: ['perf@example.com'],
        template: 'welcome',
        data: { name: 'Performance Test' },
        priority: EmailPriority.CRITICAL
      }

      const job = createMockJob(jobData)
      
      // Mock a delayed response
      emailService.sendWelcomeEmail.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ success: true, messageId: 'msg_perf' }), 100)
        )
      )

      const result = await processor.handleImmediateEmail(job)

      expect(result.processingTime).toBeGreaterThan(90)
      expect(result.processingTime).toBeLessThan(200)
    })
  })
})