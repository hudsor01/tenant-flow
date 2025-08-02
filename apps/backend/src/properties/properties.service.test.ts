import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PropertyType } from '@prisma/client'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { NotFoundException } from '../common/exceptions/base.exception'

// Mock the repository
vi.mock('./properties.repository')

describe('PropertiesService', () => {
  let propertiesService: PropertiesService
  let propertiesRepository: PropertiesRepository
  let errorHandler: ErrorHandlerService

  const mockProperty = {
    id: 'prop-123',
    name: 'Test Property',
    address: '123 Test St',
    city: 'Test City',
    state: 'TX',
    zipCode: '12345',
    description: 'A test property',
    propertyType: PropertyType.SINGLE_FAMILY,
    imageUrl: 'https://example.com/image.jpg',
    bedrooms: 3,
    bathrooms: 2,
    ownerId: 'owner-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    Unit: [
      {
        id: 'unit-1',
        unitNumber: '1',
        status: 'OCCUPIED',
        rent: 1500
      }
    ],
    _count: {
      Unit: 1
    }
  }

  const mockPropertyStats = {
    totalProperties: 5,
    totalUnits: 12
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create mock instances
    propertiesRepository = {
      findByOwnerWithUnits: vi.fn(),
      findById: vi.fn(),
      findByIdAndOwner: vi.fn(),
      create: vi.fn(),
      createWithUnits: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteById: vi.fn(),
      countByOwner: vi.fn(),
      getStatsByOwner: vi.fn(),
      exists: vi.fn(),
      prismaClient: {
        lease: {
          count: vi.fn()
        },
        property: {
          findMany: vi.fn(),
          create: vi.fn(),
          findUnique: vi.fn()
        },
        unit: {
          createMany: vi.fn()
        },
        $transaction: vi.fn()
      }
    } as any
    
    errorHandler = {
      handleAsync: vi.fn((fn) => fn()),
      handleError: vi.fn(),
      createError: vi.fn(),
      handleErrorEnhanced: vi.fn((err) => { throw err }),
      createNotFoundError: vi.fn((resource, id) => new NotFoundException(resource, id))
    } as any
    
    propertiesService = new PropertiesService(
      propertiesRepository,
      errorHandler
    )
  })

  describe('getPropertiesByOwner', () => {
    it('should return properties for owner with default options', async () => {
      propertiesRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

      const result = await propertiesService.getPropertiesByOwner('owner-123')

      expect(propertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        'owner-123',
        {
          propertyType: undefined,
          search: undefined,
          limit: undefined,
          offset: undefined
        }
      )
      expect(result).toEqual([mockProperty])
    })

    it('should handle query parameters correctly', async () => {
      const query = {
        propertyType: PropertyType.APARTMENT,
        search: 'downtown',
        limit: '10',
        offset: '0'
      }

      propertiesRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

      await propertiesService.getPropertiesByOwner('owner-123', query)

      expect(propertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        'owner-123',
        {
          propertyType: PropertyType.APARTMENT,
          search: 'downtown',
          limit: 10,
          offset: 0
        }
      )
    })

    it('should handle string limit and offset conversion', async () => {
      const query = {
        limit: '5',
        offset: '10'
      }

      propertiesRepository.findByOwnerWithUnits.mockResolvedValue([])

      await propertiesService.getPropertiesByOwner('owner-123', query)

      expect(propertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        'owner-123',
        expect.objectContaining({
          limit: 5,
          offset: 10
        })
      )
    })

    it('should handle repository errors', async () => {
      const error = new Error('Database connection failed')
      propertiesRepository.findByOwnerWithUnits.mockRejectedValue(error)

      await expect(propertiesService.getPropertiesByOwner('owner-123'))
        .rejects.toThrow('Database connection failed')

      // getPropertiesByOwner now uses error handler via BaseCrudService
      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'getByOwner',
          resource: 'property',
          metadata: { ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('getPropertyStats', () => {
    it('should return property statistics for owner', async () => {
      propertiesRepository.getStatsByOwner.mockResolvedValue(mockPropertyStats)

      const result = await propertiesService.getPropertyStats('owner-123')

      expect(propertiesRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
      expect(result).toEqual(mockPropertyStats)
    })

    it('should handle repository errors', async () => {
      const error = new Error('Stats query failed')
      propertiesRepository.getStatsByOwner.mockRejectedValue(error)
      errorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.getPropertyStats('owner-123'))
        .rejects.toThrow('Stats query failed')

      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'getStats',
          resource: 'property',
          metadata: { ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('getPropertyById', () => {
    it('should return property when found', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)

      const result = await propertiesService.getPropertyById('prop-123', 'owner-123')

      expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
        'prop-123',
        'owner-123',
        true // includeUnits
      )
      expect(result).toEqual(mockProperty)
    })

    it('should throw not found error when property does not exist', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(null)
      await expect(propertiesService.getPropertyById('prop-123', 'owner-123'))
        .rejects.toThrow(NotFoundException)

      // Service uses NotFoundException directly, not through errorHandler
      expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith('prop-123', 'owner-123', true)
    })

    it('should handle repository errors', async () => {
      const error = new Error('Query failed')
      propertiesRepository.findByIdAndOwner.mockRejectedValue(error)
      await expect(propertiesService.getPropertyById('prop-123', 'owner-123'))
        .rejects.toThrow('Query failed')

      // getPropertyById now uses error handler via BaseCrudService
      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'getByIdOrThrow',
          resource: 'property',
          metadata: { id: 'prop-123', ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('createProperty', () => {
    const mockPropertyData = {
      name: 'New Property',
      address: '456 New St',
      city: 'New City',
      state: 'CA',
      zipCode: '54321',
      description: 'A new property',
      propertyType: PropertyType.APARTMENT,
      stripeCustomerId: 'cus_123'
    }

    it('should create property without units', async () => {
      propertiesRepository.create.mockResolvedValue(mockProperty)

      const result = await propertiesService.createProperty(mockPropertyData, 'owner-123')

      expect(propertiesRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockPropertyData,
          ownerId: 'owner-123',
          propertyType: PropertyType.APARTMENT,
          User: {
            connect: { id: 'owner-123' }
          }
        })
      })
      expect(result).toEqual(mockProperty)
    })

    it('should create property with units when specified', async () => {
      const propertyDataWithUnits = {
        ...mockPropertyData,
        units: 3
      }

      propertiesRepository.createWithUnits.mockResolvedValue(mockProperty)

      const result = await propertiesService.createProperty(propertyDataWithUnits, 'owner-123')

      expect(propertiesRepository.createWithUnits).toHaveBeenCalledWith(
        expect.objectContaining({
          ...propertyDataWithUnits,
          ownerId: 'owner-123',
          propertyType: PropertyType.APARTMENT,
          User: {
            connect: { id: 'owner-123' }
          }
        }),
        3
      )
      expect(result).toEqual(mockProperty)
    })

    it('should default to SINGLE_FAMILY property type', async () => {
      const propertyDataWithoutType = {
        name: 'New Property',
        address: '456 New St',
        city: 'New City',
        state: 'CA',
        zipCode: '54321'
      }

      propertiesRepository.create.mockResolvedValue(mockProperty)

      await propertiesService.createProperty(propertyDataWithoutType, 'owner-123')

      expect(propertiesRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          propertyType: PropertyType.SINGLE_FAMILY
        })
      })
    })

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed')
      propertiesRepository.create.mockRejectedValue(error)
      errorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.createProperty(mockPropertyData, 'owner-123'))
        .rejects.toThrow('Creation failed')

      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'create',
          resource: 'property',
          metadata: { ownerId: 'owner-123', propertyName: 'New Property' }
        }
      )
    })
  })

  describe('updateProperty', () => {
    const mockUpdateData = {
      name: 'Updated Property',
      description: 'Updated description',
      bathrooms: '2',
      bedrooms: '3',
      imageUrl: 'https://example.com/new-image.jpg'
    }

    it('should update property when it exists', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      propertiesRepository.update.mockResolvedValue(mockProperty)

      const result = await propertiesService.updateProperty('prop-123', mockUpdateData, 'owner-123')

      expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
        'prop-123',
        'owner-123',
        true
      )

      expect(propertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123', ownerId: 'owner-123' },
        data: expect.objectContaining({
          name: 'Updated Property',
          description: 'Updated description',
          bathrooms: 2,
          bedrooms: 3,
          imageUrl: 'https://example.com/new-image.jpg',
          updatedAt: expect.any(Date)
        })
      })

      expect(result).toEqual(mockProperty)
    })

    it('should handle empty string values for bathrooms and bedrooms', async () => {
      const updateDataWithEmptyStrings = {
        name: 'Updated Property',
        bathrooms: '',
        bedrooms: ''
      }

      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      propertiesRepository.update.mockResolvedValue(mockProperty)

      await propertiesService.updateProperty('prop-123', updateDataWithEmptyStrings, 'owner-123')

      expect(propertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123', ownerId: 'owner-123' },
        data: expect.objectContaining({
          bathrooms: undefined,
          bedrooms: undefined
        })
      })
    })

    it('should throw not found error when property does not exist', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(null)
      await expect(propertiesService.updateProperty('prop-123', mockUpdateData, 'owner-123'))
        .rejects.toThrow(NotFoundException)

      expect(propertiesRepository.update).not.toHaveBeenCalled()
    })

    it('should handle update errors', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      const error = new Error('Update failed')
      propertiesRepository.update.mockRejectedValue(error)
      errorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.updateProperty('prop-123', mockUpdateData, 'owner-123'))
        .rejects.toThrow('Update failed')

      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'update',
          resource: 'property',
          metadata: { id: 'prop-123', ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('deleteProperty', () => {
    it('should delete property when it exists', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      propertiesRepository.prismaClient.lease.count.mockResolvedValue(0) // No active leases
      propertiesRepository.prismaClient.lease.count.mockResolvedValue(0)
      propertiesRepository.delete.mockResolvedValue(mockProperty)

      const result = await propertiesService.deleteProperty('prop-123', 'owner-123')

      expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
        'prop-123',
        'owner-123',
        true
      )
      expect(propertiesRepository.prismaClient.lease.count).toHaveBeenCalledWith({
        where: {
          Unit: {
            propertyId: 'prop-123'
          },
          status: 'ACTIVE'
        }
      })
      expect(propertiesRepository.prismaClient.lease.count).toHaveBeenCalledWith({
        where: {
          Unit: {
            propertyId: 'prop-123'
          },
          status: 'ACTIVE'
        }
      })
      expect(propertiesRepository.delete).toHaveBeenCalledWith({ where: { id: 'prop-123', ownerId: 'owner-123' } })
      expect(result).toEqual(mockProperty)
    })

    it('should throw not found error when property does not exist', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(null)
      await expect(propertiesService.deleteProperty('prop-123', 'owner-123'))
        .rejects.toThrow(NotFoundException)

      expect(propertiesRepository.prismaClient.lease.count).not.toHaveBeenCalled()
      expect(propertiesRepository.deleteById).not.toHaveBeenCalled()
    })

    it('should handle deletion errors', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      const error = new Error('Deletion failed')
      propertiesRepository.deleteById.mockRejectedValue(error)
      propertiesRepository.prismaClient.lease.count.mockResolvedValue(0)
      errorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.deleteProperty('prop-123', 'owner-123'))
        .rejects.toThrow('Deletion failed')

      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'delete',
          resource: 'property',
          metadata: { id: 'prop-123', ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('Alias methods', () => {
    it('should call getPropertiesByOwner via findAllByOwner', async () => {
      propertiesRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

      const query = { propertyType: PropertyType.APARTMENT }
      const result = await propertiesService.findAllByOwner('owner-123', query)

      expect(propertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        'owner-123',
        expect.objectContaining({
          propertyType: PropertyType.APARTMENT
        })
      )
      expect(result).toEqual([mockProperty])
    })

    it('should call getPropertyById via findById', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)

      const result = await propertiesService.findById('prop-123', 'owner-123')

      expect(propertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
        'prop-123',
        'owner-123',
        true
      )
      expect(result).toEqual(mockProperty)
    })

    it('should call createProperty via create', async () => {
      const propertyData = {
        name: 'Test Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345'
      }

      propertiesRepository.create.mockResolvedValue(mockProperty)

      const result = await propertiesService.create(propertyData, 'owner-123')

      expect(propertiesRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...propertyData,
          ownerId: 'owner-123'
        })
      })
      expect(result).toEqual(mockProperty)
    })

    it('should call updateProperty via update', async () => {
      const updateData = { name: 'Updated Name' }

      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      propertiesRepository.update.mockResolvedValue(mockProperty)

      const result = await propertiesService.update('prop-123', updateData, 'owner-123')

      expect(propertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123', ownerId: 'owner-123' },
        data: expect.objectContaining({
          name: 'Updated Name',
          updatedAt: expect.any(Date)
        })
      })
      expect(result).toEqual(mockProperty)
    })

    it('should call deleteProperty via delete', async () => {
      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      propertiesRepository.prismaClient.lease.count.mockResolvedValue(0)
      propertiesRepository.prismaClient.lease.count.mockResolvedValue(0)
      propertiesRepository.delete.mockResolvedValue(mockProperty)

      const result = await propertiesService.delete('prop-123', 'owner-123')

      expect(propertiesRepository.delete).toHaveBeenCalledWith({ where: { id: 'prop-123', ownerId: 'owner-123' } })
      expect(result).toEqual(mockProperty)
    })

    it('should call getPropertyStats via getStats', async () => {
      propertiesRepository.getStatsByOwner.mockResolvedValue(mockPropertyStats)

      const result = await propertiesService.getStats('owner-123')

      expect(propertiesRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
      expect(result).toEqual(mockPropertyStats)
    })
  })

  describe('Edge cases and validation', () => {
    it('should handle null and undefined property data fields', async () => {
      const sparseData = {
        name: 'Minimal Property',
        address: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345',
        description: undefined,
        propertyType: undefined
      }

      propertiesRepository.create.mockResolvedValue(mockProperty)

      await propertiesService.createProperty(sparseData, 'owner-123')

      expect(propertiesRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: undefined,
          propertyType: PropertyType.SINGLE_FAMILY // default value
        })
      })
    })

    it('should handle numeric string bathrooms and bedrooms correctly', async () => {
      const updateData = {
        bathrooms: '2.5',
        bedrooms: '4'
      }

      propertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)
      propertiesRepository.update.mockResolvedValue(mockProperty)

      await propertiesService.updateProperty('prop-123', updateData, 'owner-123')

      expect(propertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123', ownerId: 'owner-123' },
        data: expect.objectContaining({
          bathrooms: 2.5,
          bedrooms: 4
        })
      })
    })

    it('should handle zero units creation', async () => {
      const propertyDataWithZeroUnits = {
        name: 'Property Without Units',
        address: '123 Test St',
        city: 'Test City',
        state: 'TX',
        zipCode: '12345',
        units: 0
      }

      propertiesRepository.create.mockResolvedValue(mockProperty)

      await propertiesService.createProperty(propertyDataWithZeroUnits, 'owner-123')

      expect(propertiesRepository.create).toHaveBeenCalled()
      expect(propertiesRepository.createWithUnits).not.toHaveBeenCalled()
    })

    it('should handle malformed owner IDs', async () => {
      const invalidOwnerId = 'invalid-uuid'
      const error = new Error('Invalid UUID')
      
      propertiesRepository.findByOwnerWithUnits.mockRejectedValue(error)
      errorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw error
      })

      await expect(propertiesService.getPropertiesByOwner(invalidOwnerId)).rejects.toThrow('Invalid UUID')
    })

    it('should handle concurrent access scenarios', async () => {
      const ownerId = 'owner-123'
      const promises = Array(5).fill(null).map(() => propertiesService.getPropertiesByOwner(ownerId))
      
      propertiesRepository.findByOwnerWithUnits.mockResolvedValue([])

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      expect(propertiesRepository.findByOwnerWithUnits).toHaveBeenCalledTimes(5)
    })
  })
})