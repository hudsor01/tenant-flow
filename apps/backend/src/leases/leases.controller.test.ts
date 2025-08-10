/**
 * Leases Controller Tests
 * Comprehensive API testing for lease management endpoints
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeasePDFService } from './services/lease-pdf.service'
import { createOwnerUser, createTenantUser, TestUser } from '../test/test-users'
import { CreateLeaseDto } from './dto/create-lease.dto'

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
      getByOwner: jest.fn(),
      getByIdOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getByUnit: jest.fn(),
      getByTenant: jest.fn(),
      getStats: jest.fn()
    } as any

    leasePDFService = {
      generateLeasePDF: jest.fn(),
      generateLeaseDocument: jest.fn()
    } as any

    // Create controller instance
    controller = new LeasesController(leasesService, leasePDFService)

    // Setup common mock responses
    const mockLease = {
      id: 'lease-123',
      unitId: 'unit-123',
      propertyId: 'prop-123',
      tenantId: 'tenant-123',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      rentAmount: 2000,
      securityDeposit: 4000,
      terms: 'Standard lease terms',
      status: 'ACTIVE' as const,
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

    ;(leasesService.getByOwner as jest.Mock).mockResolvedValue([mockLease])
    ;(leasesService.getByIdOrThrow as jest.Mock).mockResolvedValue(mockLease)
    ;(leasesService.create as jest.Mock).mockResolvedValue(mockLease)
    ;(leasesService.update as jest.Mock).mockResolvedValue(mockLease)
    ;(leasesService.delete as jest.Mock).mockResolvedValue(mockLease)
    ;(leasesService.getByUnit as jest.Mock).mockResolvedValue([mockLease])
    ;(leasesService.getStats as jest.Mock).mockResolvedValue({ 
      total: 1,
      active: 1,
      inactive: 0
    })
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
        status: 'ACTIVE',
        ownerId: ownerUser.id
      })
      expect(leasesService.getByOwner).toHaveBeenCalledWith(ownerUser.id, { limit: 10, offset: 0 })
    })

    it('should handle query parameters for filtering', async () => {
      const result = await controller.findAll(ownerUser, {
        status: 'ACTIVE',
        propertyId: 'prop-123',
        limit: 10,
        offset: 0
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(leasesService.getByOwner).toHaveBeenCalledWith(ownerUser.id, {
        status: 'ACTIVE',
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
        status: 'ACTIVE'
      })
      expect(leasesService.getByIdOrThrow).toHaveBeenCalledWith('lease-123', ownerUser.id)
    })

    it('should throw error for non-existent lease', async () => {
      ;(leasesService.getByIdOrThrow as jest.Mock).mockRejectedValue(new Error('Lease not found'))

      await expect(controller.findOne('non-existent', ownerUser))
        .rejects.toThrow('Lease not found')
    })
  })

  describe('create', () => {
    it('should create lease with valid data', async () => {
      const leaseData: CreateLeaseDto = {
        unitId: 'unit-123',
        propertyId: 'prop-123',
        tenantId: 'tenant-123',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        rentAmount: 2000,
        securityDeposit: 4000,
        terms: 'Standard lease terms'
      }
      
      const result = await controller.create(leaseData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'lease-123',
        propertyId: leaseData.propertyId,
        tenantId: leaseData.tenantId,
        rentAmount: leaseData.rentAmount
      })
      expect(leasesService.create).toHaveBeenCalledWith(leaseData, ownerUser.id)
    })
  })

  describe('update', () => {
    it('should update lease with valid data', async () => {
      const updateData = { 
        rentAmount: 2200
      }
      
      const result = await controller.update('lease-123', updateData, ownerUser)
      
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'lease-123',
        rentAmount: 2000  // Mock returns original data
      })
      expect(leasesService.update).toHaveBeenCalledWith('lease-123', updateData, ownerUser.id)
    })
  })

  describe('remove', () => {
    it('should delete lease successfully', async () => {
      await controller.remove('lease-123', ownerUser)
      
      expect(leasesService.delete).toHaveBeenCalledWith('lease-123', ownerUser.id)
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