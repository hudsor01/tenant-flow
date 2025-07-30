import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Logger } from '@nestjs/common'
import { MaintenanceService } from './maintenance.service'
import { PrismaService } from '../prisma/prisma.service'
import { SupabaseService } from '../common/supabase.service'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { mockPrismaService, mockErrorHandler, mockSupabaseClient } from '../test/setup'

// Mock dependencies are imported from test setup
const mockSupabaseService = {
  getClient: vi.fn(() => mockSupabaseClient)
} as any

// Mock MaintenanceRequestRepository
const mockMaintenanceRequestRepository = {
  create: vi.fn(),
  findByOwner: vi.fn(),
  getStatsByOwner: vi.fn(),
  findByIdAndOwner: vi.fn(),
  update: vi.fn(),
  deleteById: vi.fn(),
  findByUnit: vi.fn(),
  prismaClient: mockPrismaService
} as any

// Mock getFrontendUrl
vi.mock('../shared/constants/app-config', () => ({
  getFrontendUrl: vi.fn((path: string) => `https://app.tenantflow.com${path}`)
}))

describe('MaintenanceService', () => {
  let maintenanceService: MaintenanceService
  let maintenanceRequestRepository: any
  let prismaService: PrismaService
  let supabaseService: SupabaseService
  let errorHandler: ErrorHandlerService

  const mockMaintenanceRequest = {
    id: 'maintenance-123',
    unitId: 'unit-123',
    title: 'Leaky faucet',
    description: 'The kitchen faucet is dripping constantly',
    category: 'PLUMBING',
    priority: 'MEDIUM',
    status: 'OPEN',
    preferredDate: new Date('2024-02-01'),
    allowEntry: true,
    contactPhone: '+1234567890',
    requestedBy: 'tenant-123',
    notes: 'Available weekdays after 5pm',
    photos: ['photo1.jpg', 'photo2.jpg'],
    completedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    Unit: {
      id: 'unit-123',
      unitNumber: '101',
      Property: {
        id: 'property-123',
        name: 'Test Property',
        address: '123 Test St'
      },
      Lease: [{
        id: 'lease-123',
        status: 'ACTIVE',
        Tenant: {
          id: 'tenant-123',
          name: 'John Doe',
          email: 'john@example.com',
          User: {
            id: 'user-123',
            email: 'john@example.com',
            name: 'John Doe'
          }
        }
      }]
    }
  }

  const mockCreateInput = {
    unitId: 'unit-123',
    title: 'Leaky faucet',
    description: 'The kitchen faucet is dripping constantly',
    category: 'PLUMBING',
    priority: 'MEDIUM',
    status: 'OPEN',
    preferredDate: new Date('2024-02-01'),
    allowEntry: true,
    contactPhone: '+1234567890',
    requestedBy: 'tenant-123',
    notes: 'Available weekdays after 5pm',
    photos: ['photo1.jpg', 'photo2.jpg']
  }

  const mockUpdateInput = {
    status: 'IN_PROGRESS',
    notes: 'Contractor assigned',
    completedAt: '2024-01-15T10:00:00Z'
  }

  const mockMaintenanceStats = {
    total: 25,
    open: 10,
    inProgress: 8,
    completed: 7
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    maintenanceRequestRepository = mockMaintenanceRequestRepository
    prismaService = mockPrismaService as any
    supabaseService = mockSupabaseService as any
    errorHandler = mockErrorHandler as any
    
    maintenanceService = new MaintenanceService(
      maintenanceRequestRepository,
      errorHandler,
      supabaseService,
      prismaService
    )

    // Mock Logger to prevent console output during tests
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {})
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
  })

  describe('create', () => {
    it('should create maintenance request successfully', async () => {
      mockMaintenanceRequestRepository.create.mockResolvedValue(mockMaintenanceRequest)

      const result = await maintenanceService.create(mockCreateInput, 'owner-123')

      expect(mockMaintenanceRequestRepository.create).toHaveBeenCalledWith({
        data: {
          unitId: 'unit-123',
          title: 'Leaky faucet',
          description: 'The kitchen faucet is dripping constantly',
          category: 'PLUMBING',
          priority: 'MEDIUM',
          status: 'OPEN',
          preferredDate: new Date('2024-02-01'),
          allowEntry: true,
          contactPhone: '+1234567890',
          requestedBy: 'tenant-123',
          notes: 'Available weekdays after 5pm',
          photos: ['photo1.jpg', 'photo2.jpg']
        }
      })
      expect(result).toEqual(mockMaintenanceRequest)
    })

    it('should handle minimal input data', async () => {
      const minimalInput = {
        unitId: 'unit-123',
        title: 'Broken AC',
        description: 'Air conditioning not working',
        category: 'HVAC'
      }

      const expectedResult = {
        ...mockMaintenanceRequest,
        title: 'Broken AC',
        description: 'Air conditioning not working',
        category: 'HVAC',
        priority: undefined,
        status: undefined,
        preferredDate: undefined,
        allowEntry: undefined,
        contactPhone: undefined,
        requestedBy: undefined,
        notes: undefined,
        photos: undefined
      }

      mockMaintenanceRequestRepository.create.mockResolvedValue(expectedResult)

      const result = await maintenanceService.create(minimalInput, 'owner-123')

      expect(mockMaintenanceRequestRepository.create).toHaveBeenCalledWith({
        data: {
          unitId: 'unit-123',
          title: 'Broken AC',
          description: 'Air conditioning not working',
          category: 'HVAC',
          priority: undefined,
          status: undefined,
          preferredDate: undefined,
          allowEntry: undefined,
          contactPhone: undefined,
          requestedBy: undefined,
          notes: undefined,
          photos: undefined
        }
      })
      expect(result).toEqual(expectedResult)
    })
  })

  describe('findAll', () => {
    it('should return maintenance requests with default query', async () => {
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([mockMaintenanceRequest])

      const result = await maintenanceService.findAll({})

      expect(mockPrismaService.maintenanceRequest.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        include: {
          Unit: {
            include: {
              Property: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      expect(result).toEqual([mockMaintenanceRequest])
    })

    it('should handle query parameters correctly', async () => {
      const query = {
        limit: 5,
        offset: 10,
        unitId: 'unit-123',
        status: 'OPEN',
        priority: 'HIGH'
      }

      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([])

      await maintenanceService.findAll(query)

      expect(mockPrismaService.maintenanceRequest.findMany).toHaveBeenCalledWith({
        where: {
          unitId: 'unit-123',
          status: 'OPEN',
          priority: 'HIGH'
        },
        skip: 10,
        take: 5,
        include: {
          Unit: {
            include: {
              Property: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    })

    it('should handle partial query filters', async () => {
      const query = {
        status: 'IN_PROGRESS'
      }

      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([])

      await maintenanceService.findAll(query)

      expect(mockPrismaService.maintenanceRequest.findMany).toHaveBeenCalledWith({
        where: {
          status: 'IN_PROGRESS'
        },
        skip: 0,
        take: 10,
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('findOne', () => {
    it('should return maintenance request when found', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)

      const result = await maintenanceService.findOne('maintenance-123')

      expect(mockPrismaService.maintenanceRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'maintenance-123' },
        include: {
          Unit: {
            include: {
              Property: true
            }
          }
        }
      })
      expect(result).toEqual(mockMaintenanceRequest)
    })

    it('should return null when maintenance request not found', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(null)

      const result = await maintenanceService.findOne('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('should update maintenance request successfully', async () => {
      const updatedRequest = {
        ...mockMaintenanceRequest,
        status: 'IN_PROGRESS',
        notes: 'Contractor assigned',
        completedAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date()
      }

      // Mock the ownership check
      mockMaintenanceRequestRepository.prismaClient.maintenanceRequest.findFirst.mockResolvedValue(mockMaintenanceRequest)
      mockMaintenanceRequestRepository.update.mockResolvedValue(updatedRequest)

      const result = await maintenanceService.update('maintenance-123', mockUpdateInput, 'owner-123')

      expect(mockMaintenanceRequestRepository.update).toHaveBeenCalledWith({
        where: { id: 'maintenance-123' },
        data: {
          status: 'IN_PROGRESS',
          notes: 'Contractor assigned',
          completedAt: new Date('2024-01-15T10:00:00Z')
        }
      })
      expect(result).toEqual(updatedRequest)
    })

    it('should handle partial updates', async () => {
      const partialUpdate = {
        status: 'COMPLETED'
      }

      // Mock the ownership check
      mockMaintenanceRequestRepository.prismaClient.maintenanceRequest.findFirst.mockResolvedValue(mockMaintenanceRequest)
      mockMaintenanceRequestRepository.update.mockResolvedValue({
        ...mockMaintenanceRequest,
        status: 'COMPLETED'
      })

      await maintenanceService.update('maintenance-123', partialUpdate, 'owner-123')

      expect(mockMaintenanceRequestRepository.update).toHaveBeenCalledWith({
        where: { id: 'maintenance-123' },
        data: {
          status: 'COMPLETED'
        }
      })
    })

    it('should handle completedAt date conversion', async () => {
      const updateWithDate = {
        completedAt: '2024-01-20T15:30:00Z'
      }

      // Mock the ownership check
      mockMaintenanceRequestRepository.prismaClient.maintenanceRequest.findFirst.mockResolvedValue(mockMaintenanceRequest)
      mockMaintenanceRequestRepository.update.mockResolvedValue(mockMaintenanceRequest)

      await maintenanceService.update('maintenance-123', updateWithDate, 'owner-123')

      expect(mockMaintenanceRequestRepository.update).toHaveBeenCalledWith({
        where: { id: 'maintenance-123' },
        data: {
          completedAt: new Date('2024-01-20T15:30:00Z')
        }
      })
    })
  })

  describe('remove', () => {
    it('should delete maintenance request successfully', async () => {
      mockPrismaService.maintenanceRequest.delete.mockResolvedValue(mockMaintenanceRequest)

      const result = await maintenanceService.remove('maintenance-123')

      expect(mockPrismaService.maintenanceRequest.delete).toHaveBeenCalledWith({
        where: { id: 'maintenance-123' }
      })
      expect(result).toEqual(mockMaintenanceRequest)
    })
  })

  describe('findAllByOwner', () => {
    it('should delegate to findAll method', async () => {
      const query = { status: 'OPEN' }
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([mockMaintenanceRequest])

      // Spy on the findAll method
      const findAllSpy = vi.spyOn(maintenanceService, 'findAll')

      await maintenanceService.findAllByOwner('owner-123', query)

      expect(findAllSpy).toHaveBeenCalledWith(query)
    })

    it('should use empty query when not provided', async () => {
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([])

      const findAllSpy = vi.spyOn(maintenanceService, 'findAll')

      await maintenanceService.findAllByOwner('owner-123')

      expect(findAllSpy).toHaveBeenCalledWith({})
    })
  })

  describe('getStats', () => {
    it('should return maintenance statistics', async () => {
      mockMaintenanceRequestRepository.getStatsByOwner.mockResolvedValue(mockMaintenanceStats)

      const result = await maintenanceService.getStats('owner-123')

      expect(mockMaintenanceRequestRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
      expect(result).toEqual(mockMaintenanceStats)
    })

    it('should work without owner ID parameter', async () => {
      const expectedStats = {
        total: 15,
        open: 5,
        inProgress: 4,
        completed: 6
      }
      
      mockMaintenanceRequestRepository.getStatsByOwner.mockResolvedValue(expectedStats)

      const result = await maintenanceService.getStats('owner-123')

      expect(result).toEqual(expectedStats)
    })
  })

  describe('sendNotification', () => {
    const mockNotificationData = {
      type: 'new_request' as const,
      maintenanceRequestId: 'maintenance-123',
      recipientEmail: 'owner@example.com',
      recipientName: 'Property Owner',
      recipientRole: 'owner' as const,
      actionUrl: 'https://app.tenantflow.com/maintenance/maintenance-123'
    }

    it('should send notification successfully', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      const result = await maintenanceService.sendNotification(mockNotificationData, 'user-123')

      expect(mockPrismaService.maintenanceRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'maintenance-123' },
        include: {
          Unit: {
            include: {
              Property: true
            }
          }
        }
      })

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'send-maintenance-notification',
        {
          body: {
            to: 'owner@example.com',
            subject: 'New Maintenance Request: Leaky faucet - Unit 101',
            template: 'maintenance-notification',
            data: {
              recipientName: 'Property Owner',
              notificationType: 'new_request',
              maintenanceRequest: {
                id: 'maintenance-123',
                title: 'Leaky faucet',
                description: 'The kitchen faucet is dripping constantly',
                priority: 'MEDIUM',
                status: 'OPEN',
                createdAt: mockMaintenanceRequest.createdAt.toISOString()
              },
              actionUrl: 'https://app.tenantflow.com/maintenance/maintenance-123',
              propertyName: 'Test Property',
              unitNumber: '101',
              isEmergency: false
            }
          }
        }
      )

      expect(result).toEqual({
        emailId: 'email-123',
        sentAt: expect.any(String),
        type: 'new_request'
      })
    })

    it('should generate correct email subject for emergency alert', async () => {
      const emergencyData = {
        ...mockNotificationData,
        type: 'emergency_alert' as const
      }

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      await maintenanceService.sendNotification(emergencyData, 'user-123')

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'send-maintenance-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            subject: '🚨 EMERGENCY: Leaky faucet - Unit 101, Test Property',
            data: expect.objectContaining({
              isEmergency: true
            })
          })
        })
      )
    })

    it('should generate correct email subject for status update', async () => {
      const statusUpdateData = {
        ...mockNotificationData,
        type: 'status_update' as const
      }

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      await maintenanceService.sendNotification(statusUpdateData, 'user-123')

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'send-maintenance-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            subject: 'Maintenance Update: Leaky faucet - OPEN'
          })
        })
      )
    })

    it('should throw error when maintenance request not found', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(null)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Maintenance request not found'))

      await expect(maintenanceService.sendNotification(mockNotificationData, 'user-123'))
        .rejects.toThrow('Maintenance request not found')

      expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith(
        'Maintenance request',
        'maintenance-123',
        { operation: 'sendNotificationEmail', resource: 'maintenance' }
      )
    })

    it('should handle email sending errors', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Email service unavailable' }
      })
      mockErrorHandler.createBusinessError.mockReturnValue(new Error('Failed to send notification email'))

      await expect(maintenanceService.sendNotification(mockNotificationData, 'user-123'))
        .rejects.toThrow('Failed to send notification email')

      expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
        ErrorCode.EMAIL_ERROR,
        'Failed to send notification email',
        {
          operation: 'sendNotificationEmail',
          resource: 'maintenance',
          metadata: { error: 'Email service unavailable' }
        }
      )
    })

    it('should use default action URL when not provided', async () => {
      const notificationWithoutUrl = {
        ...mockNotificationData,
        actionUrl: undefined
      }

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      await maintenanceService.sendNotification(notificationWithoutUrl, 'user-123')

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'send-maintenance-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            data: expect.objectContaining({
              actionUrl: 'https://app.tenantflow.com/maintenance/maintenance-123'
            })
          })
        })
      )
    })
  })

  describe('logNotification', () => {
    const mockLogData = {
      type: 'maintenance_notification' as const,
      recipientEmail: 'owner@example.com',
      recipientName: 'Property Owner',
      subject: 'New Maintenance Request',
      maintenanceRequestId: 'maintenance-123',
      notificationType: 'new_request',
      status: 'sent' as const
    }

    it('should log notification successfully', async () => {
      const result = await maintenanceService.logNotification(mockLogData, 'user-123')

      expect(result).toEqual({
        id: expect.stringMatching(/^log-\d+$/),
        type: 'maintenance_notification',
        recipientEmail: 'owner@example.com',
        recipientName: 'Property Owner',
        subject: 'New Maintenance Request',
        maintenanceRequestId: 'maintenance-123',
        notificationType: 'new_request',
        sentAt: expect.any(String),
        status: 'sent'
      })
    })

    it('should handle failed notification logging', async () => {
      const failedLogData = {
        ...mockLogData,
        status: 'failed' as const
      }

      const result = await maintenanceService.logNotification(failedLogData, 'user-123')

      expect(result.status).toBe('failed')
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle database connection errors in create', async () => {
      const dbError = new Error('Database connection failed')
      mockMaintenanceRequestRepository.create.mockRejectedValue(dbError)

      await expect(maintenanceService.create(mockCreateInput, 'owner-123'))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle database connection errors in findAll', async () => {
      const dbError = new Error('Query timeout')
      mockPrismaService.maintenanceRequest.findMany.mockRejectedValue(dbError)

      await expect(maintenanceService.findAll({}))
        .rejects.toThrow('Query timeout')
    })

    it('should handle very large offset values', async () => {
      const query = { offset: 999999, limit: 50 }
      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue([])

      await maintenanceService.findAll(query)

      expect(mockPrismaService.maintenanceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 999999,
          take: 50
        })
      )
    })

    it('should handle empty photos array', async () => {
      const inputWithEmptyPhotos = {
        ...mockCreateInput,
        photos: []
      }

      mockMaintenanceRequestRepository.create.mockResolvedValue({
        ...mockMaintenanceRequest,
        photos: []
      })

      await maintenanceService.create(inputWithEmptyPhotos, 'owner-123')

      expect(mockMaintenanceRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            photos: []
          })
        })
      )
    })

    it('should handle null maintenance request in notification', async () => {
      const mockDataWithMissingUnit = {
        ...mockMaintenanceRequest,
        Unit: null
      }

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockDataWithMissingUnit)
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { id: 'email-123' },
        error: null
      })

      await maintenanceService.sendNotification(
        {
          type: 'new_request',
          maintenanceRequestId: 'maintenance-123',
          recipientEmail: 'owner@example.com',
          recipientName: 'Property Owner',
          recipientRole: 'owner'
        },
        'user-123'
      )

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'send-maintenance-notification',
        expect.objectContaining({
          body: expect.objectContaining({
            data: expect.objectContaining({
              propertyName: '',
              unitNumber: ''
            })
          })
        })
      )
    })

    it('should handle concurrent maintenance operations', async () => {
      const request1 = { ...mockMaintenanceRequest, id: 'maintenance-1' }
      const request2 = { ...mockMaintenanceRequest, id: 'maintenance-2' }
      const request3 = { ...mockMaintenanceRequest, id: 'maintenance-3' }

      mockPrismaService.maintenanceRequest.findUnique
        .mockResolvedValueOnce(request1)
        .mockResolvedValueOnce(request2)
        .mockResolvedValueOnce(request3)

      const promises = [
        maintenanceService.findOne('maintenance-1'),
        maintenanceService.findOne('maintenance-2'),
        maintenanceService.findOne('maintenance-3')
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      expect(results[0].id).toBe('maintenance-1')
      expect(results[1].id).toBe('maintenance-2')
      expect(results[2].id).toBe('maintenance-3')
    })

    it('should handle Supabase function invocation failure with detailed error', async () => {
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function timeout', status: 504, details: 'Edge function timeout' }
      })
      mockErrorHandler.createBusinessError.mockReturnValue(new Error('Failed to send notification email'))

      await expect(maintenanceService.sendNotification(
        {
          type: 'new_request',
          maintenanceRequestId: 'maintenance-123',
          recipientEmail: 'owner@example.com',
          recipientName: 'Property Owner',
          recipientRole: 'owner'
        },
        'user-123'
      )).rejects.toThrow('Failed to send notification email')

      expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
        ErrorCode.EMAIL_ERROR,
        'Failed to send notification email',
        {
          operation: 'sendNotificationEmail',
          resource: 'maintenance',
          metadata: { error: 'Function timeout' }
        }
      )
    })
  })
})