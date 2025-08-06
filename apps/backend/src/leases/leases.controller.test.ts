/**
 * Leases Controller Tests
 * Comprehensive API testing for lease management endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { INestApplication } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseRepository } from './lease.repository'
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
  generateLeaseData
} from '@/test/api-test-helpers'
import { createOwnerUser, createTenantUser, TestUser } from '@/test/test-users'
import { mockPrismaService } from '@/test/setup'

describe('Leases Controller (API)', () => {
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
      .addController(LeasesController)
      .addProvider({
        provide: LeasesService,
        useValue: {
          findByOwner: vi.fn(),
          findByIdAndOwner: vi.fn(),
          findByTenant: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          terminate: vi.fn(),
          renew: vi.fn(),
          generateDocument: vi.fn(),
          getExpiringLeases: vi.fn(),
          validateLeaseTerms: vi.fn()
        }
      })
      .addProvider({
        provide: LeaseRepository,
        useValue: {
          findByPropertyOwner: vi.fn(),
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
    const mockLease = {
      id: 'lease-123',
      propertyId: 'prop-123',
      tenantId: 'tenant-123',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      monthlyRent: 2000,
      securityDeposit: 4000,
      leaseTerms: {
        petsAllowed: false,
        smokingAllowed: false,
        utilitiesIncluded: ['water', 'trash'],
        parkingSpaces: 1,
        lateFee: 50,
        gracePeriodDays: 5
      },
      status: 'active',
      ownerId: ownerUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      property: {
        id: 'prop-123',
        name: 'Test Property',
        address: '123 Test St'
      },
      tenant: {
        id: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }
    }

    const leasesService = app.get(LeasesService)
    vi.mocked(leasesService.findByOwner).mockResolvedValue([mockLease])
    vi.mocked(leasesService.findByIdAndOwner).mockResolvedValue(mockLease)
    vi.mocked(leasesService.findByTenant).mockResolvedValue([mockLease])
    vi.mocked(leasesService.create).mockResolvedValue(mockLease)
    vi.mocked(leasesService.update).mockResolvedValue(mockLease)
    vi.mocked(leasesService.delete).mockResolvedValue(undefined)
    vi.mocked(leasesService.terminate).mockResolvedValue({
      ...mockLease,
      status: 'terminated',
      terminationDate: '2024-06-30'
    })
    vi.mocked(leasesService.renew).mockResolvedValue({
      ...mockLease,
      id: 'lease-456',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    })
    vi.mocked(leasesService.generateDocument).mockResolvedValue({
      documentUrl: 'https://example.com/lease-document.pdf',
      documentId: 'doc-123'
    })
    vi.mocked(leasesService.getExpiringLeases).mockResolvedValue([
      { ...mockLease, endDate: '2024-02-29' }
    ])
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /api/leases', () => {
    it('should return leases for authenticated owner', async () => {
      const response = await apiClient.get('/leases', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        id: 'lease-123',
        propertyId: 'prop-123',
        tenantId: 'tenant-123',
        status: 'active',
        ownerId: ownerUser.id
      })
    })

    it('should return leases for authenticated tenant', async () => {
      const response = await apiClient.get('/leases', tenantUser)
      
      expectSuccess(response)
      const leasesService = app.get(LeasesService)
      expect(leasesService.findByTenant).toHaveBeenCalledWith(tenantUser.id)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/leases')
      expectUnauthorized(response)
    })

    it('should handle query parameters for filtering', async () => {
      const response = await apiClient.get('/leases?status=active&propertyId=prop-123', ownerUser)
      
      expectSuccess(response)
      const leasesService = app.get(LeasesService)
      expect(leasesService.findByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'active',
        propertyId: 'prop-123'
      })
    })

    it('should handle date range filtering', async () => {
      const response = await apiClient.get('/leases?startDateFrom=2024-01-01&endDateTo=2024-12-31', ownerUser)
      
      expectSuccess(response)
      const leasesService = app.get(LeasesService)
      expect(leasesService.findByOwner).toHaveBeenCalledWith(ownerUser.id, {
        startDateFrom: '2024-01-01',
        endDateTo: '2024-12-31'
      })
    })
  })

  describe('GET /api/leases/:id', () => {
    it('should return lease by ID for owner', async () => {
      const response = await apiClient.get('/leases/lease-123', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'lease-123',
        propertyId: 'prop-123',
        tenantId: 'tenant-123',
        status: 'active'
      })
    })

    it('should return lease for tenant (if they are the lease holder)', async () => {
      const response = await apiClient.get('/leases/lease-123', tenantUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'lease-123',
        tenantId: 'tenant-123'
      })
    })

    it('should return not found for non-existent lease', async () => {
      const leasesService = app.get(LeasesService)
      vi.mocked(leasesService.findByIdAndOwner).mockResolvedValue(null)

      const response = await apiClient.get('/leases/non-existent', ownerUser)
      expectNotFound(response)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/leases/lease-123')
      expectUnauthorized(response)
    })
  })

  describe('POST /api/leases', () => {
    it('should create lease with valid data', async () => {
      const leaseData = generateLeaseData('prop-123', 'tenant-123')
      const response = await apiClient.post('/leases', leaseData, ownerUser)
      
      expectSuccess(response, 201)
      expect(response.body).toMatchObject({
        id: 'lease-123',
        propertyId: leaseData.propertyId,
        tenantId: leaseData.tenantId,
        monthlyRent: leaseData.monthlyRent
      })

      const leasesService = app.get(LeasesService)
      expect(leasesService.create).toHaveBeenCalledWith(ownerUser.id, leaseData)
    })

    it('should validate required fields', async () => {
      const invalidData = { 
        propertyId: '',
        tenantId: '',
        startDate: '',
        endDate: '',
        monthlyRent: 0
      }
      const response = await apiClient.post('/leases', invalidData, ownerUser)
      
      expectValidationError(response)
    })

    it('should validate date formats and logic', async () => {
      const invalidData = {
        ...generateLeaseData('prop-123', 'tenant-123'),
        startDate: 'invalid-date',
        endDate: '2023-12-31' // End date before start date
      }
      const response = await apiClient.post('/leases', invalidData, ownerUser)
      
      expectValidationError(response)
    })

    it('should validate monetary amounts', async () => {
      const invalidData = {
        ...generateLeaseData('prop-123', 'tenant-123'),
        monthlyRent: -100,
        securityDeposit: -200
      }
      const response = await apiClient.post('/leases', invalidData, ownerUser)
      
      expectValidationError(response)
    })

    it('should validate lease terms structure', async () => {
      const invalidData = {
        ...generateLeaseData('prop-123', 'tenant-123'),
        leaseTerms: {
          petsAllowed: 'invalid-boolean',
          parkingSpaces: -1,
          lateFee: 'invalid-number'
        }
      }
      const response = await apiClient.post('/leases', invalidData, ownerUser)
      
      expectValidationError(response)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.post('/leases', generateLeaseData('prop-123', 'tenant-123'))
      expectUnauthorized(response)
    })

    it('should prevent tenants from creating leases', async () => {
      const response = await apiClient.post('/leases', generateLeaseData('prop-123', 'tenant-123'), tenantUser)
      expectError(response, 403)
    })
  })

  describe('PUT /api/leases/:id', () => {
    it('should update lease with valid data', async () => {
      const updateData = { 
        monthlyRent: 2200,
        leaseTerms: {
          petsAllowed: true,
          lateFee: 75
        }
      }
      const response = await apiClient.put('/leases/lease-123', updateData, ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'lease-123',
        monthlyRent: 2200
      })

      const leasesService = app.get(LeasesService)
      expect(leasesService.update).toHaveBeenCalledWith('lease-123', ownerUser.id, updateData)
    })

    it('should handle partial updates', async () => {
      const updateData = { monthlyRent: 2100 }
      const response = await apiClient.put('/leases/lease-123', updateData, ownerUser)
      
      expectSuccess(response)
      const leasesService = app.get(LeasesService)
      expect(leasesService.update).toHaveBeenCalledWith('lease-123', ownerUser.id, updateData)
    })

    it('should return not found for non-existent lease', async () => {
      const leasesService = app.get(LeasesService)
      vi.mocked(leasesService.update).mockResolvedValue(null)

      const response = await apiClient.put('/leases/non-existent', { monthlyRent: 2200 }, ownerUser)
      expectNotFound(response)
    })

    it('should validate update data', async () => {
      const invalidData = { monthlyRent: -100 }
      const response = await apiClient.put('/leases/lease-123', invalidData, ownerUser)
      
      expectValidationError(response, 'monthlyRent')
    })

    it('should prevent tenants from updating leases', async () => {
      const response = await apiClient.put('/leases/lease-123', { monthlyRent: 2200 }, tenantUser)
      expectError(response, 403)
    })
  })

  describe('DELETE /api/leases/:id', () => {
    it('should delete lease successfully', async () => {
      const response = await apiClient.delete('/leases/lease-123', ownerUser)
      
      expectSuccess(response, 204)
      expect(response.body).toEqual({})

      const leasesService = app.get(LeasesService)
      expect(leasesService.delete).toHaveBeenCalledWith('lease-123', ownerUser.id)
    })

    it('should return not found for non-existent lease', async () => {
      const leasesService = app.get(LeasesService)
      vi.mocked(leasesService.delete).mockRejectedValue(new Error('Lease not found'))

      const response = await apiClient.delete('/leases/non-existent', ownerUser)
      expectError(response, 500)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.delete('/leases/lease-123')
      expectUnauthorized(response)
    })

    it('should prevent tenants from deleting leases', async () => {
      const response = await apiClient.delete('/leases/lease-123', tenantUser)
      expectError(response, 403)
    })
  })

  describe('POST /api/leases/:id/terminate', () => {
    it('should terminate lease successfully', async () => {
      const terminationData = {
        terminationDate: '2024-06-30',
        reason: 'Tenant requested early termination',
        refundAmount: 2000
      }
      
      const response = await apiClient.post('/leases/lease-123/terminate', terminationData, ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        id: 'lease-123',
        status: 'terminated',
        terminationDate: '2024-06-30'
      })

      const leasesService = app.get(LeasesService)
      expect(leasesService.terminate).toHaveBeenCalledWith('lease-123', ownerUser.id, terminationData)
    })

    it('should validate termination data', async () => {
      const invalidData = {
        terminationDate: 'invalid-date',
        refundAmount: -100
      }
      
      const response = await apiClient.post('/leases/lease-123/terminate', invalidData, ownerUser)
      expectValidationError(response)
    })

    it('should prevent future termination dates', async () => {
      const invalidData = {
        terminationDate: '2030-12-31', // Far future date
        reason: 'Test'
      }
      
      const response = await apiClient.post('/leases/lease-123/terminate', invalidData, ownerUser)
      expectValidationError(response, 'terminationDate')
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.post('/leases/lease-123/terminate', {
        terminationDate: '2024-06-30'
      })
      expectUnauthorized(response)
    })
  })

  describe('POST /api/leases/:id/renew', () => {
    it('should renew lease successfully', async () => {
      const renewalData = {
        newStartDate: '2025-01-01',
        newEndDate: '2025-12-31',
        newMonthlyRent: 2100,
        updatedTerms: {
          petsAllowed: true,
          parkingSpaces: 2
        }
      }
      
      const response = await apiClient.post('/leases/lease-123/renew', renewalData, ownerUser)
      
      expectSuccess(response, 201)
      expect(response.body).toMatchObject({
        id: 'lease-456',
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      })

      const leasesService = app.get(LeasesService)
      expect(leasesService.renew).toHaveBeenCalledWith('lease-123', ownerUser.id, renewalData)
    })

    it('should validate renewal data', async () => {
      const invalidData = {
        newStartDate: 'invalid-date',
        newMonthlyRent: -100
      }
      
      const response = await apiClient.post('/leases/lease-123/renew', invalidData, ownerUser)
      expectValidationError(response)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.post('/leases/lease-123/renew', {
        newStartDate: '2025-01-01',
        newEndDate: '2025-12-31'
      })
      expectUnauthorized(response)
    })
  })

  describe('GET /api/leases/:id/document', () => {
    it('should generate and return lease document', async () => {
      const response = await apiClient.get('/leases/lease-123/document', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toMatchObject({
        documentUrl: 'https://example.com/lease-document.pdf',
        documentId: 'doc-123'
      })

      const leasesService = app.get(LeasesService)
      expect(leasesService.generateDocument).toHaveBeenCalledWith('lease-123', ownerUser.id)
    })

    it('should allow tenants to access their lease document', async () => {
      const response = await apiClient.get('/leases/lease-123/document', tenantUser)
      
      expectSuccess(response)
      expect(response.body).toHaveProperty('documentUrl')
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/leases/lease-123/document')
      expectUnauthorized(response)
    })
  })

  describe('GET /api/leases/expiring', () => {
    it('should return expiring leases for owner', async () => {
      const response = await apiClient.get('/leases/expiring?days=30', ownerUser)
      
      expectSuccess(response)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        id: 'lease-123',
        endDate: '2024-02-29'
      })

      const leasesService = app.get(LeasesService)
      expect(leasesService.getExpiringLeases).toHaveBeenCalledWith(ownerUser.id, 30)
    })

    it('should validate days parameter', async () => {
      const response = await apiClient.get('/leases/expiring?days=-10', ownerUser)
      expectValidationError(response, 'days')
    })

    it('should default to 30 days if not specified', async () => {
      const response = await apiClient.get('/leases/expiring', ownerUser)
      
      expectSuccess(response)
      const leasesService = app.get(LeasesService)
      expect(leasesService.getExpiringLeases).toHaveBeenCalledWith(ownerUser.id, 30)
    })

    it('should return unauthorized for unauthenticated requests', async () => {
      const response = await apiClient.get('/leases/expiring')
      expectUnauthorized(response)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const leasesService = app.get(LeasesService)
      vi.mocked(leasesService.findByOwner).mockRejectedValue(new Error('Database error'))

      const response = await apiClient.get('/leases', ownerUser)
      expectError(response, 500)
    })

    it('should handle overlapping lease dates', async () => {
      const leasesService = app.get(LeasesService)
      vi.mocked(leasesService.create).mockRejectedValue(
        new Error('Overlapping lease dates for property')
      )

      const response = await apiClient.post('/leases', generateLeaseData('prop-123', 'tenant-123'), ownerUser)
      expectError(response, 500)
    })

    it('should handle invalid property or tenant references', async () => {
      const leasesService = app.get(LeasesService)
      vi.mocked(leasesService.create).mockRejectedValue(
        new Error('Property or tenant not found')
      )

      const response = await apiClient.post('/leases', generateLeaseData('invalid-prop', 'invalid-tenant'), ownerUser)
      expectError(response, 500)
    })
  })

  describe('Complex Lease Scenarios', () => {
    it('should handle month-to-month leases', async () => {
      const monthToMonthData = {
        ...generateLeaseData('prop-123', 'tenant-123'),
        leaseType: 'month-to-month',
        endDate: null, // No end date for month-to-month
        leaseTerms: {
          ...generateLeaseData('prop-123', 'tenant-123').leaseTerms,
          noticePerDays: 30
        }
      }
      
      const response = await apiClient.post('/leases', monthToMonthData, ownerUser)
      expectSuccess(response, 201)
    })

    it('should handle commercial lease terms', async () => {
      const commercialData = {
        ...generateLeaseData('prop-123', 'tenant-123'),
        leaseType: 'commercial',
        leaseTerms: {
          businessType: 'retail',
          operatingHours: '9AM-9PM',
          signageRights: true,
          exclusivityClause: false,
          percentageRent: 0.05
        }
      }
      
      const response = await apiClient.post('/leases', commercialData, ownerUser)
      expectSuccess(response, 201)
    })

    it('should handle lease with multiple tenants', async () => {
      const multiTenantData = {
        ...generateLeaseData('prop-123', 'tenant-123'),
        additionalTenants: ['tenant-456', 'tenant-789'],
        jointLiability: true
      }
      
      const response = await apiClient.post('/leases', multiTenantData, ownerUser)
      expectSuccess(response, 201)
    })
  })
})