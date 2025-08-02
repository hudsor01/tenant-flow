import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PropertyType } from '@prisma/client'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { NotFoundException, ValidationException } from '../common/exceptions/base.exception'
import { createBaseCrudServiceTestSuite } from '../test/base-crud-service.test.template'
import { testDataFactory, crudExpectations, asyncTestUtils, assertionHelpers } from '../test/base-crud-service.test-utils'

// Mock the repository and error handler
vi.mock('./properties.repository')
vi.mock('../common/errors/error-handler.service')

describe('PropertiesService - Comprehensive Test Suite', () => {
  let service: PropertiesService
  let mockRepository: PropertiesRepository & any
  let mockErrorHandler: ErrorHandlerService & any

  beforeEach(() => {
    mockRepository = {
      findByOwnerWithUnits: vi.fn(),
      findById: vi.fn(),
      findByIdAndOwner: vi.fn(),
      create: vi.fn(),
      createWithUnits: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteById: vi.fn(),
      exists: vi.fn(),
      getStatsByOwner: vi.fn(),
      countByOwner: vi.fn(),
      findMany: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      findManyByOwner: vi.fn(),
      findManyByOwnerPaginated: vi.fn(),
      prismaClient: {
        property: {
          findMany: vi.fn(),
          create: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn(),
          delete: vi.fn()
        },
        unit: {
          createMany: vi.fn()
        },
        lease: {
          count: vi.fn()
        },
        $transaction: vi.fn()
      }
    } as any

    mockErrorHandler = {
      handleErrorEnhanced: vi.fn((error) => { throw error }),
      createNotFoundError: vi.fn((resource, id) => new NotFoundException(resource, id)),
      createValidationError: vi.fn((message, field) => new ValidationException(message, field)),
      createBusinessError: vi.fn()
    } as any

    service = new PropertiesService(mockRepository, mockErrorHandler)
  })

  // Use the base CRUD test suite
  describe('Base CRUD Operations', createBaseCrudServiceTestSuite({
    ServiceClass: PropertiesService,
    repositoryMock: () => mockRepository,
    entityFactory: testDataFactory.property,
    serviceName: 'PropertiesService',
    resourceName: 'property'
  }))

  // Properties-specific business logic tests
  describe('Properties-Specific Business Logic', () => {
    describe('getPropertiesByOwner', () => {
      const mockProperty = testDataFactory.property()

      it('should validate required ownerId', async () => {
        await expect(service.getPropertiesByOwner(''))
          .rejects.toThrow('Owner ID is required')
      })

      it('should validate limit boundaries', async () => {
        await expect(service.getPropertiesByOwner('owner-123', { limit: -1 }))
          .rejects.toThrow('Limit must be between 0 and 1000')
        
        await expect(service.getPropertiesByOwner('owner-123', { limit: 1001 }))
          .rejects.toThrow('Limit must be between 0 and 1000')
      })

      it('should validate offset is non-negative', async () => {
        await expect(service.getPropertiesByOwner('owner-123', { offset: -1 }))
          .rejects.toThrow('Offset must be non-negative')
      })

      it('should handle string numeric inputs correctly', async () => {
        mockRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

        await service.getPropertiesByOwner('owner-123', { limit: '10', offset: '5' })

        expect(mockRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
          'owner-123',
          expect.objectContaining({
            limit: 10,
            offset: 5
          })
        )
      })

      it('should filter by property type when specified', async () => {
        mockRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

        await service.getPropertiesByOwner('owner-123', { 
          propertyType: PropertyType.APARTMENT 
        })

        expect(mockRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
          'owner-123',
          expect.objectContaining({
            propertyType: PropertyType.APARTMENT
          })
        )
      })

      it('should handle search queries', async () => {
        mockRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

        await service.getPropertiesByOwner('owner-123', { 
          search: 'downtown apartment' 
        })

        expect(mockRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
          'owner-123',
          expect.objectContaining({
            search: 'downtown apartment'
          })
        )
      })
    })

    describe('getPropertyById', () => {
      const mockProperty = testDataFactory.property()

      it('should validate required id parameter', async () => {
        await expect(service.getPropertyById('', 'owner-123'))
          .rejects.toThrow('Property ID is required')
      })

      it('should validate required ownerId parameter', async () => {
        await expect(service.getPropertyById('prop-123', ''))
          .rejects.toThrow('Owner ID is required')
      })

      it('should include units when finding property', async () => {
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)

        await service.getPropertyById('prop-123', 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith(
          'prop-123',
          'owner-123',
          true // includeUnits
        )
      })

      it('should throw NotFoundException when property not found', async () => {
        mockRepository.findByIdAndOwner.mockResolvedValue(null)

        await expect(service.getPropertyById('nonexistent', 'owner-123'))
          .rejects.toThrow(NotFoundException)
      })
    })

    describe('createProperty', () => {
      const mockPropertyData = {
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345',
        description: 'A test property'
      }

      it('should default to SINGLE_FAMILY property type', async () => {
        const createdProperty = testDataFactory.property()
        mockRepository.create.mockResolvedValue(createdProperty)

        await service.createProperty(mockPropertyData, 'owner-123')

        expect(mockRepository.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            propertyType: PropertyType.SINGLE_FAMILY
          })
        })
      })

      it('should use specified property type', async () => {
        const propertyDataWithType = {
          ...mockPropertyData,
          propertyType: PropertyType.APARTMENT
        }
        const createdProperty = testDataFactory.property()
        mockRepository.create.mockResolvedValue(createdProperty)

        await service.createProperty(propertyDataWithType, 'owner-123')

        expect(mockRepository.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            propertyType: PropertyType.APARTMENT
          })
        })
      })

      it('should create property with units when units count specified', async () => {
        const propertyDataWithUnits = {
          ...mockPropertyData,
          units: 3
        }
        const createdProperty = testDataFactory.property()
        mockRepository.createWithUnits.mockResolvedValue(createdProperty)

        await service.createProperty(propertyDataWithUnits, 'owner-123')

        expect(mockRepository.createWithUnits).toHaveBeenCalledWith(
          expect.objectContaining({
            ...mockPropertyData,
            ownerId: 'owner-123',
            propertyType: PropertyType.SINGLE_FAMILY,
            User: { connect: { id: 'owner-123' } }
          }),
          3
        )
      })

      it('should not create units when units is 0', async () => {
        const propertyDataWithZeroUnits = {
          ...mockPropertyData,
          units: 0
        }
        const createdProperty = testDataFactory.property()
        mockRepository.create.mockResolvedValue(createdProperty)

        await service.createProperty(propertyDataWithZeroUnits, 'owner-123')

        expect(mockRepository.create).toHaveBeenCalled()
        expect(mockRepository.createWithUnits).not.toHaveBeenCalled()
      })

      it('should handle creation errors with error handler', async () => {
        const error = new Error('Database error')
        mockRepository.create.mockRejectedValue(error)

        await expect(service.createProperty(mockPropertyData, 'owner-123'))
          .rejects.toThrow('Database error')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            operation: 'create',
            resource: 'property',
            metadata: expect.objectContaining({
              ownerId: 'owner-123',
              propertyName: mockPropertyData.name
            })
          })
        )
      })
    })

    describe('updateProperty', () => {
      const mockUpdateData = {
        name: 'Updated Property',
        description: 'Updated description',
        bathrooms: '2.5',
        bedrooms: '3'
      }

      it('should verify ownership before update', async () => {
        const mockProperty = testDataFactory.property()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.update.mockResolvedValue(mockProperty)

        await service.updateProperty('prop-123', mockUpdateData, 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('prop-123', 'owner-123', true)
      })

      it('should throw NotFoundException when property does not exist', async () => {
        mockRepository.findByIdAndOwner.mockResolvedValue(null)

        await expect(service.updateProperty('prop-123', mockUpdateData, 'owner-123'))
          .rejects.toThrow(NotFoundException)
      })

      it('should convert string numbers to numeric values', async () => {
        const mockProperty = testDataFactory.property()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.update.mockResolvedValue(mockProperty)

        await service.updateProperty('prop-123', mockUpdateData, 'owner-123')

        expect(mockRepository.update).toHaveBeenCalledWith({
          where: { id: 'prop-123', ownerId: 'owner-123' },
          data: expect.objectContaining({
            bathrooms: 2.5,
            bedrooms: 3,
            updatedAt: expect.any(Date)
          })
        })
      })

      it('should handle empty string values for bathrooms and bedrooms', async () => {
        const updateDataWithEmptyStrings = {
          name: 'Updated Property',
          bathrooms: '',
          bedrooms: ''
        }
        const mockProperty = testDataFactory.property()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.update.mockResolvedValue(mockProperty)

        await service.updateProperty('prop-123', updateDataWithEmptyStrings, 'owner-123')

        expect(mockRepository.update).toHaveBeenCalledWith({
          where: { id: 'prop-123', ownerId: 'owner-123' },
          data: expect.objectContaining({
            bathrooms: undefined,
            bedrooms: undefined
          })
        })
      })

      it('should always set updatedAt timestamp', async () => {
        const mockProperty = testDataFactory.property()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.update.mockResolvedValue(mockProperty)

        await service.updateProperty('prop-123', { name: 'Updated' }, 'owner-123')

        expect(mockRepository.update).toHaveBeenCalledWith({
          where: { id: 'prop-123', ownerId: 'owner-123' },
          data: expect.objectContaining({
            updatedAt: expect.any(Date)
          })
        })
      })
    })

    describe('deleteProperty', () => {
      it('should verify ownership before deletion', async () => {
        const mockProperty = testDataFactory.property()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.prismaClient.lease.count.mockResolvedValue(0)
        mockRepository.delete.mockResolvedValue(mockProperty)

        await service.deleteProperty('prop-123', 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('prop-123', 'owner-123', true)
      })

      it('should check for active leases before deletion', async () => {
        const mockProperty = testDataFactory.property()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.prismaClient.lease.count.mockResolvedValue(0)
        mockRepository.delete.mockResolvedValue(mockProperty)

        await service.deleteProperty('prop-123', 'owner-123')

        expect(mockRepository.prismaClient.lease.count).toHaveBeenCalledWith({
          where: {
            Unit: { propertyId: 'prop-123' },
            status: 'ACTIVE'
          }
        })
      })

      it('should prevent deletion when active leases exist', async () => {
        const mockProperty = testDataFactory.property()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.prismaClient.lease.count.mockResolvedValue(2)

        await expect(service.deleteProperty('prop-123', 'owner-123'))
          .rejects.toThrow('Cannot delete property with 2 active leases')

        expect(mockRepository.delete).not.toHaveBeenCalled()
      })

      it('should throw NotFoundException when property does not exist', async () => {
        mockRepository.findByIdAndOwner.mockResolvedValue(null)

        await expect(service.deleteProperty('prop-123', 'owner-123'))
          .rejects.toThrow(NotFoundException)

        expect(mockRepository.prismaClient.lease.count).not.toHaveBeenCalled()
        expect(mockRepository.delete).not.toHaveBeenCalled()
      })
    })

    describe('getPropertyStats', () => {
      it('should delegate to repository getStatsByOwner', async () => {
        const mockStats = { totalProperties: 5, totalUnits: 12 }
        mockRepository.getStatsByOwner.mockResolvedValue(mockStats)

        const result = await service.getPropertyStats('owner-123')

        expect(mockRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
        expect(result).toEqual(mockStats)
      })

      it('should use error handler for errors', async () => {
        const error = new Error('Stats query failed')
        mockRepository.getStatsByOwner.mockRejectedValue(error)

        await expect(service.getPropertyStats('owner-123'))
          .rejects.toThrow('Stats query failed')

        expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
          error,
          expect.objectContaining({
            operation: 'getStats',
            resource: 'property',
            metadata: { ownerId: 'owner-123' }
          })
        )
      })
    })

    describe('Advanced Features', () => {
      describe('getPropertiesWithStats', () => {
        it('should fetch properties with calculated statistics', async () => {
          const mockProperties = [{
            id: 'prop-123',
            name: 'Test Property',
            ownerId: 'owner-123',
            Unit: [
              { id: 'unit-1', status: 'OCCUPIED', rent: 1000 },
              { id: 'unit-2', status: 'VACANT', rent: 1200 }
            ],
            _count: { Unit: 2, Document: 3 }
          }]

          mockRepository.prismaClient.property.findMany.mockResolvedValue(mockProperties)

          const result = await service.getPropertiesWithStats('owner-123')

          expect(result).toHaveLength(1)
          expect(result[0]).toHaveProperty('stats')
          expect(result[0].stats).toEqual({
            totalUnits: 2,
            occupiedUnits: 1,
            vacantUnits: 1,
            occupancyRate: 50,
            monthlyRent: 1000,
            documentCount: 3
          })
        })

        it('should handle properties with no units', async () => {
          const mockProperties = [{
            id: 'prop-123',
            name: 'Test Property',
            ownerId: 'owner-123',
            Unit: [],
            _count: { Unit: 0, Document: 0 }
          }]

          mockRepository.prismaClient.property.findMany.mockResolvedValue(mockProperties)

          const result = await service.getPropertiesWithStats('owner-123')

          expect(result[0].stats).toEqual({
            totalUnits: 0,
            occupiedUnits: 0,
            vacantUnits: 0,
            occupancyRate: 0,
            monthlyRent: 0,
            documentCount: 0
          })
        })
      })

      describe('createPropertyWithUnits', () => {
        const mockPropertyData = {
          name: 'Complex Property',
          address: '456 Complex St',
          city: 'Complex City',
          state: 'CA',
          zipCode: '54321'
        }

        const mockUnits = [
          { unitNumber: '101', bedrooms: 2, bathrooms: 1, rent: 1500, squareFeet: 800 },
          { unitNumber: '102', bedrooms: 2, bathrooms: 1, rent: 1600, squareFeet: 850 }
        ]

        it('should create property and units in transaction', async () => {
          const mockPropertyResult = testDataFactory.property()
          const mockTransaction = vi.fn().mockImplementation(async (callback) => {
            return await callback({
              property: {
                create: vi.fn().mockResolvedValue(mockPropertyResult),
                findUnique: vi.fn().mockResolvedValue(mockPropertyResult)
              },
              unit: {
                createMany: vi.fn().mockResolvedValue({ count: 2 })
              }
            })
          })

          mockRepository.prismaClient.$transaction = mockTransaction

          const result = await service.createPropertyWithUnits(
            mockPropertyData,
            mockUnits,
            'owner-123'
          )

          expect(mockTransaction).toHaveBeenCalled()
          expect(result).toEqual(mockPropertyResult)
        })

        it('should handle empty units array', async () => {
          const mockPropertyResult = testDataFactory.property()
          const mockTransaction = vi.fn().mockImplementation(async (callback) => {
            return await callback({
              property: {
                create: vi.fn().mockResolvedValue(mockPropertyResult),
                findUnique: vi.fn().mockResolvedValue(mockPropertyResult)
              },
              unit: {
                createMany: vi.fn()
              }
            })
          })

          mockRepository.prismaClient.$transaction = mockTransaction

          await service.createPropertyWithUnits(
            mockPropertyData,
            [],
            'owner-123'
          )

          // Should not call createMany for units when array is empty
          const txCallback = mockTransaction.mock.calls[0][0]
          const mockTx = {
            property: {
              create: vi.fn().mockResolvedValue(mockPropertyResult),
              findUnique: vi.fn().mockResolvedValue(mockPropertyResult)
            },
            unit: {
              createMany: vi.fn()
            }
          }

          await txCallback(mockTx)

          expect(mockTx.unit.createMany).not.toHaveBeenCalled()
        })
      })
    })

    describe('Alias Methods', () => {
      it('should call correct underlying methods for alias methods', async () => {
        const mockProperty = testDataFactory.property()
        
        // Test findAllByOwner alias
        mockRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])
        const findAllResult = await service.findAllByOwner('owner-123')
        expect(findAllResult).toEqual([mockProperty])

        // Test findById alias
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        const findByIdResult = await service.findById('prop-123', 'owner-123')
        expect(findByIdResult).toEqual(mockProperty)

        // Test create alias
        mockRepository.create.mockResolvedValue(mockProperty)
        const createResult = await service.create({
          name: 'Test', address: '123 St', city: 'City', state: 'ST', zipCode: '12345'
        }, 'owner-123')
        expect(createResult).toEqual(mockProperty)

        // Test update alias
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.update.mockResolvedValue(mockProperty)
        const updateResult = await service.update('prop-123', { name: 'Updated' }, 'owner-123')
        expect(updateResult).toEqual(mockProperty)

        // Test delete alias
        mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
        mockRepository.prismaClient.lease.count.mockResolvedValue(0)
        mockRepository.delete.mockResolvedValue(mockProperty)
        const deleteResult = await service.delete('prop-123', 'owner-123')
        expect(deleteResult).toEqual(mockProperty)

        // Test getStats alias
        const mockStats = { totalProperties: 5, totalUnits: 12 }
        mockRepository.getStatsByOwner.mockResolvedValue(mockStats)
        const statsResult = await service.getStats('owner-123')
        expect(statsResult).toEqual(mockStats)
      })
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed UUIDs', async () => {
      const invalidId = 'not-a-uuid'
      
      await expect(service.getPropertyById(invalidId, 'owner-123'))
        .rejects.toThrow()
    })

    it('should handle numeric string conversions for bathrooms/bedrooms', async () => {
      const mockProperty = testDataFactory.property()
      mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      mockRepository.update.mockResolvedValue(mockProperty)

      // Test various numeric string formats
      await service.updateProperty('prop-123', { bathrooms: '2.5', bedrooms: '3' }, 'owner-123')
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-123', ownerId: 'owner-123' },
          data: expect.objectContaining({
            bathrooms: 2.5,
            bedrooms: 3
          })
        })
      )

      // Test invalid numeric strings (should result in NaN)
      await service.updateProperty('prop-123', { bathrooms: 'abc', bedrooms: 'xyz' }, 'owner-123')
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-123', ownerId: 'owner-123' },
          data: expect.objectContaining({
            bathrooms: NaN,
            bedrooms: NaN
          })
        })
      )
    })

    it('should handle concurrent property operations', async () => {
      const ownerId = 'owner-123'
      mockRepository.findByOwnerWithUnits.mockResolvedValue([])

      const concurrentRequests = Array(5).fill(null).map(() => 
        service.getPropertiesByOwner(ownerId)
      )

      const results = await Promise.all(concurrentRequests)
      
      expect(results).toHaveLength(5)
      expect(mockRepository.findByOwnerWithUnits).toHaveBeenCalledTimes(5)
    })
  })

  describe('Performance Validation', () => {
    it('should complete basic CRUD operations efficiently', async () => {
      const mockProperty = testDataFactory.property()
      
      // Setup mocks for fast responses
      mockRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])
      mockRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      mockRepository.create.mockResolvedValue(mockProperty)
      mockRepository.exists.mockResolvedValue(true)
      mockRepository.update.mockResolvedValue(mockProperty)
      mockRepository.deleteById.mockResolvedValue(mockProperty)
      mockRepository.prismaClient.lease.count.mockResolvedValue(0)

      // Test operation timing
      const { duration: findManyDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.getPropertiesByOwner('owner-123')
      )

      const { duration: findByIdDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.getPropertyById('prop-123', 'owner-123')
      )

      const { duration: createDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.createProperty({
          name: 'Test', address: '123 St', city: 'City', state: 'ST', zipCode: '12345'
        }, 'owner-123')
      )

      const { duration: updateDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.updateProperty('prop-123', { name: 'Updated' }, 'owner-123')
      )

      const { duration: deleteDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.deleteProperty('prop-123', 'owner-123')
      )

      // In test environment, validate operations complete quickly
      expect(findManyDuration).toBeLessThan(100)
      expect(findByIdDuration).toBeLessThan(50)
      expect(createDuration).toBeLessThan(100)
      expect(updateDuration).toBeLessThan(100)
      expect(deleteDuration).toBeLessThan(100)
    })
  })
})