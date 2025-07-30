import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PropertyType } from '@prisma/client'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { mockPropertiesRepository, mockErrorHandler } from '../test/setup'

// Mock dependencies are imported from test setup

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
    
    propertiesRepository = mockPropertiesRepository as any
    errorHandler = mockErrorHandler as any
    
    propertiesService = new PropertiesService(
      propertiesRepository,
      errorHandler
    )
  })

  describe('getPropertiesByOwner', () => {
    it('should return properties for owner with default options', async () => {
      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

      const result = await propertiesService.getPropertiesByOwner('owner-123')

      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
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

      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

      await propertiesService.getPropertiesByOwner('owner-123', query)

      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
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

      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue([])

      await propertiesService.getPropertiesByOwner('owner-123', query)

      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        'owner-123',
        expect.objectContaining({
          limit: 5,
          offset: 10
        })
      )
    })

    it('should handle repository errors', async () => {
      const error = new Error('Database connection failed')
      mockPropertiesRepository.findByOwnerWithUnits.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.getPropertiesByOwner('owner-123'))
        .rejects.toThrow('Database connection failed')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'getPropertiesByOwner',
          resource: 'property',
          metadata: { ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('getPropertyStats', () => {
    it('should return property statistics for owner', async () => {
      mockPropertiesRepository.getStatsByOwner.mockResolvedValue(mockPropertyStats)

      const result = await propertiesService.getPropertyStats('owner-123')

      expect(mockPropertiesRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
      expect(result).toEqual(mockPropertyStats)
    })

    it('should handle repository errors', async () => {
      const error = new Error('Stats query failed')
      mockPropertiesRepository.getStatsByOwner.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.getPropertyStats('owner-123'))
        .rejects.toThrow('Stats query failed')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'getPropertyStats',
          resource: 'property',
          metadata: { ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('getPropertyById', () => {
    it('should return property when found', async () => {
      mockPropertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)

      const result = await propertiesService.getPropertyById('prop-123', 'owner-123')

      expect(mockPropertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
        'prop-123',
        'owner-123',
        true // includeUnits
      )
      expect(result).toEqual(mockProperty)
    })

    it('should throw not found error when property does not exist', async () => {
      mockPropertiesRepository.findByIdAndOwner.mockResolvedValue(null)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Property not found'))

      await expect(propertiesService.getPropertyById('prop-123', 'owner-123'))
        .rejects.toThrow('Property not found')

      expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Property', 'prop-123')
    })

    it('should handle repository errors', async () => {
      const error = new Error('Query failed')
      mockPropertiesRepository.findByIdAndOwner.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.getPropertyById('prop-123', 'owner-123'))
        .rejects.toThrow('Query failed')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'getPropertyById',
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
      propertyType: PropertyType.CONDO,
      stripeCustomerId: 'cus_123'
    }

    it('should create property without units', async () => {
      const expectedData = {
        ...mockPropertyData,
        ownerId: 'owner-123',
        propertyType: PropertyType.CONDO,
        User: {
          connect: { id: 'owner-123' }
        }
      }

      mockPropertiesRepository.create.mockResolvedValue(mockProperty)

      const result = await propertiesService.createProperty(mockPropertyData, 'owner-123')

      expect(mockPropertiesRepository.create).toHaveBeenCalledWith({
        data: expectedData
      })
      expect(result).toEqual(mockProperty)
    })

    it('should create property with units when specified', async () => {
      const propertyDataWithUnits = {
        ...mockPropertyData,
        units: 3
      }

      const expectedData = {
        ...propertyDataWithUnits,
        ownerId: 'owner-123',
        propertyType: PropertyType.CONDO,
        User: {
          connect: { id: 'owner-123' }
        }
      }

      mockPropertiesRepository.createWithUnits.mockResolvedValue(mockProperty)

      const result = await propertiesService.createProperty(propertyDataWithUnits, 'owner-123')

      expect(mockPropertiesRepository.createWithUnits).toHaveBeenCalledWith(
        expectedData,
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

      mockPropertiesRepository.create.mockResolvedValue(mockProperty)

      await propertiesService.createProperty(propertyDataWithoutType, 'owner-123')

      expect(mockPropertiesRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          propertyType: PropertyType.SINGLE_FAMILY
        })
      })
    })

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed')
      mockPropertiesRepository.create.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.createProperty(mockPropertyData, 'owner-123'))
        .rejects.toThrow('Creation failed')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'createProperty',
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
      mockPropertiesRepository.exists.mockResolvedValue(true)
      mockPropertiesRepository.update.mockResolvedValue(mockProperty)

      const result = await propertiesService.updateProperty('prop-123', mockUpdateData, 'owner-123')

      expect(mockPropertiesRepository.exists).toHaveBeenCalledWith({
        id: 'prop-123',
        ownerId: 'owner-123'
      })

      expect(mockPropertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123' },
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

      mockPropertiesRepository.exists.mockResolvedValue(true)
      mockPropertiesRepository.update.mockResolvedValue(mockProperty)

      await propertiesService.updateProperty('prop-123', updateDataWithEmptyStrings, 'owner-123')

      expect(mockPropertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123' },
        data: expect.objectContaining({
          bathrooms: undefined,
          bedrooms: undefined
        })
      })
    })

    it('should throw not found error when property does not exist', async () => {
      mockPropertiesRepository.exists.mockResolvedValue(false)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Property not found'))

      await expect(propertiesService.updateProperty('prop-123', mockUpdateData, 'owner-123'))
        .rejects.toThrow('Property not found')

      expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Property', 'prop-123')
    })

    it('should handle update errors', async () => {
      mockPropertiesRepository.exists.mockResolvedValue(true)
      const error = new Error('Update failed')
      mockPropertiesRepository.update.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.updateProperty('prop-123', mockUpdateData, 'owner-123'))
        .rejects.toThrow('Update failed')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'updateProperty',
          resource: 'property',
          metadata: { id: 'prop-123', ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('deleteProperty', () => {
    it('should delete property when it exists', async () => {
      mockPropertiesRepository.exists.mockResolvedValue(true)
      mockPropertiesRepository.deleteById.mockResolvedValue(mockProperty)

      const result = await propertiesService.deleteProperty('prop-123', 'owner-123')

      expect(mockPropertiesRepository.exists).toHaveBeenCalledWith({
        id: 'prop-123',
        ownerId: 'owner-123'
      })
      expect(mockPropertiesRepository.deleteById).toHaveBeenCalledWith('prop-123')
      expect(result).toEqual(mockProperty)
    })

    it('should throw not found error when property does not exist', async () => {
      mockPropertiesRepository.exists.mockResolvedValue(false)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Property not found'))

      await expect(propertiesService.deleteProperty('prop-123', 'owner-123'))
        .rejects.toThrow('Property not found')

      expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Property', 'prop-123')
    })

    it('should handle deletion errors', async () => {
      mockPropertiesRepository.exists.mockResolvedValue(true)
      const error = new Error('Deletion failed')
      mockPropertiesRepository.deleteById.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation((err) => { throw err })

      await expect(propertiesService.deleteProperty('prop-123', 'owner-123'))
        .rejects.toThrow('Deletion failed')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        error,
        {
          operation: 'deleteProperty',
          resource: 'property',
          metadata: { id: 'prop-123', ownerId: 'owner-123' }
        }
      )
    })
  })

  describe('Alias methods', () => {
    it('should call getPropertiesByOwner via findAllByOwner', async () => {
      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue([mockProperty])

      const query = { propertyType: PropertyType.APARTMENT }
      const result = await propertiesService.findAllByOwner('owner-123', query)

      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        'owner-123',
        expect.objectContaining({
          propertyType: PropertyType.APARTMENT
        })
      )
      expect(result).toEqual([mockProperty])
    })

    it('should call getPropertyById via findById', async () => {
      mockPropertiesRepository.findByIdAndOwner.mockResolvedValue(mockProperty)

      const result = await propertiesService.findById('prop-123', 'owner-123')

      expect(mockPropertiesRepository.findByIdAndOwner).toHaveBeenCalledWith(
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

      mockPropertiesRepository.create.mockResolvedValue(mockProperty)

      const result = await propertiesService.create('owner-123', propertyData)

      expect(mockPropertiesRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...propertyData,
          ownerId: 'owner-123'
        })
      })
      expect(result).toEqual(mockProperty)
    })

    it('should call updateProperty via update', async () => {
      const updateData = { name: 'Updated Name' }

      mockPropertiesRepository.exists.mockResolvedValue(true)
      mockPropertiesRepository.update.mockResolvedValue(mockProperty)

      const result = await propertiesService.update('prop-123', 'owner-123', updateData)

      expect(mockPropertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123' },
        data: expect.objectContaining({
          name: 'Updated Name',
          updatedAt: expect.any(Date)
        })
      })
      expect(result).toEqual(mockProperty)
    })

    it('should call deleteProperty via delete', async () => {
      mockPropertiesRepository.exists.mockResolvedValue(true)
      mockPropertiesRepository.deleteById.mockResolvedValue(mockProperty)

      const result = await propertiesService.delete('prop-123', 'owner-123')

      expect(mockPropertiesRepository.deleteById).toHaveBeenCalledWith('prop-123')
      expect(result).toEqual(mockProperty)
    })

    it('should call getPropertyStats via getStats', async () => {
      mockPropertiesRepository.getStatsByOwner.mockResolvedValue(mockPropertyStats)

      const result = await propertiesService.getStats('owner-123')

      expect(mockPropertiesRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
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

      mockPropertiesRepository.create.mockResolvedValue(mockProperty)

      await propertiesService.createProperty(sparseData, 'owner-123')

      expect(mockPropertiesRepository.create).toHaveBeenCalledWith({
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

      mockPropertiesRepository.exists.mockResolvedValue(true)
      mockPropertiesRepository.update.mockResolvedValue(mockProperty)

      await propertiesService.updateProperty('prop-123', updateData, 'owner-123')

      expect(mockPropertiesRepository.update).toHaveBeenCalledWith({
        where: { id: 'prop-123' },
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

      mockPropertiesRepository.create.mockResolvedValue(mockProperty)

      await propertiesService.createProperty(propertyDataWithZeroUnits, 'owner-123')

      expect(mockPropertiesRepository.create).toHaveBeenCalled()
      expect(mockPropertiesRepository.createWithUnits).not.toHaveBeenCalled()
    })

    it('should handle malformed owner IDs', async () => {
      const invalidOwnerId = 'invalid-uuid'
      const error = new Error('Invalid UUID')
      
      mockPropertiesRepository.findByOwnerWithUnits.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw error
      })

      await expect(propertiesService.getPropertiesByOwner(invalidOwnerId)).rejects.toThrow('Invalid UUID')
    })

    it('should handle concurrent access scenarios', async () => {
      const ownerId = 'owner-123'
      const promises = Array(5).fill(null).map(() => propertiesService.getPropertiesByOwner(ownerId))
      
      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue([])

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledTimes(5)
    })
  })
})