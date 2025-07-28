import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TenantsService } from './tenants.service'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { mockPrismaClient, mockLogger } from '../test/setup'

// Mock the dependencies
const mockErrorHandler = {
  handleErrorEnhanced: vi.fn(),
  handleAsync: vi.fn()
} as jest.Mocked<ErrorHandlerService>

describe('TenantsService', () => {
  let service: TenantsService
  let prismaService: PrismaService

  beforeEach(() => {
    vi.clearAllMocks()
    prismaService = mockPrismaClient as unknown as PrismaService
    service = new TenantsService(prismaService, mockErrorHandler)
  })

  describe('getTenantsByOwner', () => {
    const ownerId = 'owner-123'
    const mockTenants = [
      {
        id: 'tenant-1',
        email: 'tenant1@test.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        Lease: [
          {
            id: 'lease-1',
            Unit: {
              id: 'unit-1',
              Property: {
                id: 'prop-1',
                name: 'Test Property',
                ownerId
              }
            }
          }
        ]
      },
      {
        id: 'tenant-2',
        email: 'tenant2@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1987654321',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        Lease: [
          {
            id: 'lease-2',
            Unit: {
              id: 'unit-2',
              Property: {
                id: 'prop-2',
                name: 'Another Property',
                ownerId
              }
            }
          }
        ]
      }
    ]

    it('should return tenants for a given owner', async () => {
      mockPrismaClient.tenant.findMany.mockResolvedValue(mockTenants)

      const result = await service.getTenantsByOwner(ownerId)

      expect(mockPrismaClient.tenant.findMany).toHaveBeenCalledWith({
        where: {
          Lease: {
            some: {
              Unit: {
                Property: {
                  ownerId: ownerId
                }
              }
            }
          }
        },
        include: {
          Lease: {
            include: {
              Unit: {
                include: {
                  Property: true
                }
              }
            }
          }
        },
        take: 50,
        skip: 0,
        orderBy: {
          createdAt: 'desc'
        }
      })
      expect(result).toEqual(mockTenants)
    })

    it('should apply status filter when provided', async () => {
      const query = { status: 'ACTIVE' }
      mockPrismaClient.tenant.findMany.mockResolvedValue(mockTenants)

      await service.getTenantsByOwner(ownerId, query)

      expect(mockPrismaClient.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            Lease: {
              some: {
                Unit: {
                  Property: {
                    ownerId: ownerId
                  }
                }
              }
            }
          })
        })
      )
    })

    it('should apply search filter when provided', async () => {
      const query = { search: 'john' }
      mockPrismaClient.tenant.findMany.mockResolvedValue([mockTenants[0]])

      await service.getTenantsByOwner(ownerId, query)

      expect(mockPrismaClient.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } }
            ]
          })
        })
      )
    })

    it('should apply pagination parameters', async () => {
      const query = { limit: '10', offset: '20' }
      mockPrismaClient.tenant.findMany.mockResolvedValue(mockTenants)

      await service.getTenantsByOwner(ownerId, query)

      expect(mockPrismaClient.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20
        })
      )
    })

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')
      mockPrismaClient.tenant.findMany.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw new Error('Enhanced database error')
      })

      await expect(service.getTenantsByOwner(ownerId)).rejects.toThrow('Enhanced database error')

      expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith(error, {
        operation: 'getTenantsByOwner',
        resource: 'tenant',
        metadata: { ownerId }
      })
    })

    it('should return empty array when no tenants found', async () => {
      mockPrismaClient.tenant.findMany.mockResolvedValue([])

      const result = await service.getTenantsByOwner(ownerId)

      expect(result).toEqual([])
    })
  })

  describe('getTenantById', () => {
    const tenantId = 'tenant-123'
    const ownerId = 'owner-123'
    const mockTenant = {
      id: tenantId,
      email: 'tenant@test.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      Lease: [
        {
          id: 'lease-1',
          Unit: {
            id: 'unit-1',
            Property: {
              id: 'prop-1',
              name: 'Test Property',
              ownerId
            }
          }
        }
      ]
    }

    it('should return tenant by ID for owner', async () => {
      mockPrismaClient.tenant.findFirst.mockResolvedValue(mockTenant)

      const result = await service.getTenantById(tenantId, ownerId)

      expect(mockPrismaClient.tenant.findFirst).toHaveBeenCalledWith({
        where: {
          id: tenantId,
          Lease: {
            some: {
              Unit: {
                Property: {
                  ownerId: ownerId
                }
              }
            }
          }
        },
        include: {
          Lease: {
            include: {
              Unit: {
                include: {
                  Property: true
                }
              }
            }
          }
        }
      })
      expect(result).toEqual(mockTenant)
    })

    it('should return null when tenant not found', async () => {
      mockPrismaClient.tenant.findFirst.mockResolvedValue(null)

      const result = await service.getTenantById(tenantId, ownerId)

      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockPrismaClient.tenant.findFirst.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw new Error('Enhanced error')
      })

      await expect(service.getTenantById(tenantId, ownerId)).rejects.toThrow('Enhanced error')
    })
  })

  describe('createTenant', () => {
    const ownerId = 'owner-123'
    const createTenantDto = {
      email: 'newtenant@test.com',
      firstName: 'New',
      lastName: 'Tenant',
      phone: '+1111111111'
    }
    const mockCreatedTenant = {
      id: 'tenant-new',
      ...createTenantDto,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should create a new tenant', async () => {
      mockPrismaClient.tenant.create.mockResolvedValue(mockCreatedTenant)

      const result = await service.createTenant(createTenantDto, ownerId)

      expect(mockPrismaClient.tenant.create).toHaveBeenCalledWith({
        data: {
          ...createTenantDto,
          status: 'PENDING'
        }
      })
      expect(result).toEqual(mockCreatedTenant)
    })

    it('should handle email uniqueness violations', async () => {
      const error = new Error('Unique constraint failed')
      error.code = 'P2002'
      mockPrismaClient.tenant.create.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw new Error('Email already exists')
      })

      await expect(service.createTenant(createTenantDto, ownerId)).rejects.toThrow('Email already exists')
    })

    it('should validate required fields', async () => {
      const invalidDto = { email: '', firstName: '', lastName: '' }
      const validationError = new Error('Validation failed')
      mockPrismaClient.tenant.create.mockRejectedValue(validationError)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw validationError
      })

      await expect(service.createTenant(invalidDto, ownerId)).rejects.toThrow('Validation failed')
    })
  })

  describe('updateTenant', () => {
    const tenantId = 'tenant-123'
    const ownerId = 'owner-123'
    const updateDto = {
      firstName: 'Updated',
      phone: '+1999999999'
    }
    const mockUpdatedTenant = {
      id: tenantId,
      email: 'tenant@test.com',
      firstName: 'Updated',
      lastName: 'Doe',
      phone: '+1999999999',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should update tenant information', async () => {
      mockPrismaClient.tenant.update.mockResolvedValue(mockUpdatedTenant)

      const result = await service.updateTenant(tenantId, updateDto, ownerId)

      expect(mockPrismaClient.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: updateDto
      })
      expect(result).toEqual(mockUpdatedTenant)
    })

    it('should handle tenant not found', async () => {
      const error = new Error('Record not found')
      error.code = 'P2025'
      mockPrismaClient.tenant.update.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw new Error('Tenant not found')
      })

      await expect(service.updateTenant(tenantId, updateDto, ownerId)).rejects.toThrow('Tenant not found')
    })
  })

  describe('deleteTenant', () => {
    const tenantId = 'tenant-123'
    const ownerId = 'owner-123'

    it('should delete a tenant', async () => {
      mockPrismaClient.tenant.delete.mockResolvedValue({
        id: tenantId,
        email: 'tenant@test.com'
      })

      await service.deleteTenant(tenantId, ownerId)

      expect(mockPrismaClient.tenant.delete).toHaveBeenCalledWith({
        where: { id: tenantId }
      })
    })

    it('should handle tenant not found during deletion', async () => {
      const error = new Error('Record not found')
      error.code = 'P2025'
      mockPrismaClient.tenant.delete.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw new Error('Tenant not found')
      })

      await expect(service.deleteTenant(tenantId, ownerId)).rejects.toThrow('Tenant not found')
    })

    it('should handle foreign key constraints', async () => {
      const error = new Error('Foreign key constraint')
      error.code = 'P2003'
      mockPrismaClient.tenant.delete.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw new Error('Cannot delete tenant with active leases')
      })

      await expect(service.deleteTenant(tenantId, ownerId)).rejects.toThrow('Cannot delete tenant with active leases')
    })
  })

  describe('Edge cases and security', () => {
    it('should enforce owner isolation', async () => {
      const tenantId = 'tenant-123'
      const wrongOwnerId = 'wrong-owner'

      mockPrismaClient.tenant.findFirst.mockResolvedValue(null)

      const result = await service.getTenantById(tenantId, wrongOwnerId)

      expect(result).toBeNull()
      expect(mockPrismaClient.tenant.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: tenantId,
            Lease: {
              some: {
                Unit: {
                  Property: {
                    ownerId: wrongOwnerId
                  }
                }
              }
            }
          })
        })
      )
    })

    it('should handle malformed input gracefully', async () => {
      const invalidId = 'not-a-uuid'
      const error = new Error('Invalid input syntax for type uuid')
      mockPrismaClient.tenant.findFirst.mockRejectedValue(error)
      mockErrorHandler.handleErrorEnhanced.mockImplementation(() => {
        throw new Error('Invalid tenant ID format')
      })

      await expect(service.getTenantById(invalidId, 'owner-123')).rejects.toThrow('Invalid tenant ID format')
    })

    it('should handle large result sets with pagination', async () => {
      const ownerId = 'owner-123'
      const query = { limit: '1000', offset: '0' }
      
      // Should cap limit to reasonable maximum
      mockPrismaClient.tenant.findMany.mockResolvedValue([])

      await service.getTenantsByOwner(ownerId, query)

      expect(mockPrismaClient.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100 // Should be capped to reasonable limit
        })
      )
    })
  })
})