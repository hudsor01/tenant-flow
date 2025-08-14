import { Test, TestingModule } from '@nestjs/testing'
import { HttpStatus, HttpException } from '@nestjs/common'
import { EmailController } from './controllers/email.controller'
import { EmailService } from './email.service'
import { EmailQueueService } from './services/email-queue.service'
import { EmailMetricsService } from './services/email-metrics.service'

// Mock services
const mockEmailService = {
  getHealthStatus: jest.fn()
}

const mockQueueService = {
  addImmediateEmail: jest.fn(),
  retryFailedEmail: jest.fn(),
  pauseQueue: jest.fn(),
  resumeQueue: jest.fn(),
  getQueueHealth: jest.fn()
}

const mockMetricsService = {
  getSystemStats: jest.fn(),
  getAlerts: jest.fn()
}

describe('EmailController', () => {
  let controller: EmailController
  let emailService: jest.Mocked<typeof mockEmailService>
  let queueService: jest.Mocked<typeof mockQueueService>
  let metricsService: jest.Mocked<typeof mockMetricsService>

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService
        },
        {
          provide: EmailQueueService,
          useValue: mockQueueService
        },
        {
          provide: EmailMetricsService,
          useValue: mockMetricsService
        }
      ]
    }).compile()

    controller = module.get<EmailController>(EmailController)
    emailService = module.get(EmailService)
    queueService = module.get(EmailQueueService)
    metricsService = module.get(EmailMetricsService)
  })

  describe('getHealthStatus', () => {
    it('should return healthy status with all services operational', async () => {
      emailService.getHealthStatus.mockReturnValue({
        healthy: true,
        circuitBreakerState: 'CLOSED',
        failureCount: 0,
        lastFailureTime: null
      })

      queueService.getQueueHealth.mockResolvedValue({
        redis: {
          connected: true,
          memory: 1048576,
          uptime: Date.now()
        },
        queues: {
          immediate: {
            sent: 100,
            failed: 2,
            queueDepth: 5,
            retried: 1,
            avgProcessingTime: 250,
            lastProcessed: new Date()
          },
          scheduled: {
            sent: 50,
            failed: 1,
            queueDepth: 10,
            retried: 0,
            avgProcessingTime: 300,
            lastProcessed: new Date()
          },
          bulk: {
            sent: 200,
            failed: 5,
            queueDepth: 0,
            retried: 2,
            avgProcessingTime: 500,
            lastProcessed: new Date()
          },
          deadLetter: {
            sent: 0,
            failed: 8,
            queueDepth: 8,
            retried: 0,
            avgProcessingTime: 0,
            lastProcessed: new Date()
          }
        },
        workers: {
          active: 15,
          waiting: 15,
          completed: 350,
          failed: 8
        }
      })

      metricsService.getSystemStats.mockReturnValue({
        totalSent: 350,
        totalFailed: 8,
        successRate: 97.8,
        avgProcessingTime: 300,
        queueDepth: 15,
        lastHour: 25,
        last24Hours: 150,
        last7Days: 358,
        templatesStats: []
      })

      metricsService.getAlerts.mockReturnValue([])

      const result = await controller.getHealthStatus()

      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          emailService: {
            healthy: true,
            circuitBreaker: 'CLOSED',
            failureCount: 0,
            lastFailure: null
          },
          queueService: {
            redis: {
              connected: true,
              memory: 1048576,
              uptime: expect.any(Number)
            },
            workers: {
              active: 15,
              waiting: 15,
              completed: 350,
              failed: 8
            },
            queues: {
              immediate: {
                queueDepth: 5,
                sent: 100,
                failed: 2
              },
              scheduled: {
                queueDepth: 10,
                sent: 50,
                failed: 1
              },
              bulk: {
                queueDepth: 0,
                sent: 200,
                failed: 5
              },
              deadLetter: {
                queueDepth: 8,
                sent: 0,
                failed: 8
              }
            }
          }
        },
        metrics: {
          totalSent: 350,
          totalFailed: 8,
          successRate: 97.8,
          avgProcessingTime: 300,
          lastHour: 25,
          last24Hours: 150
        },
        alerts: undefined
      })
    })

    it('should return unhealthy status with alerts', async () => {
      emailService.getHealthStatus.mockReturnValue({
        healthy: false,
        circuitBreakerState: 'OPEN',
        failureCount: 5,
        lastFailureTime: new Date('2025-01-01T10:00:00.000Z')
      })

      queueService.getQueueHealth.mockResolvedValue({
        redis: { connected: false, memory: 0, uptime: 0 },
        queues: {
          immediate: { sent: 0, failed: 10, queueDepth: 100, retried: 5, avgProcessingTime: 0, lastProcessed: new Date() },
          scheduled: { sent: 0, failed: 0, queueDepth: 0, retried: 0, avgProcessingTime: 0, lastProcessed: new Date() },
          bulk: { sent: 0, failed: 0, queueDepth: 0, retried: 0, avgProcessingTime: 0, lastProcessed: new Date() },
          deadLetter: { sent: 0, failed: 0, queueDepth: 0, retried: 0, avgProcessingTime: 0, lastProcessed: new Date() }
        },
        workers: { active: 0, waiting: 100, completed: 0, failed: 10 }
      })

      metricsService.getSystemStats.mockReturnValue({
        totalSent: 0,
        totalFailed: 10,
        successRate: 0,
        avgProcessingTime: 0,
        queueDepth: 100,
        lastHour: 10,
        last24Hours: 10,
        last7Days: 10,
        templatesStats: []
      })

      metricsService.getAlerts.mockReturnValue([
        {
          level: 'critical',
          message: 'Email success rate critically low',
          metric: 'successRate',
          value: 0,
          threshold: 90
        }
      ])

      const result = await controller.getHealthStatus()

      expect(result.status).toBe('unhealthy')
      expect(result.alerts).toEqual([
        {
          level: 'critical',
          message: 'Email success rate critically low',
          metric: 'successRate',
          value: 0,
          threshold: 90
        }
      ])
    })
  })

  describe('getMetrics', () => {
    it('should return system metrics without template filter', async () => {
      metricsService.getSystemStats.mockReturnValue({
        totalSent: 1000,
        totalFailed: 50,
        successRate: 95.2,
        avgProcessingTime: 275,
        queueDepth: 25,
        lastHour: 45,
        last24Hours: 520,
        last7Days: 1050,
        templatesStats: [
          {
            template: 'welcome',
            sent: 400,
            failed: 20,
            bounced: 5,
            delivered: 375,
            opened: 300,
            clicked: 150,
            deliveryRate: 93.75,
            openRate: 80.0,
            clickRate: 50.0,
            avgProcessingTime: 250
          },
          {
            template: 'payment-reminder',
            sent: 600,
            failed: 30,
            bounced: 10,
            delivered: 560,
            opened: 420,
            clicked: 210,
            deliveryRate: 93.33,
            openRate: 75.0,
            clickRate: 50.0,
            avgProcessingTime: 300
          }
        ]
      })

      const result = await controller.getMetrics()

      expect(result).toEqual({
        system: {
          totalSent: 1000,
          totalFailed: 50,
          successRate: 95.2,
          avgProcessingTime: 275,
          queueDepth: 25
        },
        timeframes: {
          lastHour: 45,
          last24Hours: 520,
          last7Days: 1050
        },
        templates: [
          {
            template: 'welcome',
            sent: 400,
            failed: 20,
            deliveryRate: 93.75,
            openRate: 80.0,
            clickRate: 50.0,
            avgProcessingTime: 250
          },
          {
            template: 'payment-reminder',
            sent: 600,
            failed: 30,
            deliveryRate: 93.33,
            openRate: 75.0,
            clickRate: 50.0,
            avgProcessingTime: 300
          }
        ]
      })
    })

    it('should filter metrics by template', async () => {
      metricsService.getSystemStats.mockReturnValue({
        totalSent: 1000,
        totalFailed: 50,
        successRate: 95.2,
        avgProcessingTime: 275,
        queueDepth: 25,
        lastHour: 45,
        last24Hours: 520,
        last7Days: 1050,
        templatesStats: [
          {
            template: 'welcome',
            sent: 400,
            failed: 20,
            bounced: 5,
            delivered: 375,
            opened: 300,
            clicked: 150,
            deliveryRate: 93.75,
            openRate: 80.0,
            clickRate: 50.0,
            avgProcessingTime: 250
          },
          {
            template: 'payment-reminder',
            sent: 600,
            failed: 30,
            bounced: 10,
            delivered: 560,
            opened: 420,
            clicked: 210,
            deliveryRate: 93.33,
            openRate: 75.0,
            clickRate: 50.0,
            avgProcessingTime: 300
          }
        ]
      })

      const result = await controller.getMetrics('welcome')

      expect(result.templates).toHaveLength(1)
      expect(result.templates[0].template).toBe('welcome')
    })
  })

  describe('getQueueStatus', () => {
    it('should return detailed queue status', async () => {
      queueService.getQueueHealth.mockResolvedValue({
        redis: {
          connected: true,
          memory: 2097152,
          uptime: 3600000
        },
        queues: {
          immediate: {
            sent: 150,
            failed: 5,
            queueDepth: 8,
            retried: 2,
            avgProcessingTime: 200,
            lastProcessed: new Date('2025-01-01T12:00:00.000Z')
          },
          scheduled: {
            sent: 75,
            failed: 2,
            queueDepth: 25,
            retried: 1,
            avgProcessingTime: 350,
            lastProcessed: new Date('2025-01-01T11:30:00.000Z')
          },
          bulk: {
            sent: 500,
            failed: 10,
            queueDepth: 2,
            retried: 5,
            avgProcessingTime: 800,
            lastProcessed: new Date('2025-01-01T11:45:00.000Z')
          },
          deadLetter: {
            sent: 0,
            failed: 17,
            queueDepth: 17,
            retried: 0,
            avgProcessingTime: 0,
            lastProcessed: new Date('2025-01-01T10:15:00.000Z')
          }
        },
        workers: {
          active: 20,
          waiting: 35,
          completed: 725,
          failed: 17
        }
      })

      const result = await controller.getQueueStatus()

      expect(result).toEqual({
        redis: {
          connected: true,
          memory: 2097152,
          uptime: 3600000
        },
        workers: {
          active: 20,
          waiting: 35,
          completed: 725,
          failed: 17
        },
        queues: {
          immediate: {
            name: 'Immediate Emails',
            description: 'Welcome, invitations, critical notifications',
            sent: 150,
            failed: 5,
            queueDepth: 8,
            retried: 2,
            avgProcessingTime: 200,
            lastProcessed: new Date('2025-01-01T12:00:00.000Z')
          },
          scheduled: {
            name: 'Scheduled Emails',
            description: 'Payment reminders, lease alerts, scheduled campaigns',
            sent: 75,
            failed: 2,
            queueDepth: 25,
            retried: 1,
            avgProcessingTime: 350,
            lastProcessed: new Date('2025-01-01T11:30:00.000Z')
          },
          bulk: {
            name: 'Bulk Campaigns',
            description: 'Newsletter, announcements, marketing emails',
            sent: 500,
            failed: 10,
            queueDepth: 2,
            retried: 5,
            avgProcessingTime: 800,
            lastProcessed: new Date('2025-01-01T11:45:00.000Z')
          },
          deadLetter: {
            name: 'Dead Letter Queue',
            description: 'Failed emails requiring manual intervention',
            sent: 0,
            failed: 17,
            queueDepth: 17,
            retried: 0,
            avgProcessingTime: 0,
            lastProcessed: new Date('2025-01-01T10:15:00.000Z')
          }
        }
      })
    })
  })

  describe('sendTestEmail', () => {
    it('should send welcome test email successfully', async () => {
      const mockJob = { id: 'test_job_123' }
      queueService.addImmediateEmail.mockResolvedValue(mockJob as any)

      const result = await controller.sendTestEmail({
        to: 'test@example.com',
        template: 'welcome',
        data: { name: 'Custom Test User' }
      })

      expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
        'test@example.com',
        'welcome',
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Custom Test User',
          companySize: 'medium',
          source: 'test'
        }),
        {
          trackingId: expect.stringMatching(/^test_\d+$/)
        }
      )

      expect(result).toEqual({
        success: true,
        jobId: 'test_job_123',
        message: 'Test email queued for test@example.com',
        template: 'welcome',
        data: expect.objectContaining({
          name: 'Custom Test User'
        })
      })
    })

    it('should send tenant invitation test email with default data', async () => {
      const mockJob = { id: 'test_job_456' }
      queueService.addImmediateEmail.mockResolvedValue(mockJob as any)

      const result = await controller.sendTestEmail({
        to: 'tenant@example.com',
        template: 'tenant-invitation'
      })

      expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
        'tenant@example.com',
        'tenant-invitation',
        expect.objectContaining({
          tenantName: 'Test Tenant',
          propertyAddress: '123 Test Street, Test City, TC 12345',
          invitationLink: 'https://tenantflow.app/invite/test123',
          landlordName: 'Test Landlord'
        }),
        expect.any(Object)
      )

      expect(result.success).toBe(true)
    })

    it('should reject invalid email addresses', async () => {
      await expect(
        controller.sendTestEmail({
          to: 'invalid-email',
          template: 'welcome'
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid email address'
        })
      )
    })

    it('should handle queue service errors', async () => {
      queueService.addImmediateEmail.mockRejectedValue(new Error('Queue service unavailable'))

      await expect(
        controller.sendTestEmail({
          to: 'test@example.com',
          template: 'welcome'
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to send test email: Queue service unavailable'
        })
      )
    })
  })

  describe('retryFailedEmail', () => {
    it('should retry failed email successfully', async () => {
      const mockRetryJob = { id: 'retry_job_789' }
      queueService.retryFailedEmail.mockResolvedValue(mockRetryJob as any)

      const result = await controller.retryFailedEmail('failed_job_456')

      expect(queueService.retryFailedEmail).toHaveBeenCalledWith('failed_job_456')
      expect(result).toEqual({
        success: true,
        retryJobId: 'retry_job_789',
        originalJobId: 'failed_job_456',
        message: 'Email retry queued successfully'
      })
    })

    it('should return not found for non-existent job', async () => {
      queueService.retryFailedEmail.mockResolvedValue(null)

      await expect(
        controller.retryFailedEmail('nonexistent_job')
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.NOT_FOUND,
          message: 'Failed job not found'
        })
      )
    })

    it('should handle retry service errors', async () => {
      queueService.retryFailedEmail.mockRejectedValue(new Error('Retry service error'))

      await expect(
        controller.retryFailedEmail('job_123')
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retry email: Retry service error'
        })
      )
    })
  })

  describe('pauseQueue', () => {
    it('should pause email queue successfully', async () => {
      queueService.pauseQueue.mockResolvedValue(undefined)

      const result = await controller.pauseQueue()

      expect(queueService.pauseQueue).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        message: 'Email queue paused',
        timestamp: expect.any(String)
      })
    })
  })

  describe('resumeQueue', () => {
    it('should resume email queue successfully', async () => {
      queueService.resumeQueue.mockResolvedValue(undefined)

      const result = await controller.resumeQueue()

      expect(queueService.resumeQueue).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        message: 'Email queue resumed',
        timestamp: expect.any(String)
      })
    })
  })

  describe('Test Data Generation', () => {
    it('should generate correct test data for payment reminder', async () => {
      const mockJob = { id: 'payment_test' }
      queueService.addImmediateEmail.mockResolvedValue(mockJob as any)

      await controller.sendTestEmail({
        to: 'payment@example.com',
        template: 'payment-reminder'
      })

      expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
        'payment@example.com',
        'payment-reminder',
        expect.objectContaining({
          tenantName: 'Test Tenant',
          amountDue: 1500,
          dueDate: expect.any(String),
          propertyAddress: '123 Test Street, Test City, TC 12345',
          paymentLink: 'https://tenantflow.app/pay/test123'
        }),
        expect.any(Object)
      )
    })

    it('should generate correct test data for lease expiration', async () => {
      const mockJob = { id: 'lease_test' }
      queueService.addImmediateEmail.mockResolvedValue(mockJob as any)

      await controller.sendTestEmail({
        to: 'lease@example.com',
        template: 'lease-expiration'
      })

      expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
        'lease@example.com',
        'lease-expiration',
        expect.objectContaining({
          tenantName: 'Test Tenant',
          propertyAddress: '123 Test Street, Test City, TC 12345',
          expirationDate: expect.any(String),
          renewalLink: 'https://tenantflow.app/renew/test123',
          leaseId: 'lease_test_123'
        }),
        expect.any(Object)
      )
    })

    it('should generate correct test data for property tips', async () => {
      const mockJob = { id: 'tips_test' }
      queueService.addImmediateEmail.mockResolvedValue(mockJob as any)

      await controller.sendTestEmail({
        to: 'tips@example.com',
        template: 'property-tips'
      })

      expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
        'tips@example.com',
        'property-tips',
        expect.objectContaining({
          tips: [
            'Keep your property well-maintained to attract quality tenants',
            'Screen tenants thoroughly to reduce turnover',
            'Stay updated on local rental laws and regulations'
          ]
        }),
        expect.any(Object)
      )
    })

    it('should merge custom data with default test data', async () => {
      const mockJob = { id: 'custom_test' }
      queueService.addImmediateEmail.mockResolvedValue(mockJob as any)

      await controller.sendTestEmail({
        to: 'custom@example.com',
        template: 'welcome',
        data: {
          name: 'Custom User',
          customField: 'Custom Value'
        }
      })

      expect(queueService.addImmediateEmail).toHaveBeenCalledWith(
        'custom@example.com',
        'welcome',
        expect.objectContaining({
          name: 'Custom User',
          customField: 'Custom Value',
          companySize: 'medium',
          source: 'test'
        }),
        expect.any(Object)
      )
    })
  })
})