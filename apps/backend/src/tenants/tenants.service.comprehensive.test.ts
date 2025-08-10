import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { TenantsService } from './tenants.service'
import { TenantsRepository } from './tenants.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { FairHousingService } from '../common/validation/fair-housing.service'
import { EncryptionService } from '../common/security/encryption.service'
import { testDataFactory, asyncTestUtils } from '../test/base-crud-service.test-utils'

// Mock the dependencies
jest.mock('./tenants.repository')
jest.mock('../common/errors/error-handler.service')
jest.mock('../common/validation/fair-housing.service')
jest.mock('../common/security/encryption.service')

describe('TenantsService - Comprehensive Test Suite', () => {
  let service: TenantsService
  let mockRepository: TenantsRepository & any
  let mockErrorHandler: ErrorHandlerService & any
  let mockFairHousingService: FairHousingService & any
  let _mockEncryptionService: EncryptionService & any

  beforeEach(() => {
    mockRepository = {
      findByOwnerWithLeases: jest.fn(),
      findByIdAndOwner: jest.fn(),
      getStatsByOwner: jest.fn(),
      hasActiveLeases: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findManyByOwner: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn()
    } as any

    mockErrorHandler = {
      createValidationError: jest.fn((message) => new Error(`Validation: ${message}`)),
      createNotFoundError: jest.fn((resource) => new Error(`${resource} not found`)),
      createBusinessError: jest.fn((_code, message) => new Error(message as string)),
      handleErrorEnhanced: jest.fn((error) => { throw error })
    } as any

    mockFairHousingService = {
      validateTenantData: jest.fn(),
      sanitizeData: jest.fn((data) => data)
    } as any

    _mockEncryptionService = {
      encryptSensitiveFields: jest.fn((data) => data),
      decryptSensitiveFields: jest.fn((data) => data)
    } as any

    service = new TenantsService(mockRepository, mockErrorHandler, mockFairHousingService)
  })

  describe('Tenants-Specific Business Logic', () => {
    describe('Basic CRUD Operations', () => {
      it('should get tenants by owner using repository', async () => {
        const mockTenants = [testDataFactory.tenant()]
        mockRepository.findByOwnerWithLeases.mockResolvedValue(mockTenants)

        const result = await service.getTenantsByOwner('owner-123')

        expect(mockRepository.findByOwnerWithLeases).toHaveBeenCalledWith('owner-123', {})
        expect(result).toEqual(mockTenants)
      })

      it('should get tenant by ID with ownership check', async () => {
        const mockTenant = testDataFactory.tenant()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)

        const result = await service.getTenantById('tenant-123', 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('tenant-123', 'owner-123', true)
        expect(result).toEqual(mockTenant)
      })

      it('should create tenant with proper data preparation', async () => {
        const tenantData = { name: 'John Doe', email: 'john@example.com' }
        const mockCreatedTenant = testDataFactory.tenant(tenantData)
        mockRepository.create.mockResolvedValue(mockCreatedTenant)

        const result = await service.createTenant(tenantData, 'owner-123')

        expect(mockRepository.create).toHaveBeenCalledWith({
          data: expect.objectContaining(tenantData)
        })
        expect(result).toEqual(mockCreatedTenant)
      })

      it('should update tenant with ownership validation', async () => {
        const updateData = { name: 'Updated Name' }
        const mockTenant = testDataFactory.tenant()
        const mockUpdatedTenant = testDataFactory.tenant(updateData)
        
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)
        mockRepository.update.mockResolvedValue(mockUpdatedTenant)

        const result = await service.updateTenant('tenant-123', updateData, 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('tenant-123', 'owner-123', true)
        expect(mockRepository.update).toHaveBeenCalledWith({
          where: {
            id: 'tenant-123',
            Lease: {
              some: {
                Unit: {
                  Property: {
                    ownerId: 'owner-123'
                  }
                }
              }
            }
          },
          data: expect.objectContaining({
            ...updateData,
            updatedAt: expect.any(Date)
          })
        })
        expect(result).toEqual(mockUpdatedTenant)
      })

      it('should delete tenant after validation', async () => {
        const mockTenant = testDataFactory.tenant()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)
        mockRepository.hasActiveLeases.mockResolvedValue(false)
        mockRepository.delete.mockResolvedValue(mockTenant)

        const result = await service.deleteTenant('tenant-123', 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('tenant-123', 'owner-123', true)
        expect(mockRepository.hasActiveLeases).toHaveBeenCalledWith('tenant-123', 'owner-123')
        expect(mockRepository.delete).toHaveBeenCalledWith({
          where: {
            id: 'tenant-123',
            Lease: {
              some: {
                Unit: {
                  Property: {
                    ownerId: 'owner-123'
                  }
                }
              }
            }
          }
        })
        expect(result).toEqual(mockTenant)
      })
    })

    describe('Input Validation', () => {
      it('should validate ownerId in getTenantsByOwner', async () => {
        await expect(service.getTenantsByOwner(''))
          .rejects.toThrow('Owner ID is required')
      })

      it('should validate parameters in getTenantById', async () => {
        await expect(service.getTenantById('', 'owner-123'))
          .rejects.toThrow('tenant ID is required')
      })

      it('should validate parameters in deleteTenant', async () => {
        await expect(service.deleteTenant('', 'owner-123'))
          .rejects.toThrow('tenant ID is required')
      })

      it('should validate ownerId in getTenantStats', async () => {
        await expect(service.getTenantStats(''))
          .rejects.toThrow('Owner ID is required')
      })
    })

    describe('getTenantByIdOrThrow', () => {
      it('should return tenant when found', async () => {
        const mockTenant = testDataFactory.tenant()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)

        const result = await service.getTenantByIdOrThrow('tenant-123', 'owner-123')

        expect(result).toEqual(mockTenant)
      })

      it('should throw not found error when tenant does not exist', async () => {
        mockRepository.findByIdAndOwner.mockResolvedValue(null)

        await expect(service.getTenantByIdOrThrow('nonexistent', 'owner-123'))
          .rejects.toThrow('tenant with ID \'nonexistent\' not found')
      })
    })

    describe('Business Rules', () => {
      it('should prevent deletion of tenant with active leases', async () => {
        const mockTenant = testDataFactory.tenant()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)
        mockRepository.hasActiveLeases.mockResolvedValue(true)

        await expect(service.deleteTenant('tenant-123', 'owner-123'))
          .rejects.toThrow('Cannot delete tenant with active leases')
      })

      it('should allow deletion of tenant without active leases', async () => {
        const mockTenant = testDataFactory.tenant()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)
        mockRepository.hasActiveLeases.mockResolvedValue(false)
        mockRepository.delete.mockResolvedValue(mockTenant)

        const result = await service.deleteTenant('tenant-123', 'owner-123')

        expect(result).toEqual(mockTenant)
      })
    })

    describe('Statistics', () => {
      it('should get tenant statistics', async () => {
        const mockStats = { total: 10, active: 8 }
        mockRepository.getStatsByOwner.mockResolvedValue(mockStats)

        const result = await service.getTenantStats('owner-123')

        expect(mockRepository.getStatsByOwner).toHaveBeenCalledWith('owner-123')
        expect(result).toEqual(mockStats)
      })
    })

    describe('Alias Methods', () => {
      it('should have getStats alias for getTenantStats', async () => {
        const mockStats = { total: 5, active: 3 }
        mockRepository.getStatsByOwner.mockResolvedValue(mockStats)

        const result = await service.getStats('owner-123')

        expect(result).toEqual(mockStats)
      })
    })

    describe('Search and Pagination', () => {
      it('should handle search parameters', async () => {
        const mockTenants = [testDataFactory.tenant()]
        mockRepository.findByOwnerWithLeases.mockResolvedValue(mockTenants)

        await service.getTenantsByOwner('owner-123', { search: 'john' })

        expect(mockRepository.findByOwnerWithLeases).toHaveBeenCalledWith('owner-123', { search: 'john' })
      })

      it('should handle pagination parameters', async () => {
        const mockTenants = [testDataFactory.tenant()]
        mockRepository.findByOwnerWithLeases.mockResolvedValue(mockTenants)

        await service.getTenantsByOwner('owner-123', { limit: 10, offset: 20 })

        expect(mockRepository.findByOwnerWithLeases).toHaveBeenCalledWith('owner-123', { limit: 10, offset: 20 })
      })

      it('should handle empty search results', async () => {
        mockRepository.findByOwnerWithLeases.mockResolvedValue([])

        const result = await service.getTenantsByOwner('owner-123')

        expect(result).toEqual([])
      })
    })

    describe('Document Management', () => {
      const documentData = {
        url: 'https://example.com/document.pdf',
        filename: 'lease-agreement.pdf',
        mimeType: 'application/pdf',
        documentType: 'LEASE_AGREEMENT',
        size: 1024000
      }

      it('should add document to tenant with ownership verification', async () => {
        const mockTenant = testDataFactory.tenant()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)

        const result = await service.addDocument('tenant-123', documentData, 'owner-123')

        expect(mockRepository.findByIdAndOwner).toHaveBeenCalledWith('tenant-123', 'owner-123', true)
        expect(result).toMatchObject({
          id: expect.any(String),
          tenantId: 'tenant-123',
          ...documentData,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      })

      it('should verify tenant ownership before adding document', async () => {
        mockRepository.findByIdAndOwner.mockResolvedValue(null)

        await expect(service.addDocument('nonexistent', documentData, 'owner-123'))
          .rejects.toThrow('tenant with ID \'nonexistent\' not found')
      })

      it('should delete tenant document with ownership verification', async () => {
        const mockTenant = testDataFactory.tenant()
        mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)

        const result = await service.deleteTenantDocument('tenant-123', 'doc-123', 'owner-123')

        expect(result).toEqual({
          success: true,
          message: 'Document removed successfully'
        })
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle repository errors gracefully', async () => {
      const repositoryError = new Error('Database connection failed')
      mockRepository.findByOwnerWithLeases.mockRejectedValue(repositoryError)

      await expect(service.getTenantsByOwner('owner-123'))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle concurrent operations', async () => {
      const mockTenant = testDataFactory.tenant()
      mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)

      const concurrentOperations = [
        service.getTenantById('tenant-123', 'owner-123'),
        service.getTenantById('tenant-456', 'owner-123')
      ]

      const results = await Promise.allSettled(concurrentOperations)
      
      expect(results).toHaveLength(2)
      expect(mockRepository.findByIdAndOwner).toHaveBeenCalledTimes(2)
    })

    it('should maintain data consistency during updates', async () => {
      const updateData = { name: 'Updated Name' }
      const mockTenant = testDataFactory.tenant()
      const mockUpdatedTenant = testDataFactory.tenant(updateData)
      
      mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)
      mockRepository.update.mockResolvedValue(mockUpdatedTenant)

      const result = await service.updateTenant('tenant-123', updateData, 'owner-123')

      expect(result).toEqual(mockUpdatedTenant)
    })
  })

  describe('Performance Validation', () => {
    it('should complete CRUD operations efficiently', async () => {
      const mockTenant = testDataFactory.tenant()
      const tenantData = { name: 'Test Tenant', email: 'test@example.com' }

      // Setup fast mocks
      mockRepository.findByOwnerWithLeases.mockResolvedValue([mockTenant])
      mockRepository.findByIdAndOwner.mockResolvedValue(mockTenant)
      mockRepository.create.mockResolvedValue(mockTenant)
      mockRepository.update.mockResolvedValue(mockTenant)
      mockRepository.delete.mockResolvedValue(mockTenant)
      mockRepository.getStatsByOwner.mockResolvedValue({ total: 5, active: 3 })
      mockRepository.hasActiveLeases.mockResolvedValue(false)

      const { duration: createDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.createTenant(tenantData, 'owner-123')
      )

      const { duration: findDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.getTenantById('tenant-123', 'owner-123')
      )

      const { duration: updateDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.updateTenant('tenant-123', { name: 'Updated' }, 'owner-123')
      )

      const { duration: deleteDuration } = await asyncTestUtils.measureExecutionTime(() =>
        service.deleteTenant('tenant-123', 'owner-123')
      )

      // Validate operations complete quickly in test environment
      expect(createDuration).toBeLessThan(100)
      expect(findDuration).toBeLessThan(50)
      expect(updateDuration).toBeLessThan(100)
      expect(deleteDuration).toBeLessThan(150)
    })

    it('should handle bulk queries efficiently', async () => {
      const mockTenants = Array(100).fill(null).map((_, i) => 
        testDataFactory.tenant({ id: `tenant-${i}` })
      )
      mockRepository.findByOwnerWithLeases.mockResolvedValue(mockTenants)

      const { duration } = await asyncTestUtils.measureExecutionTime(() =>
        service.getTenantsByOwner('owner-123')
      )

      expect(duration).toBeLessThan(200)
    })
  })
})