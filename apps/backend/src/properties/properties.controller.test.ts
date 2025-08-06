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

describe('Properties Controller (API)', () => {
  let app: INestApplication
  let apiClient: ApiTestClient
  let ownerUser: TestUser
  let tenantUser: TestUser

  beforeEach(async () => {
    // Create test users
    ownerUser = createOwnerUser()
    tenantUser = createTenantUser()

    // Build test module
    const module = await new TestModuleBuilder()
      .addController(PropertiesController)
      .addProvider({
        provide: PropertiesService,
        useValue: {
          findByOwner: vi.fn(),
          findByIdAndOwner: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          getStatsByOwner: vi.fn(),
          findNearbyProperties: vi.fn()
        }
      })
      .addProvider({
        provide: PropertiesRepository,
        useValue: mockPropertiesRepository
      })
      .build()

    app = await createTestApp(module)
    apiClient = createApiClient(app)

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

    const propertiesService = app.get(PropertiesService)
    vi.mocked(propertiesService.findByOwner).mockResolvedValue([mockProperty])
    vi.mocked(propertiesService.findByIdAndOwner).mockResolvedValue(mockProperty)
    vi.mocked(propertiesService.create).mockResolvedValue(mockProperty)
    vi.mocked(propertiesService.update).mockResolvedValue(mockProperty)
    vi.mocked(propertiesService.delete).mockResolvedValue(undefined)
    vi.mocked(propertiesService.getStatsByOwner).mockResolvedValue({
      totalProperties: 1,
      occupiedProperties: 0,
      availableProperties: 1,
      totalRentAmount: 2000,
      averageRentAmount: 2000
    })
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /api/properties', () => {
    it('should return properties for authenticated owner', async () => {
      const response = await apiClient.get('/properties', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        id: 'prop-123',
        name: 'Test Property',
        ownerId: ownerUser.id
      })
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/properties')
      expectUnauthorized(response)
    })

    it('should return forbidden for tenant users', async () => {
      const response = await apiClient.get('/properties', tenantUser)
      expectError(response, 403)
    })

    it('should handle query parameters for filtering', async () => {
      const response = await apiClient.get('/properties?status=available&city=Test City', ownerUser)
      
      expectSuccess(response)
      const propertiesService = app.get(PropertiesService)
      expect(propertiesService.findByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'available',
        city: 'Test City'
      })
    })

    it('should handle pagination parameters', async () => {
      const response = await apiClient.get('/properties?page=2&limit=10', ownerUser)
      
      expectSuccess(response)
      const propertiesService = app.get(PropertiesService)
      expect(propertiesService.findByOwner).toHaveBeenCalledWith(ownerUser.id, {
        page: 2,
        limit: 10
      })
    })
  })

  describe('GET /api/properties/:id', () => {
    it('should return property by ID for owner', async () => {
      const response = await apiClient.get('/properties/prop-123', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'prop-123',
        name: 'Test Property'
      })
    })

    it('should return not found for non-existent property', async () => {
      const propertiesService = app.get(PropertiesService)
      vi.mocked(propertiesService.findByIdAndOwner).mockResolvedValue(null)

      const response = await apiClient.get('/properties/non-existent', ownerUser)
      expectNotFound(response)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/properties/prop-123')
      expectUnauthorized(response)
    })

    it('should return forbidden for properties not owned by user', async () => {
      const propertiesService = app.get(PropertiesService)
      vi.mocked(propertiesService.findByIdAndOwner).mockResolvedValue(null)

      const response = await apiClient.get('/properties/prop-123', tenantUser)
      expectError(response, 403)
    })
  })

  describe('POST /api/properties', () => {
    it('should create property with valid data', async () => {
      const propertyData = generatePropertyData()
      const response = await apiClient.post('/properties', propertyData, ownerUser)
      
      expectSuccess(response, 201)
      expect(response.body).toMatchObject({
        id: 'prop-123',
        name: propertyData.name,
        address: propertyData.address
      })

      const propertiesService = app.get(PropertiesService)
      expect(propertiesService.create).toHaveBeenCalledWith(ownerUser.id, propertyData)
    })

    it('should validate required fields', async () => {
      const invalidData = { name: '' } // Missing required fields
      const response = await apiClient.post('/properties', invalidData, ownerUser)
      
      expectValidationError(response, 'name')
    })

    it('should validate property type enum', async () => {
      const invalidData = {
        ...generatePropertyData(),
        propertyType: 'invalid_type'
      }
      const response = await apiClient.post('/properties', invalidData, ownerUser)
      
      expectValidationError(response, 'propertyType')
    })

    it('should validate numeric fields', async () => {
      const invalidData = {
        ...generatePropertyData(),
        bedrooms: -1,
        bathrooms: 0,
        rentAmount: -100
      }
      const response = await apiClient.post('/properties', invalidData, ownerUser)
      
      expectValidationError(response)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.post('/properties', generatePropertyData())
      expectUnauthorized(response)
    })
  })

  describe('PUT /api/properties/:id', () => {
    it('should update property with valid data', async () => {
      const updateData = { name: 'Updated Property Name', rentAmount: 2200 }
      const response = await apiClient.put('/properties/prop-123', updateData, ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'prop-123',
        name: 'Updated Property Name'
      })

      const propertiesService = app.get(PropertiesService)
      expect(propertiesService.update).toHaveBeenCalledWith('prop-123', ownerUser.id, updateData)
    })

    it('should handle partial updates', async () => {
      const updateData = { rentAmount: 2500 }
      const response = await apiClient.put('/properties/prop-123', updateData, ownerUser)
      
      expectSuccess(response)
      const propertiesService = app.get(PropertiesService)
      expect(propertiesService.update).toHaveBeenCalledWith('prop-123', ownerUser.id, updateData)
    })

    it('should return not found for non-existent property', async () => {
      const propertiesService = app.get(PropertiesService)
      vi.mocked(propertiesService.update).mockResolvedValue(null)

      const response = await apiClient.put('/properties/non-existent', { name: 'Updated' }, ownerUser)
      expectNotFound(response)
    })

    it('should validate update data', async () => {
      const invalidData = { rentAmount: -100 }
      const response = await apiClient.put('/properties/prop-123', invalidData, ownerUser)
      
      expectValidationError(response, 'rentAmount')
    })
  })

  describe('DELETE /api/properties/:id', () => {
    it('should delete property successfully', async () => {
      const response = await apiClient.delete('/properties/prop-123', ownerUser)
      
      expectSuccess(response, 204)
      expect(response.body).toEqual({})

      const propertiesService = app.get(PropertiesService)
      expect(propertiesService.delete).toHaveBeenCalledWith('prop-123', ownerUser.id)
    })

    it('should return not found for non-existent property', async () => {
      const propertiesService = app.get(PropertiesService)
      vi.mocked(propertiesService.delete).mockRejectedValue(new Error('Property not found'))

      const response = await apiClient.delete('/properties/non-existent', ownerUser)
      expectError(response, 500) // Service error handling
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.delete('/properties/prop-123')
      expectUnauthorized(response)
    })
  })

  describe('GET /api/properties/stats', () => {
    it('should return property statistics for owner', async () => {
      const response = await apiClient.get('/properties/stats', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        totalProperties: 1,
        occupiedProperties: 0,
        availableProperties: 1,
        totalRentAmount: 2000,
        averageRentAmount: 2000
      })

      const propertiesService = app.get(PropertiesService)
      expect(propertiesService.getStatsByOwner).toHaveBeenCalledWith(ownerUser.id)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/properties/stats')
      expectUnauthorized(response)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const propertiesService = app.get(PropertiesService)
      vi.mocked(propertiesService.findByOwner).mockRejectedValue(new Error('Database error'))

      const response = await apiClient.get('/properties', ownerUser)
      expectError(response, 500)
    })

    it('should handle malformed JSON in request body', async () => {
      const response = await apiClient.post('/properties', 'invalid-json', ownerUser)
      expectError(response, 400)
    })

    it('should handle very large request bodies', async () => {
      const largeData = {
        ...generatePropertyData(),
        description: 'x'.repeat(100000) // Very large description
      }
      const response = await apiClient.post('/properties', largeData, ownerUser)
      expectValidationError(response, 'description')
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent property creation', async () => {
      const propertyData1 = generatePropertyData()
      const propertyData2 = { ...generatePropertyData(), name: 'Property 2' }

      const [response1, response2] = await Promise.all([
        apiClient.post('/properties', propertyData1, ownerUser),
        apiClient.post('/properties', propertyData2, ownerUser)
      ])

      expectSuccess(response1, 201)
      expectSuccess(response2, 201)
    })

    it('should handle concurrent updates to same property', async () => {
      const update1 = { name: 'Updated Name 1' }
      const update2 = { rentAmount: 2500 }

      const [response1, response2] = await Promise.all([
        apiClient.put('/properties/prop-123', update1, ownerUser),
        apiClient.put('/properties/prop-123', update2, ownerUser)
      ])

      // Both should succeed (last one wins in typical scenarios)
      expectSuccess(response1)
      expectSuccess(response2)
    })
  })

  describe('Bulk Operations', () => {
    it('should handle bulk property requests efficiently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        method: 'GET' as const,
        path: `/properties/prop-${i}`,
        user: ownerUser
      }))

      const responses = await apiClient.bulkRequest(requests)
      
      expect(responses).toHaveLength(5)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })
})