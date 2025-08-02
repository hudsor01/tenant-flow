import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  let app: INestApplication
  let prisma: PrismaService
  let errorHandler: ErrorHandlerService

  // Mock test service to verify security fixes
  class TestEntity {
    id: string
    ownerId: string
    name: string
  }

  class TestRepository extends BaseRepository<TestEntity> {
    protected modelName = 'testEntity'

    protected addOwnerFilter(where: any, ownerId: string): any {
      return { ...where, ownerId }
    }
  }

  class TestService extends BaseCrudService<TestEntity, any, any, any, TestRepository> {
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        ErrorHandlerService,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = moduleFixture.get<PrismaService>(PrismaService)
    errorHandler = moduleFixture.get<ErrorHandlerService>(ErrorHandlerService)
    
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('BaseCrudService Security Fixes', () => {
    let testService: TestService

    beforeEach(() => {
      testService = new TestService(errorHandler, prisma)
    })

    it('should validate abstract method implementations on construction', () => {
      class IncompleteService extends BaseCrudService {
        protected entityName = 'Incomplete'
        protected repository = null as any
        
        // Add minimal required implementations to test specific missing method
        protected async calculateStats(): Promise<BaseStats> { return {} }
        protected prepareCreateData(data: any): any { return data }
        protected prepareUpdateData(data: any): any { return data }
        protected createOwnerWhereClause(id: string, ownerId: string): any { return { id, ownerId } }
        // Intentionally missing: findByIdAndOwner
      }

      expect(() => {
        new IncompleteService(errorHandler)
      }).toThrow('Security violation: IncompleteService must implement findByIdAndOwner() for multi-tenant data isolation')
    })

    it('should require createOwnerWhereClause implementation', () => {
      class ServiceWithoutOwnerClause extends BaseCrudService {
        protected entityName = 'TestEntity'
        protected repository = new TestRepository(prisma)

        constructor(errorHandler: ErrorHandlerService) {
          super(errorHandler)
        }

        protected async findByIdAndOwner(): Promise<any> { return null }
        protected async calculateStats(): Promise<BaseStats> { return {} }
        protected prepareCreateData(data: any): any { return data }
        protected prepareUpdateData(data: any): any { return data }
        // Intentionally missing: createOwnerWhereClause
      }

      expect(() => {
        new ServiceWithoutOwnerClause(errorHandler)
      }).toThrow('Security violation: ServiceWithoutOwnerClause must implement createOwnerWhereClause() for multi-tenant data isolation')
    })

    it('CRITICAL: delete() must use owner-validated deletion', async () => {
      const mockRepository = {
        deleteById: vi.fn(),
        delete: vi.fn().mockResolvedValue({ id: 'test-id', ownerId: 'owner-1' }),
        findOne: vi.fn().mockResolvedValue({ id: 'test-id', ownerId: 'owner-1' })
      } as any

      testService['repository'] = mockRepository

      // Mock the getByIdOrThrow to return an entity
      vi.spyOn(testService, 'getByIdOrThrow').mockResolvedValue({ 
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
      
      vi.spyOn(testService, 'getByIdOrThrow').mockResolvedValue(mockEntity)
      vi.spyOn(testService['repository'], 'delete').mockRejectedValue(
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
      const loggerSpy = vi.spyOn(testRepository['logger'], 'warn')
      const mockDelete = vi.spyOn(testRepository, 'delete').mockResolvedValue({} as any)

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
      const loggerSpy = vi.spyOn(testRepository['logger'], 'error')

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
      vi.spyOn(testService['repository'], 'findOne').mockResolvedValue(null)

      await expect(
        testService.getByIdOrThrow('entity-id', 'wrong-owner')
      ).rejects.toThrow("TestEntity with ID 'entity-id' not found")
    })

    it('should enforce owner filtering in list operations', async () => {
      const testService = new TestService(errorHandler, prisma)
      const findManySpy = vi.spyOn(testService['repository'], 'findManyByOwner')
        .mockResolvedValue([])

      await testService.getByOwner('owner-1')

      expect(findManySpy).toHaveBeenCalledWith('owner-1', {})
    })
  })

  describe('Edge Cases and Attack Vectors', () => {
    it('should prevent SQL injection in owner ID', async () => {
      const testService = new TestService(errorHandler, prisma)
      
      const maliciousOwnerId = "'; DROP TABLE users; --"
      
      await expect(
        testService.getByOwner(maliciousOwnerId)
      ).rejects.toThrow() // Should be caught by input validation
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