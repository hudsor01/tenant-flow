/**
 * Leases Controller Tests
 * Comprehensive API testing for lease management endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeasePDFService } from './services/lease-pdf.service'
import { createOwnerUser, createTenantUser, TestUser } from '@/test/test-users'

describe('Leases Controller (Unit Tests)', () => {
  let controller: LeasesController
  let leasesService: LeasesService
  let leasePDFService: LeasePDFService
  let ownerUser: TestUser
  let tenantUser: TestUser

  beforeEach(() => {
    // Create test users
    ownerUser = createOwnerUser()
    tenantUser = createTenantUser()

    // Mock services with BaseCrudController interface
    leasesService = {
      findByOwner: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getByUnit: vi.fn(),
      getByTenant: vi.fn(),
      getStats: vi.fn()
    } as any

    leasePDFService = {
      generateLeasePDF: vi.fn(),
      generateLeaseDocument: vi.fn()
    } as any

    // Create controller instance
    controller = new LeasesController(leasesService, leasePDFService)

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

    vi.mocked(leasesService.findByOwner).mockResolvedValue([mockLease])
    vi.mocked(leasesService.findById).mockResolvedValue(mockLease)
    vi.mocked(leasesService.create).mockResolvedValue(mockLease)
    vi.mocked(leasesService.update).mockResolvedValue(mockLease)
    vi.mocked(leasesService.delete).mockResolvedValue(undefined)
    vi.mocked(leasesService.getByUnit).mockResolvedValue([mockLease])
    vi.mocked(leasesService.getStats).mockResolvedValue({ total: 1 })
  })

  describe('findAll', () => {
    it('should return leases for authenticated owner', async () => {
      const result = await controller.findAll(ownerUser, { limit: 10, offset: 0 })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: 'lease-123',
        propertyId: 'prop-123',
        tenantId: 'tenant-123',
        status: 'active',
        ownerId: ownerUser.id
      })
      expect(leasesService.findByOwner).toHaveBeenCalledWith(ownerUser.id, { limit: 10, offset: 0 })
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
      expect(leasesService.findByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'active',
        propertyId: 'prop-123',
        limit: 10,
        offset: 0
      })
    })
  })

  describe('findOne', () => {
    it('should return lease by ID for owner', async () => {
      const result = await controller.findOne('lease-123', ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'lease-123',
        propertyId: 'prop-123',
        tenantId: 'tenant-123',
        status: 'active'
      })
      expect(leasesService.findById).toHaveBeenCalledWith(ownerUser.id, 'lease-123')
    })

    it('should throw error for non-existent lease', async () => {
      vi.mocked(leasesService.findById).mockResolvedValue(null)

      await expect(controller.findOne('non-existent', ownerUser))
        .rejects.toThrow('Lease not found')
    })
  })

  describe('create', () => {
    it('should create lease with valid data', async () => {
      const leaseData = {
        propertyId: 'prop-123',
        tenantId: 'tenant-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        monthlyRent: 2000,
        securityDeposit: 4000
      }
      
      const result = await controller.create(leaseData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'lease-123',
        propertyId: leaseData.propertyId,
        tenantId: leaseData.tenantId,
        monthlyRent: leaseData.monthlyRent
      })
      expect(leasesService.create).toHaveBeenCalledWith(ownerUser.id, leaseData)
    })
  })

  describe('update', () => {
    it('should update lease with valid data', async () => {
      const updateData = { 
        monthlyRent: 2200
      }
      
      const result = await controller.update('lease-123', updateData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'lease-123',
        monthlyRent: 2000  // Mock returns original data
      })
      expect(leasesService.update).toHaveBeenCalledWith(ownerUser.id, 'lease-123', updateData)
    })
  })

  describe('remove', () => {
    it('should delete lease successfully', async () => {
      await controller.remove('lease-123', ownerUser)
      
      expect(leasesService.delete).toHaveBeenCalledWith(ownerUser.id, 'lease-123')
    })
  })

  describe('getByUnit', () => {
    it('should return leases by unit ID', async () => {
      const result = await controller.getLeasesByUnit('unit-123', ownerUser, {})
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(leasesService.getByUnit).toHaveBeenCalledWith('unit-123', ownerUser.id, {})
    })
  })
})