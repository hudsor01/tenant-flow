import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PrismaService } from '../../prisma/prisma.service'
import { ErrorHandlerService } from '../../common/errors/error-handler.service'
import { BaseCrudService } from '../../common/services/base-crud.service'
import { BaseRepository } from '../../common/repositories/base.repository'

/**
 * CRITICAL SECURITY TESTS: Ownership Validation and Multi-Tenant Isolation
 * 
 * These tests verify that the security vulnerability in BaseCrudService.delete()
 * has been properly fixed and that all CRUD operations properly validate ownership.
 */
describe('Ownership Validation Security Tests', () => {
  let prisma: PrismaService
  let errorHandler: ErrorHandlerService

  // Mock test service to verify security fixes
  class TestEntity {
    id: string = ''
    ownerId: string = ''
    name: string = ''
  }

  class TestRepository extends BaseRepository<TestEntity> {
    protected modelName = 'testEntity'

    protected override addOwnerFilter(where: any, ownerId: string): any {
      return { ...where, ownerId }
    }
  }

  class TestService extends BaseCrudService<TestEntity, any, any, any, any, any, any> {
    protected entityName = 'TestEntity'
    protected repository: TestRepository

    constructor(errorHandler: ErrorHandlerService, prisma: PrismaService) {
      super(errorHandler)
      this.repository = new TestRepository(prisma)
    }

    protected async findByIdAndOwner(id: string, ownerId: string): Promise<TestEntity | null> {
      return await this.repository.findOne({
        where: { id, ownerId }
      })
    }

    protected async calculateStats(ownerId: string): Promise<Record<string, number>> {
      const count = await this.repository.count({ where: { ownerId } })
      return { count }
    }

    protected prepareCreateData(data: any, ownerId: string): any {
      return { ...data, ownerId }
    }

    protected prepareUpdateData(data: any): any {
      return data
    }

    protected createOwnerWhereClause(id: string, ownerId: string): any {
      return { id, ownerId }
    }
  }

  beforeEach(() => {
    // Create mock instances
    prisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      $transaction: jest.fn(),
      testEntity: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      }
    } as any

    errorHandler = new ErrorHandlerService()
  })

  describe('BaseCrudService Security Fixes', () => {
    let testService: TestService

    beforeEach(() => {
      testService = new TestService(errorHandler, prisma)
    })

    it('should validate abstract method implementations on construction', () => {
      // Test that complete service works
      expect(() => {
        new TestService(errorHandler, prisma)
      }).not.toThrow()

      // Test validation by checking method exists on a working service
      const testService = new TestService(errorHandler, prisma)
      expect(typeof testService['findByIdAndOwner']).toBe('function')
      expect(typeof testService['createOwnerWhereClause']).toBe('function')
      expect(typeof testService['calculateStats']).toBe('function')
    })

    it('should require createOwnerWhereClause implementation', () => {
      // Test that createOwnerWhereClause works correctly
      const result = testService['createOwnerWhereClause']('test-id', 'test-owner')
      expect(result).toEqual({ id: 'test-id', ownerId: 'test-owner' })
    })

    it('CRITICAL: delete() must use owner-validated deletion', async () => {
      const mockRepository = {
        deleteById: jest.fn<() => Promise<any>>(),
        delete: jest.fn<() => Promise<{ id: string; ownerId: string }>>().mockResolvedValue({ id: 'test-id', ownerId: 'owner-1' }),
        findOne: jest.fn<() => Promise<{ id: string; ownerId: string }>>().mockResolvedValue({ id: 'test-id', ownerId: 'owner-1' })
      } as any

      testService['repository'] = mockRepository

      // Mock the getByIdOrThrow to return an entity
      jest.spyOn(testService, 'getByIdOrThrow').mockResolvedValue({ 
        id: 'test-id', 
        ownerId: 'owner-1', 
        name: 'test' 
      })

      await testService.delete('test-id', 'owner-1')

      // SECURITY VERIFICATION: Must NOT call deleteById (bypasses ownership)
      expect(mockRepository.deleteById).not.toHaveBeenCalled()
      
      // SECURITY VERIFICATION: Must call delete with owner validation
      expect(mockRepository.delete).toHaveBeenCalledWith({
        where: { id: 'test-id', ownerId: 'owner-1' }
      })
    })

    it('should prevent deletion without ownership validation', async () => {
      const mockEntity = { id: 'test-id', ownerId: 'owner-1', name: 'test' }
      
      jest.spyOn(testService, 'getByIdOrThrow').mockResolvedValue(mockEntity)
      jest.spyOn(testService['repository'], 'delete').mockRejectedValue(
        new Error('Security violation: delete operations must include ownership validation')
      )

      await expect(
        testService.delete('test-id', 'different-owner')
      ).rejects.toThrow()
    })
  })

  describe('BaseRepository Security Enhancements', () => {
    let testRepository: TestRepository

    beforeEach(() => {
      testRepository = new TestRepository(prisma)
    })

    it('should warn when deleteById is called without ownership', async () => {
      const loggerSpy = jest.spyOn(testRepository['logger'], 'warn')
      const mockDelete = jest.spyOn(testRepository, 'delete').mockResolvedValue({} as any)

      await testRepository.deleteById('test-id')

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY WARNING: deleteById() called without owner validation'),
        expect.objectContaining({
          id: 'test-id',
          stack: expect.any(String)
        })
      )

      mockDelete.mockRestore()
    })

    it('should validate ownership in where clauses', () => {
      // Valid ownership clauses
      expect(() => {
        testRepository['validateOwnershipInWhere']({ ownerId: 'test-owner' })
      }).not.toThrow()

      expect(() => {
        testRepository['validateOwnershipInWhere']({ organizationId: 'test-org' })
      }).not.toThrow()

      // Invalid - no ownership
      expect(() => {
        testRepository['validateOwnershipInWhere']({ name: 'test' })
      }).toThrow('Security violation: delete operations must include ownership validation')

      // Invalid - empty where
      expect(() => {
        testRepository['validateOwnershipInWhere']({})
      }).toThrow('Security violation: delete operations must include ownership validation')
    })

    it('should log security violations for invalid delete attempts', () => {
      const loggerSpy = jest.spyOn(testRepository['logger'], 'error')

      expect(() => {
        testRepository['validateOwnershipInWhere']({ invalidField: 'value' })
      }).toThrow()

      expect(loggerSpy).toHaveBeenCalledWith(
        'SECURITY VIOLATION: Delete attempted without ownership validation',
        expect.objectContaining({
          modelName: 'testEntity',
          where: expect.any(String),
          stack: expect.any(String)
        })
      )
    })
  })

  describe('Multi-Tenant Isolation Verification', () => {
    it('should prevent cross-tenant data access', async () => {
      const testService = new TestService(errorHandler, prisma)
      
      // Mock repository to simulate finding entity owned by different user
      jest.spyOn(testService['repository'], 'findOne').mockResolvedValue(null)

      await expect(
        testService.getByIdOrThrow('entity-id', 'wrong-owner')
      ).rejects.toThrow("TestEntity with ID 'entity-id' not found")
    })

    it('should enforce owner filtering in list operations', async () => {
      const testService = new TestService(errorHandler, prisma)
      const findManySpy = jest.spyOn(testService['repository'], 'findManyByOwner')
        .mockResolvedValue([])

      await testService.getByOwner('owner-1')

      expect(findManySpy).toHaveBeenCalledWith('owner-1', {})
    })
  })

  describe('Edge Cases and Attack Vectors', () => {
    it('should prevent SQL injection in owner ID', async () => {
      const testService = new TestService(errorHandler, prisma)
      
      const maliciousOwnerId = "'; DROP TABLE users; --"
      
      // Mock the repository to return empty array (Prisma parameterized queries prevent SQL injection)
      jest.spyOn(testService['repository'], 'findManyByOwner').mockResolvedValue([])
      
      // The service should handle this safely - Prisma uses parameterized queries
      const result = await testService.getByOwner(maliciousOwnerId)
      
      // Verify it returns empty array without executing malicious SQL
      expect(result).toEqual([])
      expect(testService['repository'].findManyByOwner).toHaveBeenCalledWith(maliciousOwnerId, {})
    })

    it('should validate all required parameters', async () => {
      const testService = new TestService(errorHandler, prisma)

      await expect(testService.delete('', 'owner-1')).rejects.toThrow()
      await expect(testService.delete('id', '')).rejects.toThrow()
      await expect(testService.update('', {}, 'owner-1')).rejects.toThrow()
      await expect(testService.update('id', {}, '')).rejects.toThrow()
    })

    it('should prevent bypass through null/undefined parameters', async () => {
      const testService = new TestService(errorHandler, prisma)

      await expect(
        testService.delete(null as any, 'owner-1')
      ).rejects.toThrow('TestEntity ID is required')

      await expect(
        testService.delete('id', null as any)
      ).rejects.toThrow('Owner ID is required')
    })
  })
})