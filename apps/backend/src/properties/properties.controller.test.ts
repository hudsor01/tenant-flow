/**
 * Properties Controller Tests
 * Comprehensive API testing for property management endpoints
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { createOwnerUser, TestUser } from '../test/test-users'
import { CreatePropertyDto } from './dto/create-property.dto'
import { faker } from '@faker-js/faker'
import { PROPERTY_TYPE } from '@repo/shared'

// Helper function to generate property data
function generatePropertyData(): CreatePropertyDto {
  return {
    name: faker.company.name() + ' Property',
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }).toUpperCase(),
    zipCode: faker.location.zipCode('#####'),
    description: faker.lorem.paragraph(),
    imageUrl: faker.image.url(),
    propertyType: faker.helpers.arrayElement(Object.values(PROPERTY_TYPE))
  } as CreatePropertyDto
}

describe('Properties Controller (Unit Tests)', () => {
  let controller: PropertiesController
  let propertiesService: PropertiesService
  let ownerUser: TestUser

  beforeEach(() => {
    // Create test users
    ownerUser = createOwnerUser()

    // Mock service with BaseCrudService interface
    propertiesService = {
      getByOwner: jest.fn(),
      getById: jest.fn(), 
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
      findNearbyProperties: jest.fn()
    } as any

    // Create controller instance
    controller = new PropertiesController(propertiesService)

    // Setup common mock responses
    const mockProperty = {
      id: 'prop-123',
      name: 'Test Property',
      address: '123 Test St',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      propertyType: 'single_family',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      rentAmount: 2000,
      status: 'available',
      ownerId: ownerUser.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    ;(propertiesService.getByOwner as any).mockResolvedValue([mockProperty])
    ;(propertiesService.getById as any).mockResolvedValue(mockProperty)
    ;(propertiesService.create as any).mockImplementation((data: any) => 
      Promise.resolve({ ...mockProperty, ...data })
    )
    ;(propertiesService.update as any).mockResolvedValue(mockProperty)
    ;(propertiesService.delete as any).mockResolvedValue(mockProperty)
    ;(propertiesService.getStats as any).mockResolvedValue({
      totalProperties: 1,
      occupiedProperties: 0,
      availableProperties: 1,
      totalRentAmount: 2000,
      averageRentAmount: 2000
    })
  })

  describe('findAll', () => {
    it('should return properties for authenticated owner', async () => {
      const query = { limit: 10, offset: 0, sortOrder: 'desc' as const }
      const result = await controller.findAll(query, ownerUser)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'prop-123',
        name: 'Test Property',
        ownerId: ownerUser.id
      })
      expect(propertiesService.getByOwner).toHaveBeenCalledWith(ownerUser.id, query)
    })

    it('should handle query parameters for filtering', async () => {
      const query = {
        city: 'Test City',
        limit: 10,
        offset: 0,
        sortOrder: 'desc' as const
      }
      const result = await controller.findAll(query, ownerUser)
      
      expect(result).toHaveLength(1)
      expect(propertiesService.getByOwner).toHaveBeenCalledWith(ownerUser.id, query)
    })
  })

  describe('findOne', () => {
    it('should return property by ID for owner', async () => {
      const result = await controller.findOne('prop-123', ownerUser)
      
      expect(result).toMatchObject({
        id: 'prop-123',
        name: 'Test Property'
      })
      expect(propertiesService.getById).toHaveBeenCalledWith('prop-123', ownerUser.id)
    })

    it('should throw error for non-existent property', async () => {
      ;(propertiesService.getById as any).mockRejectedValue(new Error('Property not found'))

      await expect(controller.findOne('non-existent', ownerUser))
        .rejects.toThrow('Property not found')
    })
  })

  describe('create', () => {
    it('should create property with valid data', async () => {
      const propertyData = generatePropertyData()
      
      const result = await controller.create(propertyData, ownerUser)
      
      expect(result).toMatchObject({
        id: 'prop-123',
        name: propertyData.name,
        address: propertyData.address
      })
      expect(propertiesService.create).toHaveBeenCalledWith(propertyData, ownerUser.id)
    })
  })

  describe('update', () => {
    it('should update property with valid data', async () => {
      const updateData = { name: 'Updated Property Name' }
      
      const result = await controller.update('prop-123', updateData, ownerUser)
      
      expect(result).toMatchObject({
        id: 'prop-123',
        name: 'Test Property'  // Mock returns original data
      })
      expect(propertiesService.update).toHaveBeenCalledWith('prop-123', updateData, ownerUser.id)
    })
  })

  describe('remove', () => {
    it('should delete property successfully', async () => {
      const result = await controller.remove('prop-123', ownerUser)
      
      expect(result).toMatchObject({
        id: 'prop-123',
        name: 'Test Property'
      })
      expect(propertiesService.delete).toHaveBeenCalledWith('prop-123', ownerUser.id)
    })
  })

  describe('getStats', () => {
    it('should return property statistics for owner', async () => {
      const result = await controller.getStats(ownerUser)
      
      expect(result).toMatchObject({
        totalProperties: 1,
        occupiedProperties: 0,
        availableProperties: 1,
        totalRentAmount: 2000,
        averageRentAmount: 2000
      })
      expect(propertiesService.getStats).toHaveBeenCalledWith(ownerUser.id)
    })
  })
})