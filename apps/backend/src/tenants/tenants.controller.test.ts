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
          findByOwner: vi.fn(),
          findByIdAndOwner: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          inviteTenant: vi.fn(),
          acceptInvitation: vi.fn(),
          getTenantsWithLeases: vi.fn(),
          searchTenants: vi.fn()
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
    vi.mocked(tenantsService.findByOwner).mockResolvedValue([mockTenant])
    vi.mocked(tenantsService.findByIdAndOwner).mockResolvedValue(mockTenant)
    vi.mocked(tenantsService.create).mockResolvedValue(mockTenant)
    vi.mocked(tenantsService.update).mockResolvedValue(mockTenant)
    vi.mocked(tenantsService.delete).mockResolvedValue(undefined)
    vi.mocked(tenantsService.inviteTenant).mockResolvedValue({ 
      id: 'invitation-123', 
      email: 'john.doe@example.com', 
      invitationSent: true 
    })
    vi.mocked(tenantsService.getTenantsWithLeases).mockResolvedValue([{
      ...mockTenant,
      lease: {
        id: 'lease-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        monthlyRent: 2000,
        status: 'active'
      }
    }])
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
      expect(tenantsService.findByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'active',
        propertyId: 'prop-123'
      })
    })

    it('should handle search parameters', async () => {
      const response = await apiClient.get('/tenants?search=john', ownerUser)
      
      expectSuccess(response)
      const tenantsService = app.get(TenantsService)
      expect(tenantsService.searchTenants).toHaveBeenCalledWith(ownerUser.id, 'john')
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
      vi.mocked(tenantsService.findByIdAndOwner).mockResolvedValue(null)

      const response = await apiClient.get('/tenants/non-existent', ownerUser)
      expectNotFound(response)
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
      expect(tenantsService.create).toHaveBeenCalledWith(ownerUser.id, tenantData)
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
      expect(tenantsService.update).toHaveBeenCalledWith('tenant-123', ownerUser.id, updateData)
    })

    it('should handle partial updates', async () => {
      const updateData = { phone: '555-8888' }
      const response = await apiClient.put('/tenants/tenant-123', updateData, ownerUser)
      
      expectSuccess(response)
      const tenantsService = app.get(TenantsService)
      expect(tenantsService.update).toHaveBeenCalledWith('tenant-123', ownerUser.id, updateData)
    })

    it('should return not found for non-existent tenant', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.update).mockResolvedValue(null)

      const response = await apiClient.put('/tenants/non-existent', { firstName: 'Updated' }, ownerUser)
      expectNotFound(response)
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
      expect(tenantsService.delete).toHaveBeenCalledWith('tenant-123', ownerUser.id)
    })

    it('should return not found for non-existent tenant', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.delete).mockRejectedValue(new Error('Tenant not found'))

      const response = await apiClient.delete('/tenants/non-existent', ownerUser)
      expectError(response, 500)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.delete('/tenants/tenant-123')
      expectUnauthorized(response)
    })
  })

  describe('POST /api/tenants/invite', () => {
    it('should send tenant invitation successfully', async () => {
      const invitationData = {
        email: 'newTenant@example.com',
        propertyId: 'prop-123',
        monthlyRent: 2000,
        leaseStartDate: '2024-01-01',
        leaseEndDate: '2024-12-31'
      }
      
      const response = await apiClient.post('/tenants/invite', invitationData, ownerUser)
      
      expectSuccess(response, 201)
      expect(response.body).toMatchObject({
        id: 'invitation-123',
        email: 'newTenant@example.com',
        invitationSent: true
      })

      const tenantsService = app.get(TenantsService)
      expect(tenantsService.inviteTenant).toHaveBeenCalledWith(ownerUser.id, invitationData)
    })

    it('should validate invitation data', async () => {
      const invalidData = {
        email: 'invalid-email',
        propertyId: '',
        monthlyRent: -100
      }
      
      const response = await apiClient.post('/tenants/invite', invalidData, ownerUser)
      expectValidationError(response)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.post('/tenants/invite', {
        email: 'test@example.com',
        propertyId: 'prop-123'
      })
      expectUnauthorized(response)
    })
  })

  describe('POST /api/tenants/accept-invitation', () => {
    it('should accept tenant invitation successfully', async () => {
      const acceptanceData = {
        invitationToken: 'token-123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-0123',
        dateOfBirth: '1990-01-01'
      }
      
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.acceptInvitation).mockResolvedValue({
        tenant: {
          id: 'tenant-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          status: 'active'
        },
        lease: {
          id: 'lease-123',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          status: 'active'
        }
      })
      
      const response = await apiClient.post('/tenants/accept-invitation', acceptanceData)
      
      expectSuccess(response, 201)
      expect(response.body).toHaveProperty('tenant')
      expect(response.body).toHaveProperty('lease')
    })

    it('should validate acceptance data', async () => {
      const invalidData = {
        invitationToken: '',
        firstName: '',
        email: 'invalid-email'
      }
      
      const response = await apiClient.post('/tenants/accept-invitation', invalidData)
      expectValidationError(response)
    })

    it('should handle invalid invitation tokens', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.acceptInvitation).mockRejectedValue(
        new Error('Invalid invitation token')
      )
      
      const response = await apiClient.post('/tenants/accept-invitation', {
        invitationToken: 'invalid-token',
        firstName: 'John',
        lastName: 'Doe'
      })
      
      expectError(response, 500)
    })
  })

  describe('GET /api/tenants/with-leases', () => {
    it('should return tenants with their lease information', async () => {
      const response = await apiClient.get('/tenants/with-leases', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        id: 'tenant-123',
        firstName: 'John',
        lease: {
          id: 'lease-123',
          status: 'active'
        }
      })

      const tenantsService = app.get(TenantsService)
      expect(tenantsService.getTenantsWithLeases).toHaveBeenCalledWith(ownerUser.id)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/tenants/with-leases')
      expectUnauthorized(response)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.findByOwner).mockRejectedValue(new Error('Database error'))

      const response = await apiClient.get('/tenants', ownerUser)
      expectError(response, 500)
    })

    it('should handle duplicate email addresses', async () => {
      const tenantsService = app.get(TenantsService)
      vi.mocked(tenantsService.create).mockRejectedValue(
        new Error('Email already exists')
      )

      const response = await apiClient.post('/tenants', generateTenantData(), ownerUser)
      expectError(response, 500)
    })
  })

  describe('Tenant Self-Service (Tenant Portal)', () => {
    it('should allow tenant to view their own profile', async () => {
      const response = await apiClient.get('/tenants/profile', tenantUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe'
      })
    })

    it('should allow tenant to update their own profile', async () => {
      const updateData = { phone: '555-9999', emergencyContactPhone: '555-8888' }
      const response = await apiClient.put('/tenants/profile', updateData, tenantUser)
      
      expectSuccess(response)
      const tenantsService = app.get(TenantsService)
      expect(tenantsService.update).toHaveBeenCalledWith(tenantUser.id, tenantUser.id, updateData)
    })

    it('should prevent tenant from accessing other tenants data', async () => {
      const response = await apiClient.get('/tenants/other-tenant-123', tenantUser)
      expectError(response, 403)
    })
  })
})