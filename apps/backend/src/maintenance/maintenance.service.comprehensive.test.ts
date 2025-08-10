import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceRequestRepository } from './maintenance-request.repository'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto, MaintenanceRequestQueryDto } from './dto'
import { NotFoundException } from '../common/exceptions/base.exception'
import { SupabaseService } from '../common/supabase.service'
import { PrismaService } from '../prisma/prisma.service'
import { testDataFactory, asyncTestUtils, assertionHelpers } from '../test/base-crud-service.test-utils'

// Mock the dependencies
jest.mock('./maintenance-request.repository')
jest.mock('../common/errors/error-handler.service')
jest.mock('../common/supabase.service')
jest.mock('../prisma/prisma.service')

describe('MaintenanceService - Comprehensive Test Suite', () => {
  let service: MaintenanceService
  let mockRepository: MaintenanceRequestRepository & any
  let mockErrorHandler: ErrorHandlerService & any
  let mockSupabaseService: SupabaseService & any
  let mockPrismaService: PrismaService & any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockRepository = {
      findByOwner: jest.fn(),
      findByIdAndOwner: jest.fn(),
      findByUnit: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      getStatsByOwner: jest.fn(),
      findManyByOwner: jest.fn(),
      findMany: jest.fn(),
      prismaClient: {
        maintenanceRequest: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        }
      }
    } as any

    mockErrorHandler = {
      handleErrorEnhanced: jest.fn().mockImplementation((error) => { throw error }),
      createNotFoundError: jest.fn().mockImplementation((resource, id, _context) => new NotFoundException(resource, id as string)),
      createValidationError: jest.fn().mockImplementation((message) => new Error(`Validation: ${message}`)),
      createBusinessError: jest.fn().mockImplementation((_code, message) => new Error(message as string))
    } as any

    mockSupabaseService = {
      getClient: jest.fn(() => ({
        functions: {
          invoke: jest.fn()
        }
      }))
    } as any

    mockPrismaService = {
      maintenanceRequest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    } as any

    service = new MaintenanceService(
      mockRepository, 
      mockErrorHandler, 
      mockSupabaseService, 
      mockPrismaService
    )
    Object.defineProperty(service, 'entityName', { value: 'maintenance-request' });
  })

  describe('Maintenance-Specific Business Logic', () => {
    describe('Date Handling', () => {
      const validMaintenanceData: CreateMaintenanceRequestDto = {
        title: 'Leaky Faucet',
        description: 'Kitchen faucet is dripping constantly',
        priority: 'MEDIUM',
        unitId: 'unit-123',
        preferredDate: '2024-12-15T10:00:00Z'
      }

      it('should convert preferredDate string to Date object during creation', async () => {
        const mockCreatedRequest = testDataFactory.maintenanceRequest()
        mockRepository.create.mockResolvedValue(mockCreatedRequest)

        await service.create(validMaintenanceData, 'owner-123')

        expect(mockRepository.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: 'Leaky Faucet',
            description: 'Kitchen faucet is dripping constantly',
            priority: 'MEDIUM',
            Unit: { connect: { id: 'unit-123' } },
            preferredDate: new Date('2024-12-15T10:00:00Z')
          })
        })
      })

      it('should handle undefined preferredDate gracefully', async () => {
        const dataWithoutDate = { ...validMaintenanceData }
        delete dataWithoutDate.preferredDate
        
        const mockCreatedRequest = testDataFactory.maintenanceRequest()
        mockRepository.create.mockResolvedValue(mockCreatedRequest)

        await service.create(dataWithoutDate, 'owner-123')

        expect(mockRepository.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            preferredDate: undefined
          })
        })
      })

      it('should convert date strings during update', async () => {
        const existingRequest = testDataFactory.maintenanceRequest()
        mockRepository.prismaClient.maintenanceRequest.findFirst.mockResolvedValue(existingRequest)
        mockRepository.update.mockResolvedValue(existingRequest)

        const updateData: UpdateMaintenanceRequestDto = {
          preferredDate: '2024-12-20T14:00:00Z'
        }

        // Mock the findByIdAndOwner for validation
        mockRepository.findByIdAndOwner.mockResolvedValue(existingRequest)
        
        await service.update('request-123', updateData, 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('request-123', 'owner-123')
        expect(mockRepository.update).toHaveBeenCalledWith({
          where: expect.objectContaining({
            id: 'request-123'
          }),
          data: expect.objectContaining({
            preferredDate: new Date('2024-12-20T14:00:00Z'),
            updatedAt: expect.any(Date)
          })
        })
      })
    })

    describe('Ownership Validation', () => {
      it('should validate ownership through Unit -> Property relationship in update', async () => {
        const existingRequest = testDataFactory.maintenanceRequest()
        mockRepository.findByIdAndOwner.mockResolvedValue(existingRequest)
        mockRepository.update.mockResolvedValue(existingRequest)

        await service.update('request-123', { title: 'Updated Title' }, 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('request-123', 'owner-123')
      })

      it('should validate ownership through Unit -> Property relationship in delete', async () => {
        const existingRequest = testDataFactory.maintenanceRequest()
        mockRepository.findByIdAndOwner.mockResolvedValue(existingRequest)
        mockRepository.delete.mockResolvedValue(existingRequest)

        await service.delete('request-123', 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('request-123', 'owner-123')
      })

      it('should throw NotFoundException when ownership validation fails', async () => {
        mockRepository.findByIdAndOwner.mockResolvedValue(null)

        await expect(service.update('nonexistent', { title: 'Updated' }, 'owner-123'))
          .rejects.toThrow(NotFoundException)

        await expect(service.delete('nonexistent', 'owner-123'))
          .rejects.toThrow(NotFoundException)
      })
    })

    describe('CRUD Operations', () => {
      describe('create', () => {
        it('should create maintenance request with valid data', async () => {
          const maintenanceData: CreateMaintenanceRequestDto = {
            title: 'Broken Window',
            description: 'Living room window is cracked',
            priority: 'HIGH',
            unitId: 'unit-456'
          }
          const mockCreatedRequest = testDataFactory.maintenanceRequest(maintenanceData as unknown as Record<string, unknown>)
          mockRepository.create.mockResolvedValue(mockCreatedRequest)

          const result = await service.create(maintenanceData, 'owner-123')

          expect(mockRepository.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              title: 'Broken Window',
              description: 'Living room window is cracked',
              priority: 'HIGH',
              Unit: { connect: { id: 'unit-456' } },
              preferredDate: undefined
            })
          })
          expect(result).toEqual(mockCreatedRequest)
        })

        it('should handle creation errors with error handler', async () => {
          const error = new Error('Creation failed')
          mockRepository.create.mockRejectedValue(error)

          await expect(service.create({} as any, 'owner-123'))
            .rejects.toThrow()

          expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
            error,
            expect.objectContaining({
              operation: 'create',
              resource: 'maintenance-request',
              metadata: { ownerId: 'owner-123' }
            })
          )
        })
      })

      describe('getByOwner', () => {
        it('should fetch maintenance requests by owner', async () => {
          const mockRequests = [testDataFactory.maintenanceRequest()]
          mockRepository.findManyByOwner.mockResolvedValue(mockRequests)

          const result = await service.getByOwner('owner-123')

          expect(mockRepository.findManyByOwner).toHaveBeenCalledWith('owner-123', {})
          expect(result).toEqual(mockRequests)
        })

        it('should pass query parameters to repository', async () => {
          const query: MaintenanceRequestQueryDto = { priority: 'HIGH', status: 'OPEN' }
          mockRepository.findManyByOwner.mockResolvedValue([])

          await service.getByOwner('owner-123', query)

          expect(mockRepository.findManyByOwner).toHaveBeenCalledWith('owner-123', query)
        })

        it('should handle repository errors with error handler', async () => {
          const error = new Error('Database error')
          mockRepository.findManyByOwner.mockRejectedValue(error)

          await expect(service.getByOwner('owner-123'))
            .rejects.toThrow()

          expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
            error,
            expect.objectContaining({
              operation: 'getByOwner',
              resource: 'maintenance-request',
              metadata: { ownerId: 'owner-123' }
            })
          )
        })
      })

      describe('getByIdOrThrow', () => {
        it('should return maintenance request when found', async () => {
          const mockRequest = testDataFactory.maintenanceRequest()
          mockRepository.findByIdAndOwner.mockResolvedValue(mockRequest)

          const result = await service.getByIdOrThrow('request-123', 'owner-123')

          expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('request-123', 'owner-123')
          expect(result).toEqual(mockRequest)
        })

        it('should throw NotFoundException when not found', async () => {
          mockRepository.findByIdAndOwner.mockResolvedValue(null)

          await expect(service.getByIdOrThrow('nonexistent', 'owner-123'))
            .rejects.toThrow(NotFoundException)
        })

        it('should use error handler for all errors', async () => {
          const error = new Error('Database error')
          mockRepository.findByIdAndOwner.mockRejectedValue(error)

          await expect(service.getByIdOrThrow('request-123', 'owner-123'))
            .rejects.toThrow()

          expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
            error,
            expect.objectContaining({
              operation: 'getByIdOrThrow',
              resource: 'maintenance-request',
              metadata: { id: 'request-123', ownerId: 'owner-123' }
            })
          )
        })
      })

      describe('getByUnit', () => {
        it('should fetch maintenance requests by unit and owner', async () => {
          const mockRequests = [testDataFactory.maintenanceRequest({ unitId: 'unit-123' })]
          mockRepository.findByUnit.mockResolvedValue(mockRequests)

          const result = await service.getByUnit('unit-123', 'owner-123')

          expect(mockRepository.findByUnit).toHaveBeenCalledWith('unit-123', 'owner-123', undefined)
          expect(result).toEqual(mockRequests)
        })

        it('should pass query parameters to repository', async () => {
          const query: MaintenanceRequestQueryDto = { status: 'IN_PROGRESS' }
          mockRepository.findByUnit.mockResolvedValue([])

          await service.getByUnit('unit-123', 'owner-123', query)

          expect(mockRepository.findByUnit).toHaveBeenCalledWith('unit-123', 'owner-123', query)
        })
      })

      describe('getStats', () => {
        it('should delegate to repository getStatsByOwner', async () => {
          const mockStats = { 
            totalRequests: 25, 
            openRequests: 10, 
            inProgressRequests: 8,
            completedRequests: 7 
          }
          mockRepository.getStatsByOwner.mockResolvedValue(mockStats)

          const result = await service.getStats('owner-123')

          expect(mockRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
          expect(result).toEqual(mockStats)
        })

        it('should use error handler for errors', async () => {
          const error = new Error('Stats query failed')
          mockRepository.getStatsByOwner.mockRejectedValue(error)

          await expect(service.getStats('owner-123'))
            .rejects.toThrow()

          expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
            error,
            expect.objectContaining({
              operation: 'getStats',
              resource: 'maintenance-request',
              metadata: { ownerId: 'owner-123' }
            })
          )
        })
      })
    })

    describe('Additional Service Methods', () => {



      describe('getByOwner', () => {
        it('should get maintenance requests by owner', async () => {
          const mockRequests = [testDataFactory.maintenanceRequest()]
          mockRepository.findManyByOwner.mockResolvedValue(mockRequests)

          const result = await service.getByOwner('owner-123', { limit: 20 })

          expect(mockRepository.findManyByOwner).toHaveBeenCalledWith('owner-123', { limit: 20 })
          expect(result).toEqual(mockRequests)
        })
      })
    })

    describe('Notification System', () => {
      const notificationData = {
        type: 'new_request' as const,
        maintenanceRequestId: 'request-123',
        recipientEmail: 'owner@example.com',
        recipientName: 'John Owner',
        recipientRole: 'owner' as const
      }

      const mockMaintenanceRequest = {
        id: 'request-123',
        title: 'Broken Heater',
        description: 'Heating system not working',
        priority: 'HIGH',
        status: 'OPEN',
        createdAt: new Date('2024-01-01'),
        Unit: {
          unitNumber: 'A101',
          Property: {
            name: 'Sunset Apartments'
          }
        }
      }

      beforeEach(() => {
        mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)
      })

      it('should send new request notification', async () => {
        const mockSupabaseClient = {
          functions: {
            invoke: jest.fn<() => Promise<{ data: { id: string }, error: null }>>().mockResolvedValue({ data: { id: 'email-123' }, error: null })
          }
        }
        mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

        const result = await service.sendNotification(notificationData, 'user-123')

        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
          'send-maintenance-notification',
          {
            body: expect.objectContaining({
              to: 'owner@example.com',
              subject: 'New Maintenance Request: Broken Heater - Unit A101',
              template: 'maintenance-notification',
              data: expect.objectContaining({
                recipientName: 'John Owner',
                notificationType: 'new_request',
                maintenanceRequest: expect.objectContaining({
                  id: 'request-123',
                  title: 'Broken Heater',
                  priority: 'HIGH',
                  status: 'OPEN'
                }),
                propertyName: 'Sunset Apartments',
                unitNumber: 'A101',
                isEmergency: false
              })
            })
          }
        )

        expect(result).toEqual({
          emailId: 'email-123',
          sentAt: expect.any(String),
          type: 'new_request'
        })
      })

      it('should send emergency alert notification', async () => {
        const emergencyNotification = {
          ...notificationData,
          type: 'emergency_alert' as const
        }

        const mockSupabaseClient = {
          functions: {
            invoke: jest.fn<() => Promise<{ data: { id: string }, error: null }>>().mockResolvedValue({ data: { id: 'email-456' }, error: null })
          }
        }
        mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

        await service.sendNotification(emergencyNotification, 'user-123')

        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
          'send-maintenance-notification',
          {
            body: expect.objectContaining({
              subject: '🚨 EMERGENCY: Broken Heater - Unit A101, Sunset Apartments',
              data: expect.objectContaining({
                isEmergency: true
              })
            })
          }
        )
      })

      it('should send status update notification', async () => {
        const statusUpdateNotification = {
          ...notificationData,
          type: 'status_update' as const
        }

        const mockSupabaseClient = {
          functions: {
            invoke: jest.fn<() => Promise<{ data: { id: string }, error: null }>>().mockResolvedValue({ data: { id: 'email-789' }, error: null })
          }
        }
        mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

        await service.sendNotification(statusUpdateNotification, 'user-123')

        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
          'send-maintenance-notification',
          {
            body: expect.objectContaining({
              subject: 'Maintenance Update: Broken Heater - OPEN'
            })
          }
        )
      })

      it('should handle notification errors gracefully', async () => {
        const mockSupabaseClient = {
          functions: {
            invoke: jest.fn<() => Promise<{ data: null, error: { message: string } }>>().mockResolvedValue({ 
              data: null, 
              error: { message: 'Email service unavailable' } 
            })
          }
        }
        mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

        await expect(service.sendNotification(notificationData, 'user-123'))
          .rejects.toThrow()

        expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
          ErrorCode.EMAIL_ERROR,
          'Failed to send notification email',
          expect.objectContaining({
            operation: 'sendNotificationEmail',
            resource: 'maintenance',
            metadata: { error: 'Email service unavailable' }
          })
        )
      })

      it('should throw error when maintenance request not found for notification', async () => {
        mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(null)

        await expect(service.sendNotification(notificationData, 'user-123'))
          .rejects.toThrow()

        expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith(
          'Maintenance request',
          'request-123',
          { operation: 'sendNotificationEmail', resource: 'maintenance' }
        )
      })

      it('should set default action URL when not provided', async () => {
        const mockSupabaseClient = {
          functions: {
            invoke: jest.fn<() => Promise<{ data: { id: string }, error: null }>>().mockResolvedValue({ data: { id: 'email-123' }, error: null })
          }
        }
        mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

        await service.sendNotification(notificationData, 'user-123')

        const invokeCall = mockSupabaseClient.functions.invoke.mock.calls[0]?.[1] as any
        expect(invokeCall?.body?.data?.actionUrl).toBe('https://app.tenantflow.com/maintenance/request-123')
      })

      it('should use custom action URL when provided', async () => {
        const customNotification = {
          ...notificationData,
          actionUrl: 'https://custom.com/maintenance/request-123'
        }

        const mockSupabaseClient = {
          functions: {
            invoke: jest.fn<() => Promise<{ data: { id: string }, error: null }>>().mockResolvedValue({ data: { id: 'email-123' }, error: null })
          }
        }
        mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

        await service.sendNotification(customNotification, 'user-123')

        const invokeCall = mockSupabaseClient.functions.invoke.mock.calls[0]?.[1] as any
        expect(invokeCall?.body?.data?.actionUrl).toBe('https://custom.com/maintenance/request-123')
      })
    })

    describe('Notification Logging', () => {
      it('should log notification with proper structure', async () => {
        const logData = {
          type: 'email',
          recipientEmail: 'test@example.com',
          recipientName: 'Test User',
          subject: 'Test Notification',
          maintenanceRequestId: 'request-123',
          notificationType: 'new_request',
          status: 'sent'
        }

        const result = await service.logNotification(logData, 'user-123')

        expect(result).toEqual({
          id: expect.stringMatching(/^log-\d+$/),
          type: 'email',
          recipientEmail: 'test@example.com',
          recipientName: 'Test User',
          subject: 'Test Notification',
          maintenanceRequestId: 'request-123',
          notificationType: 'new_request',
          sentAt: expect.any(String),
          status: 'sent'
        })
      })

      it('should handle logging errors with error handler', async () => {
        const error = new Error('Logging failed')
        // Force an error by making the log generation fail
        jest.spyOn(Date, 'now').mockImplementation(() => { throw error })

        await expect(service.logNotification({}, 'user-123'))
          .rejects.toThrow()

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            operation: 'logNotification',
            resource: 'maintenance-request',
            metadata: expect.objectContaining({
              userId: 'user-123'
            })
          })
        )

        jest.restoreAllMocks()
      })
    })
  })

  describe('Edge Cases and Data Integrity', () => {
    describe('Date Handling Edge Cases', () => {
      it('should handle invalid date strings gracefully', async () => {
        const invalidDateData = {
          title: 'Test Request',
          description: 'Test description',
          priority: 'MEDIUM',
          unitId: 'unit-123',
          tenantId: 'tenant-123',
          preferredDate: 'invalid-date-string'
        }

        // This should create an Invalid Date object, which the system should handle
        const mockCreatedRequest = testDataFactory.maintenanceRequest()
        mockRepository.create.mockResolvedValue(mockCreatedRequest)

        await service.create(invalidDateData as any, 'owner-123')

        const createCall = mockRepository.create.mock.calls[0][0]
        expect(createCall.data.preferredDate).toBeInstanceOf(Date)
      })

      it('should handle timezone differences in date conversion', async () => {
        const timezoneTestData = {
          title: 'Timezone Test',
          description: 'Testing timezone handling',
          priority: 'LOW',
          unitId: 'unit-123',
          tenantId: 'tenant-123',
          preferredDate: '2024-12-15T14:30:00-08:00' // PST timezone
        }

        const mockCreatedRequest = testDataFactory.maintenanceRequest()
        mockRepository.create.mockResolvedValue(mockCreatedRequest)

        await service.create(timezoneTestData as any, 'owner-123')

        const createCall = mockRepository.create.mock.calls[0][0]
        expect(createCall.data.preferredDate).toBeInstanceOf(Date)
        expect(createCall.data.preferredDate.toISOString()).toBe('2024-12-15T22:30:00.000Z')
      })
    })

    describe('Complex Ownership Scenarios', () => {
      it('should handle maintenance requests for units across multiple properties', async () => {
        const multiPropertyRequests = [
          testDataFactory.maintenanceRequest({ unitId: 'unit-property1-123' }),
          testDataFactory.maintenanceRequest({ unitId: 'unit-property2-456' })
        ]
        mockRepository.findManyByOwner.mockResolvedValue(multiPropertyRequests)

        const result = await service.getByOwner('owner-123')

        expect(result).toHaveLength(2)
        expect(result[0]?.unitId).toBe('unit-property1-123')
        expect(result[1]?.unitId).toBe('unit-property2-456')
      })

      it('should properly validate nested ownership relationships', async () => {
        // Test that a maintenance request can only be updated by the property owner
        mockRepository.findByIdAndOwner.mockResolvedValue(null)

        await expect(service.update('request-123', { title: 'Unauthorized Update' }, 'wrong-owner'))
          .rejects.toThrow(NotFoundException)

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('request-123', 'wrong-owner')
      })
    })

    describe('Concurrent Operations', () => {
      it('should handle concurrent maintenance request updates', async () => {
        const existingRequest = testDataFactory.maintenanceRequest()
        mockRepository.findByIdAndOwner.mockResolvedValue(existingRequest)
        mockRepository.update.mockResolvedValue(existingRequest)

        const concurrentUpdates = [
          service.update('request-123', { title: 'Update 1' }, 'owner-123'),
          service.update('request-123', { priority: 'MEDIUM' }, 'owner-123')
        ]

        const results = await Promise.allSettled(concurrentUpdates)
        
        expect(results).toHaveLength(2)
        expect(mockRepository.update).toHaveBeenCalledTimes(2)
      })

      it('should handle concurrent notification sending', async () => {
        const mockSupabaseClient = {
          functions: {
            invoke: jest.fn<() => Promise<{ data: { id: string }, error: null }>>().mockResolvedValue({ data: { id: 'email-123' }, error: null })
          }
        }
        mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

        const notification1 = {
          type: 'new_request' as const,
          maintenanceRequestId: 'request-123',
          recipientEmail: 'owner1@example.com',
          recipientName: 'Owner 1',
          recipientRole: 'owner' as const
        }

        const notification2 = {
          type: 'status_update' as const,
          maintenanceRequestId: 'request-123',
          recipientEmail: 'tenant@example.com',
          recipientName: 'Tenant',
          recipientRole: 'tenant' as const
        }

        // Ensure the mock is configured to be called multiple times
        mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(testDataFactory.maintenanceRequest());

        const concurrentNotifications = [
          service.sendNotification(notification1, 'user-123'),
          service.sendNotification(notification2, 'user-123')
        ]

        const results = await Promise.allSettled(concurrentNotifications)
        
        expect(results).toHaveLength(2)
        expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Performance Validation', () => {
    it('should complete CRUD operations efficiently', async () => {
      const mockRequest = testDataFactory.maintenanceRequest()
      const requestData = {
        title: 'Performance Test',
        description: 'Testing performance',
        priority: 'MEDIUM',
        unitId: 'unit-123',
        tenantId: 'tenant-123'
      }

      // Setup fast mocks
      mockRepository.findByOwner.mockResolvedValue([mockRequest])
      mockRepository.findByIdAndOwner.mockResolvedValue(mockRequest)
      mockRepository.create.mockResolvedValue(mockRequest)
      mockRepository.update.mockResolvedValue(mockRequest)
      mockRepository.delete.mockResolvedValue(mockRequest)
      mockRepository.prismaClient.maintenanceRequest.findFirst.mockResolvedValue(mockRequest)

      const { duration: createDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.create(requestData as any, 'owner-123')
      )

      const { duration: findDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.getByIdOrThrow('request-123', 'owner-123')
      )

      const { duration: updateDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.update('request-123', { title: 'Updated Title' }, 'owner-123')
      )

      const { duration: deleteDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.delete('request-123', 'owner-123')
      )

      // Validate operations complete quickly in test environment
      expect(createDuration).toBeLessThan(100)
      expect(findDuration).toBeLessThan(50)
      expect(updateDuration).toBeLessThan(100)
      expect(deleteDuration).toBeLessThan(100)
    })

    it('should handle bulk operations efficiently', async () => {
      const mockRequests = Array(100).fill(null).map((_, i) => 
        testDataFactory.maintenanceRequest({ id: `request-${i}` })
      )
      mockRepository.findManyByOwner.mockResolvedValue(mockRequests)

      const { duration } = await asyncTestUtils.measureExecutionTime(() =>
        service.getByOwner('owner-123')
      )

      expect(duration).toBeLessThan(200) // Should handle 100 requests quickly
    })

    it('should handle complex notification operations efficiently', async () => {
      const mockSupabaseClient = {
        functions: {
          invoke: jest.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null })
        }
      }
      mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

      // Mock the maintenance request lookup
      const mockMaintenanceRequest = {
        id: 'request-123',
        title: 'Test Request',
        description: 'Test description',
        status: 'PENDING',
        priority: 'MEDIUM',
        createdAt: new Date('2024-01-01'),
        Unit: {
          unitNumber: '123',
          Property: {
            name: 'Test Property'
          }
        }
      }
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)

      const notificationData = {
        type: 'new_request' as const,
        maintenanceRequestId: 'request-123',
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        recipientRole: 'owner' as const
      }

      const { duration } = await asyncTestUtils.measureExecutionTime(() =>
        service.sendNotification(notificationData, 'user-123')
      )

      expect(duration).toBeLessThan(300) // Notification should be fast
    })
  })

  describe('Data Integrity and Business Rules', () => {
    it('should preserve original data during partial updates', async () => {
      const existingRequest = testDataFactory.maintenanceRequest({
        title: 'Original Title',
        description: 'Original Description',
        priority: 'MEDIUM'
      })
      mockRepository.findByIdAndOwner.mockResolvedValue(existingRequest)
      mockRepository.update.mockImplementation(({ data }: { data: any }) => 
        Promise.resolve({ ...existingRequest, ...data })
      )

      const updateData = { priority: 'HIGH' }
      const result = await service.update('request-123', updateData as unknown as UpdateMaintenanceRequestDto, 'owner-123')

      // Should only update the specified field
      expect(result.priority).toBe('HIGH')
      expect(result.title).toBe('Original Title') // Should remain unchanged
      expect(result.description).toBe('Original Description') // Should remain unchanged
    })

    it('should maintain referential integrity', async () => {
      const requestData = {
        title: 'Integrity Test',
        description: 'Testing referential integrity',
        priority: 'MEDIUM',
        unitId: 'unit-123'
      }
      const mockCreatedRequest = testDataFactory.maintenanceRequest(requestData)
      mockRepository.create.mockResolvedValue(mockCreatedRequest)

      const result = await service.create(requestData as any, 'owner-123')

      // Verify all references are properly set
      assertionHelpers.hasValidTimestamps(result)
      expect(result.title).toBe(requestData.title)
      expect(result.unitId).toBe(requestData.unitId)
    })

    it('should handle notification data integrity', async () => {
      const mockSupabaseClient = {
        functions: {
          invoke: jest.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null })
        }
      }
      mockSupabaseService.getClient.mockReturnValue(mockSupabaseClient)

      // Mock the maintenance request lookup
      const mockMaintenanceRequest = {
        id: 'request-123',
        title: 'Test Request',
        description: 'Test description',
        status: 'PENDING',
        priority: 'MEDIUM',
        createdAt: new Date('2024-01-01'),
        Unit: {
          unitNumber: '123',
          Property: {
            name: 'Test Property'
          }
        }
      }
      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockMaintenanceRequest)

      const notificationData = {
        type: 'new_request' as const,
        maintenanceRequestId: 'request-123',
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        recipientRole: 'owner' as const
      }

      await service.sendNotification(notificationData, 'user-123')

      const invokeCall = mockSupabaseClient.functions.invoke.mock.calls[0]?.[1] as any
      const emailData = invokeCall?.body

      // Verify email data structure integrity
      expect(emailData.to).toBe('test@example.com')
      expect(emailData.subject).toContain('New Maintenance Request')
      expect(emailData.template).toBe('maintenance-notification')
      expect(emailData.data.recipientName).toBe('Test User')
      expect(emailData.data.maintenanceRequest).toBeDefined()
      expect(emailData.data.actionUrl).toBeDefined()
    })
  })
})
