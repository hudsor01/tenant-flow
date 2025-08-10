/**
 * Tenants Controller Tests
 * Comprehensive API testing for tenant management endpoints
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
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
import { mockPrismaService } from '../test/setup-jest'

describe('Tenants Controller (Unit Tests)', () => {
  let controller: TenantsController
  let tenantsService: TenantsService
  let ownerUser: TestUser
  let tenantUser: TestUser

  beforeEach(() => {
    // Create test users
    ownerUser = createOwnerUser()
    tenantUser = createTenantUser()

    // Mock service with BaseCrudService interface (adapted via adaptBaseCrudService)
    tenantsService = {
      getByOwner: jest.fn(),
      getByIdOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn()
    } as any

    // Create controller instance
    controller = new TenantsController(tenantsService)

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

    jest.mocked(tenantsService.getByOwner).mockResolvedValue([mockTenant])
    jest.mocked(tenantsService.getByIdOrThrow).mockResolvedValue(mockTenant)
    jest.mocked(tenantsService.create).mockResolvedValue(mockTenant)
    jest.mocked(tenantsService.update).mockResolvedValue(mockTenant)
    jest.mocked(tenantsService.delete).mockResolvedValue(undefined)
    jest.mocked(tenantsService.getStats).mockResolvedValue({
      totalTenants: 5,
      activeTenants: 3
    })
  })

  describe('findAll', () => {
    it('should return tenants for authenticated owner', async () => {
      const result = await controller.findAll(ownerUser, { limit: 10, offset: 0 })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        ownerId: ownerUser.id
      })
      expect(tenantsService.getByOwner).toHaveBeenCalledWith(ownerUser.id, { limit: 10, offset: 0 })
    })

    it('should handle query parameters for filtering', async () => {
      const result = await controller.findAll(ownerUser, {
        status: 'active',
        propertyId: 'prop-123',
        limit: 10,
        offset: 0
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(tenantsService.getByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'active',
        propertyId: 'prop-123',
        limit: 10,
        offset: 0
      })
    })

    it('should handle search parameters', async () => {
      const result = await controller.findAll(ownerUser, {
        search: 'john',
        limit: 10,
        offset: 0
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(tenantsService.getByOwner).toHaveBeenCalledWith(ownerUser.id, {
        search: 'john',
        limit: 10,
        offset: 0
      })
    })
  })

  describe('findOne', () => {
    it('should return tenant by ID for owner', async () => {
      const result = await controller.findOne('tenant-123', ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'tenant-123',
        firstName: 'John',
        lastName: 'Doe'
      })
      expect(tenantsService.getByIdOrThrow).toHaveBeenCalledWith('tenant-123', ownerUser.id)
    })

    it('should throw error for non-existent tenant', async () => {
      jest.mocked(tenantsService.getByIdOrThrow).mockRejectedValue(new Error('Tenant not found'))

      await expect(controller.findOne('non-existent', ownerUser))
        .rejects.toThrow('Tenant not found')
    })
  })

  describe('create', () => {
    it('should create tenant with valid data', async () => {
      const tenantData = generateTenantData()
      
      const result = await controller.create(tenantData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'tenant-123',
        firstName: tenantData.firstName,
        lastName: tenantData.lastName,
        email: tenantData.email
      })
      expect(tenantsService.create).toHaveBeenCalledWith(tenantData, ownerUser.id)
    })
  })

  describe('update', () => {
    it('should update tenant with valid data', async () => {
      const updateData = { 
        firstName: 'Updated John', 
        phone: '555-9999',
        emergencyContactName: 'Updated Emergency Contact'
      }
      
      const result = await controller.update('tenant-123', updateData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'tenant-123',
        firstName: 'John'  // Mock returns original data
      })
      expect(tenantsService.update).toHaveBeenCalledWith('tenant-123', updateData, ownerUser.id)
    })
  })

  describe('remove', () => {
    it('should delete tenant successfully', async () => {
      await controller.remove('tenant-123', ownerUser)
      
      expect(tenantsService.delete).toHaveBeenCalledWith('tenant-123', ownerUser.id)
    })
  })

  describe('getStats', () => {
    it('should return tenant statistics for authenticated owner', async () => {
      const result = await controller.getStats(ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        totalTenants: 5,
        activeTenants: 3
      })
      expect(tenantsService.getStats).toHaveBeenCalledWith(ownerUser.id)
    })
  })
})