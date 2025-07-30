import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TenantsService } from './tenants.service'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { mockPrismaService, mockErrorHandler } from '../test/setup'

// Mock dependencies are imported from test setup

describe('TenantsService', () => {
  let tenantsService: TenantsService
  let prismaService: PrismaService
  let errorHandler: ErrorHandlerService

  const mockTenant = {
    id: 'tenant-123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    emergencyContact: '+0987654321',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    User: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatarUrl: 'https://example.com/avatar.jpg'
    },
    Lease: [
      {
        id: 'lease-123',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        Unit: {
          id: 'unit-123',
          unitNumber: '101',
          Property: {
            id: 'property-123',
            name: 'Test Property',
            address: '123 Test St',
            city: 'Test City',
            state: 'TX'
          }
        }
      }
    ]
  }

  const mockTenantStats = {
    totalTenants: 10,
    activeTenants: 8
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    prismaService = mockPrismaService as any
    errorHandler = mockErrorHandler as any
    
    tenantsService = new TenantsService(
      prismaService,
      errorHandler
    )
  })

  describe('getTenantsByOwner', () => {
    it('should return tenants for owner with default query', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([mockTenant])

      const result = await tenantsService.getTenantsByOwner('owner-123')

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith({
        where: {
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
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          },
          Lease: {
            where: {
              Unit: {
                Property: {
                  ownerId: 'owner-123'
                }
              }
            },
            include: {
              Unit: {
                include: {
                  Property: {
                    select: {
                      id: true,
                      name: true,
                      address: true,
                      city: true,
                      state: true
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      expect(result).toEqual([mockTenant])
    })

    it('should handle search query parameters', async () => {
      const query = {
        search: 'john',
        limit: '10',
        offset: '0'
      }

      mockPrismaService.tenant.findMany.mockResolvedValue([mockTenant])

      await tenantsService.getTenantsByOwner('owner-123', query)

      // Verify the method was called with search parameters
      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledTimes(1)
      const callArgs = mockPrismaService.tenant.findMany.mock.calls[0][0]
      expect(callArgs.take).toBe(10)
      expect(callArgs.skip).toBe(0)
      expect(callArgs.where.Lease).toBeDefined()
      // Verify search logic was applied
      expect(callArgs.where.AND || callArgs.where.OR).toBeDefined()
    })

    it('should handle pagination parameters', async () => {
      const query = {
        limit: '5',
        offset: '15'
      }

      mockPrismaService.tenant.findMany.mockResolvedValue([])

      await tenantsService.getTenantsByOwner('owner-123', query)

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 15
        })
      )
    })

    it('should handle invalid pagination parameters gracefully', async () => {
      const query = {
        limit: 'invalid',
        offset: 'invalid'
      }

      mockPrismaService.tenant.findMany.mockResolvedValue([])

      await tenantsService.getTenantsByOwner('owner-123', query)

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
          include: expect.any(Object),
          orderBy: expect.any(Object)
          // No take/skip properties for invalid values
        })
      )
    })
  })

  describe('getTenantById', () => {
    it('should return tenant when found', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(mockTenant)

      const result = await tenantsService.getTenantById('tenant-123', 'owner-123')

      expect(mockPrismaService.tenant.findFirst).toHaveBeenCalledWith({
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
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true
            }
          },
          Lease: {
            where: {
              Unit: {
                Property: {
                  ownerId: 'owner-123'
                }
              }
            },
            include: {
              Unit: {
                include: {
                  Property: {
                    select: {
                      id: true,
                      name: true,
                      address: true,
                      city: true,
                      state: true
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      })
      expect(result).toEqual(mockTenant)
    })

    it('should validate input parameters', async () => {
      mockErrorHandler.createValidationError.mockReturnValue(new Error('Invalid parameters'))

      await expect(tenantsService.getTenantById('', 'owner-123'))
        .rejects.toThrow('Invalid parameters')

      expect(mockErrorHandler.createValidationError).toHaveBeenCalledWith(
        'Invalid parameters: id and ownerId must be valid strings',
        { id: 'string', ownerId: 'string' },
        { operation: 'getTenantById', resource: 'tenant' }
      )
    })

    it('should validate parameter types', async () => {
      mockErrorHandler.createValidationError.mockReturnValue(new Error('Invalid parameter types'))

      await expect(tenantsService.getTenantById(123 as any, 'owner-123'))
        .rejects.toThrow('Invalid parameter types')

      expect(mockErrorHandler.createValidationError).toHaveBeenCalledWith(
        'Invalid parameters: id and ownerId must be valid strings',
        { id: 'number', ownerId: 'string' },
        { operation: 'getTenantById', resource: 'tenant' }
      )
    })
  })

  describe('getTenantByIdOrThrow', () => {
    it('should return tenant when found', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(mockTenant)

      const result = await tenantsService.getTenantByIdOrThrow('tenant-123', 'owner-123')

      expect(result).toEqual(mockTenant)
    })

    it('should throw not found error when tenant does not exist', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(null)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Tenant not found'))

      await expect(tenantsService.getTenantByIdOrThrow('tenant-123', 'owner-123'))
        .rejects.toThrow('Tenant not found')

      expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith('Tenant', 'tenant-123')
    })
  })

  describe('createTenant', () => {
    const mockTenantData = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1234567890',
      emergencyContact: '+0987654321'
    }

    it('should create tenant successfully', async () => {
      const expectedTenant = {
        ...mockTenant,
        ...mockTenantData
      }

      mockPrismaService.tenant.create.mockResolvedValue(expectedTenant)

      const result = await tenantsService.createTenant(mockTenantData, 'owner-123')

      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith({
        data: mockTenantData,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      })
      expect(result).toEqual(expectedTenant)
    })

    it('should handle minimal tenant data', async () => {
      const minimalData = {
        name: 'Minimal Tenant',
        email: 'minimal@example.com'
      }

      mockPrismaService.tenant.create.mockResolvedValue({
        ...mockTenant,
        ...minimalData,
        phone: null,
        emergencyContact: null
      })

      const result = await tenantsService.createTenant(minimalData, 'owner-123')

      expect(mockPrismaService.tenant.create).toHaveBeenCalledWith({
        data: minimalData,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      })
      expect(result.phone).toBeNull()
      expect(result.emergencyContact).toBeNull()
    })
  })

  describe('updateTenant', () => {
    const mockUpdateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
      phone: '+1111111111',
      emergencyContact: '+2222222222'
    }

    it('should update tenant successfully', async () => {
      const updatedTenant = {
        ...mockTenant,
        ...mockUpdateData,
        updatedAt: new Date()
      }

      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant)

      const result = await tenantsService.updateTenant('tenant-123', mockUpdateData, 'owner-123')

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
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
        data: {
          ...mockUpdateData,
          updatedAt: expect.any(Date)
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      })
      expect(result).toEqual(updatedTenant)
    })

    it('should handle partial updates', async () => {
      const partialUpdate = {
        name: 'Only Name Update'
      }

      mockPrismaService.tenant.update.mockResolvedValue({
        ...mockTenant,
        name: 'Only Name Update',
        updatedAt: new Date()
      })

      await tenantsService.updateTenant('tenant-123', partialUpdate, 'owner-123')

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: 'Only Name Update',
            updatedAt: expect.any(Date)
          }
        })
      )
    })
  })

  describe('deleteTenant', () => {
    it('should delete tenant when no active leases exist', async () => {
      const tenantWithoutActiveLeases = {
        ...mockTenant,
        Lease: [] // No active leases
      }

      mockPrismaService.tenant.findFirst.mockResolvedValue(tenantWithoutActiveLeases)
      mockPrismaService.tenant.delete.mockResolvedValue(tenantWithoutActiveLeases)

      const result = await tenantsService.deleteTenant('tenant-123', 'owner-123')

      expect(mockPrismaService.tenant.findFirst).toHaveBeenCalledWith({
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
        include: {
          Lease: {
            where: {
              status: 'ACTIVE'
            }
          }
        }
      })

      expect(mockPrismaService.tenant.delete).toHaveBeenCalledWith({
        where: {
          id: 'tenant-123'
        }
      })

      expect(result).toEqual(tenantWithoutActiveLeases)
    })

    it('should validate input parameters', async () => {
      mockErrorHandler.createValidationError.mockReturnValue(new Error('Invalid parameters'))

      await expect(tenantsService.deleteTenant('', 'owner-123'))
        .rejects.toThrow('Invalid parameters')

      expect(mockErrorHandler.createValidationError).toHaveBeenCalledWith(
        'Invalid parameters: id and ownerId must be valid strings',
        { id: 'string', ownerId: 'string' },
        { operation: 'deleteTenant', resource: 'tenant' }
      )
    })

    it('should throw not found error when tenant does not exist', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(null)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Tenant not found'))

      await expect(tenantsService.deleteTenant('tenant-123', 'owner-123'))
        .rejects.toThrow('Tenant not found')

      expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith(
        'Tenant',
        undefined,
        { operation: 'deleteTenant', resource: 'tenant' }
      )
    })

    it('should throw conflict error when tenant has active leases', async () => {
      const tenantWithActiveLeases = {
        ...mockTenant,
        Lease: [
          { id: 'lease-1', status: 'ACTIVE' },
          { id: 'lease-2', status: 'ACTIVE' }
        ]
      }

      mockPrismaService.tenant.findFirst.mockResolvedValue(tenantWithActiveLeases)
      mockErrorHandler.createBusinessError.mockReturnValue(new Error('Cannot delete tenant with active leases'))

      await expect(tenantsService.deleteTenant('tenant-123', 'owner-123'))
        .rejects.toThrow('Cannot delete tenant with active leases')

      expect(mockErrorHandler.createBusinessError).toHaveBeenCalledWith(
        ErrorCode.CONFLICT,
        'Cannot delete tenant with active leases',
        { operation: 'deleteTenant', resource: 'tenant', metadata: { leaseCount: 2 } }
      )
    })
  })

  describe('getTenantStats', () => {
    it('should return tenant statistics', async () => {
      mockPrismaService.tenant.count
        .mockResolvedValueOnce(10) // total tenants
        .mockResolvedValueOnce(8)  // active tenants

      const result = await tenantsService.getTenantStats('owner-123')

      expect(mockPrismaService.tenant.count).toHaveBeenCalledTimes(2)
      expect(mockPrismaService.tenant.count).toHaveBeenNthCalledWith(1, {
        where: {
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
      expect(mockPrismaService.tenant.count).toHaveBeenNthCalledWith(2, {
        where: {
          Lease: {
            some: {
              status: 'ACTIVE',
              Unit: {
                Property: {
                  ownerId: 'owner-123'
                }
              }
            }
          }
        }
      })

      expect(result).toEqual({
        totalTenants: 10,
        activeTenants: 8
      })
    })

    it('should validate owner ID parameter', async () => {
      mockErrorHandler.createValidationError.mockReturnValue(new Error('Invalid owner ID'))

      await expect(tenantsService.getTenantStats(''))
        .rejects.toThrow('Invalid owner ID')

      expect(mockErrorHandler.createValidationError).toHaveBeenCalledWith(
        'Invalid owner ID: must be a valid string',
        { ownerId: 'string' },
        { operation: 'getTenantStats', resource: 'tenant' }
      )
    })
  })

  describe('findOne', () => {
    it('should return tenant when found', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(mockTenant)

      const result = await tenantsService.findOne('tenant-123', 'owner-123')

      expect(result).toEqual(mockTenant)
    })

    it('should throw not found error when tenant does not exist', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(null)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Tenant not found'))

      await expect(tenantsService.findOne('tenant-123', 'owner-123'))
        .rejects.toThrow('Tenant not found')

      expect(mockErrorHandler.createNotFoundError).toHaveBeenCalledWith(
        'Tenant',
        undefined,
        { operation: 'findOne', resource: 'tenant' }
      )
    })
  })

  describe('addDocument', () => {
    const mockDocumentData = {
      url: 'https://example.com/document.pdf',
      filename: 'lease-agreement.pdf',
      mimeType: 'application/pdf',
      documentType: 'lease',
      size: 1024000
    }

    it('should add document to tenant', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(mockTenant)

      const result = await tenantsService.addDocument('tenant-123', mockDocumentData, 'owner-123')

      expect(mockPrismaService.tenant.findFirst).toHaveBeenCalled()
      expect(result).toEqual({
        id: expect.any(String),
        tenantId: 'tenant-123',
        ...mockDocumentData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    })

    it('should verify tenant ownership before adding document', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(null)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Tenant not found'))

      await expect(tenantsService.addDocument('tenant-123', mockDocumentData, 'owner-123'))
        .rejects.toThrow('Tenant not found')
    })
  })

  describe('removeDocument', () => {
    it('should remove document from tenant', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(mockTenant)

      const result = await tenantsService.removeDocument('tenant-123', 'doc-123', 'owner-123')

      expect(mockPrismaService.tenant.findFirst).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        message: 'Document removed successfully'
      })
    })

    it('should verify tenant ownership before removing document', async () => {
      mockPrismaService.tenant.findFirst.mockResolvedValue(null)
      mockErrorHandler.createNotFoundError.mockReturnValue(new Error('Tenant not found'))

      await expect(tenantsService.removeDocument('tenant-123', 'doc-123', 'owner-123'))
        .rejects.toThrow('Tenant not found')
    })
  })

  describe('Alias method - getStats', () => {
    it('should call getTenantStats', async () => {
      mockPrismaService.tenant.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4)

      const result = await tenantsService.getStats('owner-123')

      expect(result).toEqual({
        totalTenants: 5,
        activeTenants: 4
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockPrismaService.tenant.findMany.mockRejectedValue(dbError)

      await expect(tenantsService.getTenantsByOwner('owner-123'))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle empty search results', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([])

      const result = await tenantsService.getTenantsByOwner('owner-123')

      expect(result).toEqual([])
    })

    it('should handle special characters in search query', async () => {
      const query = { search: "John's O'Reilly" }
      
      mockPrismaService.tenant.findMany.mockResolvedValue([])

      await tenantsService.getTenantsByOwner('owner-123', query)

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  {
                    name: {
                      contains: "John's O'Reilly",
                      mode: 'insensitive'
                    }
                  },
                  {
                    email: {
                      contains: "John's O'Reilly",
                      mode: 'insensitive'
                    }
                  },
                  {
                    phone: {
                      contains: "John's O'Reilly",
                      mode: 'insensitive'
                    }
                  }
                ]
              }
            ]
          })
        })
      )
    })

    it('should handle very large offset values', async () => {
      const query = { offset: '999999' }
      
      mockPrismaService.tenant.findMany.mockResolvedValue([])

      await tenantsService.getTenantsByOwner('owner-123', query)

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 999999
        })
      )
    })

    it('should handle concurrent tenant operations', async () => {
      // Set up mock before creating promises
      mockPrismaService.tenant.findFirst
        .mockResolvedValueOnce({ ...mockTenant, id: 'tenant-1' })
        .mockResolvedValueOnce({ ...mockTenant, id: 'tenant-2' })
        .mockResolvedValueOnce({ ...mockTenant, id: 'tenant-3' })

      const promises = [
        tenantsService.getTenantById('tenant-1', 'owner-123'),
        tenantsService.getTenantById('tenant-2', 'owner-123'),
        tenantsService.getTenantById('tenant-3', 'owner-123')
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      expect(results[0].id).toBe('tenant-1')
      expect(results[1].id).toBe('tenant-2')
      expect(results[2].id).toBe('tenant-3')
    })
  })
})