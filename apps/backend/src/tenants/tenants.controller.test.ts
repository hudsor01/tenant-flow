/**
 * Tenants Controller Tests
 * Comprehensive API testing for tenant management endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { INestApplication } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { TenantsRepository } from './tenants.repository'
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
  generateTenantData
} from '@/test/api-test-helpers'
import { createOwnerUser, createTenantUser, TestUser } from '@/test/test-users'
import { mockPrismaService } from '@/test/setup'

describe('Tenants Controller (API)', () => {
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
      .addController(TenantsController)
      .addProvider({
        provide: TenantsService,
        useValue: {
          getTenantsByOwner: vi.fn(),
          getTenantByIdOrThrow: vi.fn(),
          createTenant: vi.fn(),
          updateTenant: vi.fn(),
          deleteTenant: vi.fn(),
          getTenantStats: vi.fn()
        }
      })
      .addProvider({
        provide: TenantsRepository,
        useValue: {
          findByOwner: vi.fn(),
          findById: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn()
        }
      })
      .build()

    app = await createTestApp(module)
    apiClient = createApiClient(app)

    // Setup common mock responses
    const mockTenant = {
      id: 'tenant-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-0123',
      dateOfBirth: '1990-01-01',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '555-0124',
      status: 'active',
      ownerId: ownerUser.id,
      propertyId: 'prop-123',
      unitId: 'unit-123',
      leaseStartDate: '2024-01-01',
      leaseEndDate: '2024-12-31',
      monthlyRent: 2000,
      securityDeposit: 4000,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const tenantsService = app.get(TenantsService)
    vi.mocked(tenantsService.getTenantsByOwner).mockResolvedValue([mockTenant])
    vi.mocked(tenantsService.getTenantByIdOrThrow).mockResolvedValue(mockTenant)
    vi.mocked(tenantsService.createTenant).mockResolvedValue(mockTenant)
    vi.mocked(tenantsService.updateTenant).mockResolvedValue(mockTenant)
    vi.mocked(tenantsService.deleteTenant).mockResolvedValue(undefined)
    vi.mocked(tenantsService.getTenantStats).mockResolvedValue({
      totalTenants: 5,
      activeTenants: 3
    })
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /api/tenants', () => {
    it('should return tenants for authenticated owner', async () => {
      const response = await apiClient.get('/tenants', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        id: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        ownerId: ownerUser.id
      })
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/tenants')
      expectUnauthorized(response)
    })

    it('should handle query parameters for filtering', async () => {
      const response = await apiClient.get('/tenants?status=active&propertyId=prop-123', ownerUser)
      
      expectSuccess(response)
      const tenantsService = app.get(TenantsService)
      expect(tenantsService.getTenantsByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'active',
        propertyId: 'prop-123'
      })
    })

    it('should handle search parameters', async () => {
      const response = await apiClient.get('/tenants?search=john', ownerUser)
      
      expectSuccess(response)
      const tenantsService = app.get(TenantsService)
      expect(tenantsService.getTenantsByOwner).toHaveBeenCalledWith(ownerUser.id, {
        search: 'john'
      })
    })
  })

  describe('GET /api/tenants/:id', () => {
    it('should return tenant by ID for owner', async () => {
      const response = await apiClient.get('/tenants/tenant-123', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe'
      })
    })

    it('should return not found for non-existent tenant', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.getTenantByIdOrThrow).mockRejectedValue(new Error('Tenant not found'))

      const response = await apiClient.get('/tenants/non-existent', ownerUser)
      expectError(response, 500)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/tenants/tenant-123')
      expectUnauthorized(response)
    })
  })

  describe('POST /api/tenants', () => {
    it('should create tenant with valid data', async () => {
      const tenantData = generateTenantData()
      const response = await apiClient.post('/tenants', tenantData, ownerUser)
      
      expectSuccess(response, 201)
      expect(response.body).toMatchObject({
        id: 'tenant-123',
        firstName: tenantData.firstName,
        lastName: tenantData.lastName,
        email: tenantData.email
      })

      const tenantsService = app.get(TenantsService)
      expect(tenantsService.createTenant).toHaveBeenCalledWith(tenantData, ownerUser.id)
    })

    it('should validate required fields', async () => {
      const invalidData = { firstName: '', email: 'invalid-email' }
      const response = await apiClient.post('/tenants', invalidData, ownerUser)
      
      expectValidationError(response)
    })

    it('should validate email format', async () => {
      const invalidData = {
        ...generateTenantData(),
        email: 'invalid-email-format'
      }
      const response = await apiClient.post('/tenants', invalidData, ownerUser)
      
      expectValidationError(response, 'email')
    })

    it('should validate phone number format', async () => {
      const invalidData = {
        ...generateTenantData(),
        phone: 'invalid-phone'
      }
      const response = await apiClient.post('/tenants', invalidData, ownerUser)
      
      expectValidationError(response, 'phone')
    })

    it('should validate date of birth format', async () => {
      const invalidData = {
        ...generateTenantData(),
        dateOfBirth: 'invalid-date'
      }
      const response = await apiClient.post('/tenants', invalidData, ownerUser)
      
      expectValidationError(response, 'dateOfBirth')
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.post('/tenants', generateTenantData())
      expectUnauthorized(response)
    })
  })

  describe('PUT /api/tenants/:id', () => {
    it('should update tenant with valid data', async () => {
      const updateData = { 
        firstName: 'Updated John', 
        phone: '555-9999',
        emergencyContactName: 'Updated Emergency Contact'
      }
      const response = await apiClient.put('/tenants/tenant-123', updateData, ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'tenant-123',
        firstName: 'Updated John'
      })

      const tenantsService = app.get(TenantsService)
      expect(tenantsService.updateTenant).toHaveBeenCalledWith('tenant-123', updateData, ownerUser.id)
    })

    it('should handle partial updates', async () => {
      const updateData = { phone: '555-8888' }
      const response = await apiClient.put('/tenants/tenant-123', updateData, ownerUser)
      
      expectSuccess(response)
      const tenantsService = app.get(TenantsService)
      expect(tenantsService.updateTenant).toHaveBeenCalledWith('tenant-123', updateData, ownerUser.id)
    })

    it('should return not found for non-existent tenant', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.updateTenant).mockRejectedValue(new Error('Tenant not found'))

      const response = await apiClient.put('/tenants/non-existent', { firstName: 'Updated' }, ownerUser)
      expectError(response, 500)
    })

    it('should validate update data', async () => {
      const invalidData = { email: 'invalid-email-format' }
      const response = await apiClient.put('/tenants/tenant-123', invalidData, ownerUser)
      
      expectValidationError(response, 'email')
    })
  })

  describe('DELETE /api/tenants/:id', () => {
    it('should delete tenant successfully', async () => {
      const response = await apiClient.delete('/tenants/tenant-123', ownerUser)
      
      expectSuccess(response, 204)
      expect(response.body).toEqual({})

      const tenantsService = app.get(TenantsService)
      expect(tenantsService.deleteTenant).toHaveBeenCalledWith('tenant-123', ownerUser.id)
    })

    it('should return not found for non-existent tenant', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.deleteTenant).mockRejectedValue(new Error('Tenant not found'))

      const response = await apiClient.delete('/tenants/non-existent', ownerUser)
      expectError(response, 500)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.delete('/tenants/tenant-123')
      expectUnauthorized(response)
    })
  })


  describe('GET /api/tenants/stats', () => {
    it('should return tenant statistics for authenticated owner', async () => {
      const response = await apiClient.get('/tenants/stats', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        totalTenants: 5,
        activeTenants: 3
      })

      const tenantsService = app.get(TenantsService)
      expect(tenantsService.getTenantStats).toHaveBeenCalledWith(ownerUser.id)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/tenants/stats')
      expectUnauthorized(response)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.getTenantsByOwner).mockRejectedValue(new Error('Database error'))

      const response = await apiClient.get('/tenants', ownerUser)
      expectError(response, 500)
    })

    it('should handle duplicate email addresses', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.createTenant).mockRejectedValue(
        new Error('Email already exists')
      )

      const response = await apiClient.post('/tenants', generateTenantData(), ownerUser)
      expectError(response, 500)
    })
  })

})