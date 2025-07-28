import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { PropertyType } from '@prisma/client'
import type { Property, CreatePropertyDto, UpdatePropertyDto } from '@tenantflow/shared/types/properties'

// Mock the repository and error handler
const mockPropertiesRepository = {
  findByOwnerWithUnits: vi.fn(),
  getStatsByOwner: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  findAllByOwner: vi.fn()
} as jest.Mocked<PropertiesRepository>

const mockErrorHandler = {
  handleErrorEnhanced: vi.fn()
} as jest.Mocked<ErrorHandlerService>

describe('PropertiesService', () => {
  let service: PropertiesService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PropertiesService(mockPropertiesRepository, mockErrorHandler)
  })

  describe('getPropertiesByOwner', () => {
    const ownerId = 'owner-123'
    const mockProperties: Property[] = [
      {
        id: 'prop-1',
        name: 'Test Property 1',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        propertyType: PropertyType.SINGLE_FAMILY,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
        units: []
      }
    ]

    it('should return properties for a given owner', async () => {
      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue(mockProperties)

      const result = await service.getPropertiesByOwner(ownerId)

      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        ownerId,
        {
          propertyType: undefined,
          search: undefined,
          limit: undefined,
          offset: undefined
        }
      )
      expect(result).toEqual(mockProperties)
    })

    it('should pass query parameters to repository', async () => {
      const query = {
        propertyType: PropertyType.APARTMENT,
        search: 'test',
        limit: '10',
        offset: '20'
      }

      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue(mockProperties)

      await service.getPropertiesByOwner(ownerId, query)

      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledWith(
        ownerId,
        query
      )
    })

    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database error')
      const enhancedError = new Error('Enhanced error')
      
      mockPropertiesRepository.findByOwnerWithUnits.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw enhancedError
      })

      await expect(service.getPropertiesByOwner(ownerId)).rejects.toThrow('Enhanced error')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(error, {
        operation: 'getPropertiesByOwner',
        resource: 'property',
        metadata: { ownerId }
      })
    })
  })

  describe('getPropertyStats', () => {
    const ownerId = 'owner-123'
    const mockStats = {
      totalProperties: 5,
      totalUnits: 12,
      occupiedUnits: 10,
      vacantUnits: 2
    }

    it('should return property statistics', async () => {
      mockPropertiesRepository.getStatsByOwner.mockResolvedValue(mockStats)

      const result = await service.getPropertyStats(ownerId)

      expect(mockPropertiesRepository.getStatsByOwner).toHaveBeenCalledWith(ownerId)
      expect(result).toEqual(mockStats)
    })

    it('should handle stats retrieval errors', async () => {
      const error = new Error('Stats error')
      const enhancedError = new Error('Enhanced stats error')
      
      mockPropertiesRepository.getStatsByOwner.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw enhancedError
      })

      await expect(service.getPropertyStats(ownerId)).rejects.toThrow('Enhanced stats error')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(error, {
        operation: 'getPropertyStats',
        resource: 'property',
        metadata: { ownerId }
      })
    })
  })

  describe('Edge cases and error scenarios', () => {
    it('should handle malformed owner IDs', async () => {
      const invalidOwnerId = 'invalid-uuid'
      const error = new Error('Invalid UUID')
      
      mockPropertiesRepository.findByOwnerWithUnits.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw error
      })

      await expect(service.getPropertiesByOwner(invalidOwnerId)).rejects.toThrow('Invalid UUID')
    })

    it('should handle concurrent access scenarios', async () => {
      const ownerId = 'owner-123'
      const promises = Array(5).fill(null).map(() => service.getPropertiesByOwner(ownerId))
      
      mockPropertiesRepository.findByOwnerWithUnits.mockResolvedValue([])

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      expect(mockPropertiesRepository.findByOwnerWithUnits).toHaveBeenCalledTimes(5)
    })
  })
})