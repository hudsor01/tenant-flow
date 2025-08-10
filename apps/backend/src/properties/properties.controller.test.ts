/**
 * Properties Controller Tests
 * Comprehensive API testing for property management endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { INestApplication } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { 
  TestModuleBuilder, 
  createTestApp, 
  createApiClient, 
  ApiTestClient,
  expectSuccess,
  expectError,
  expectUnauthorized,
  expectNotFound,
  expectValidationError,
  generatePropertyData
} from '@/test/api-test-helpers'
import { createOwnerUser, createTenantUser, TestUser } from '@/test/test-users'
import { mockPrismaService, mockPropertiesRepository } from '@/test/setup'

describe('Properties Controller (Unit Tests)', () => {
  let controller: PropertiesController
  let propertiesService: PropertiesService
  let ownerUser: TestUser
  let tenantUser: TestUser

  beforeEach(() => {
    // Create test users
    ownerUser = createOwnerUser()
    tenantUser = createTenantUser()

    // Mock service with BaseCrudService interface (adapted via adaptBaseCrudService)
    propertiesService = {
      getByOwner: vi.fn(),
      getByIdOrThrow: vi.fn(), 
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getStats: vi.fn(),
      findNearbyProperties: vi.fn()
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

    vi.mocked(propertiesService.getByOwner).mockResolvedValue([mockProperty])
    vi.mocked(propertiesService.getByIdOrThrow).mockResolvedValue(mockProperty)
    vi.mocked(propertiesService.create).mockResolvedValue(mockProperty)
    vi.mocked(propertiesService.update).mockResolvedValue(mockProperty)
    vi.mocked(propertiesService.delete).mockResolvedValue(undefined)
    vi.mocked(propertiesService.getStats).mockResolvedValue({
      totalProperties: 1,
      occupiedProperties: 0,
      availableProperties: 1,
      totalRentAmount: 2000,
      averageRentAmount: 2000
    })
  })

  describe('findAll', () => {
    it('should return properties for authenticated owner', async () => {
      const result = await controller.findAll(ownerUser, { limit: 10, offset: 0 })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: 'prop-123',
        name: 'Test Property',
        ownerId: ownerUser.id
      })
      expect(propertiesService.getByOwner).toHaveBeenCalledWith(ownerUser.id, { limit: 10, offset: 0 })
    })

    it('should handle query parameters for filtering', async () => {
      const result = await controller.findAll(ownerUser, {
        status: 'available',
        city: 'Test City',
        limit: 10,
        offset: 0
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(propertiesService.getByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'available',
        city: 'Test City',
        limit: 10,
        offset: 0
      })
    })
  })

  describe('findOne', () => {
    it('should return property by ID for owner', async () => {
      const result = await controller.findOne('prop-123', ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'prop-123',
        name: 'Test Property'
      })
      expect(propertiesService.getByIdOrThrow).toHaveBeenCalledWith('prop-123', ownerUser.id)
    })

    it('should throw error for non-existent property', async () => {
      vi.mocked(propertiesService.getByIdOrThrow).mockRejectedValue(new Error('Property not found'))

      await expect(controller.findOne('non-existent', ownerUser))
        .rejects.toThrow('Property not found')
    })
  })

  describe('create', () => {
    it('should create property with valid data', async () => {
      const propertyData = generatePropertyData()
      
      const result = await controller.create(propertyData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'prop-123',
        name: propertyData.name,
        address: propertyData.address
      })
      expect(propertiesService.create).toHaveBeenCalledWith(propertyData, ownerUser.id)
    })
  })

  describe('update', () => {
    it('should update property with valid data', async () => {
      const updateData = { name: 'Updated Property Name', rentAmount: 2200 }
      
      const result = await controller.update('prop-123', updateData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'prop-123',
        name: 'Test Property'  // Mock returns original data
      })
      expect(propertiesService.update).toHaveBeenCalledWith('prop-123', updateData, ownerUser.id)
    })
  })

  describe('remove', () => {
    it('should delete property successfully', async () => {
      await controller.remove('prop-123', ownerUser)
      
      expect(propertiesService.delete).toHaveBeenCalledWith('prop-123', ownerUser.id)
    })
  })

  describe('getStats', () => {
    it('should return property statistics for owner', async () => {
      const result = await controller.getStats(ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
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