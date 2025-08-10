/**
 * Integration test to validate BaseCrudService design
 * This ensures the abstraction works correctly with real implementations
 */

import { Test, TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { BaseCrudService, BaseQueryOptions, BaseStats } from './base-crud.service'
import { BaseRepository } from '../repositories/base.repository'
import { ErrorHandlerService } from '../errors/error-handler.service'
import { NotFoundException, ValidationException } from '../exceptions/base.exception'
import { ServiceContractValidator, ServiceTestValidator } from './service-contract.validator'

// Mock entity types for testing
interface TestEntity {
  id: string
  ownerId: string
  name: string
  status: string
  createdAt: Date
  updatedAt: Date
}

interface TestCreateDto {
  name: string
  status?: string
}

interface TestUpdateDto {
  name?: string
  status?: string
}

interface TestQueryDto extends BaseQueryOptions {
  status?: string
}

interface TestStats extends BaseStats {
  total: number
  active: number
  inactive: number
}

// Mock repository
class MockTestRepository extends BaseRepository<TestEntity> {
  protected readonly modelName = 'testEntity'
  
  private entities: TestEntity[] = []
  
  constructor(prismaService?: any) {
    // Call parent constructor with mock or undefined
    super(prismaService || {} as any)
  }
  
  // Override the model getter to avoid Prisma client access
  protected override get model(): any {
    return {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    }
  }

  override async findByIdAndOwner(id: string, ownerId: string): Promise<TestEntity | null> {
    return this.entities.find(e => e.id === id && e.ownerId === ownerId) || null
  }

  override async findManyByOwner(ownerId: string, options: any = {}): Promise<TestEntity[]> {
    let filtered = this.entities.filter(e => e.ownerId === ownerId)
    
    if (options.status) {
      filtered = filtered.filter(e => e.status === options.status)
    }
    
    if (options.search) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(options.search.toLowerCase())
      )
    }
    
    if (options.limit) {
      filtered = filtered.slice(0, options.limit)
    }
    
    return filtered
  }

  override async create(options: { data: any }): Promise<TestEntity> {
    const entity: TestEntity = {
      ...options.data,
      id: `id-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    this.entities.push(entity)
    return entity
  }

  override async update(options: { where: any; data: any }): Promise<TestEntity> {
    const index = this.entities.findIndex(e => 
      e.id === options.where.id && e.ownerId === options.where.ownerId
    )
    
    if (index === -1) {
      throw new Error('Entity not found')
    }
    
    this.entities[index] = {
      ...this.entities[index],
      ...options.data,
      updatedAt: new Date()
    }
    
    const result = this.entities[index]
    if (!result) {
      throw new Error('Entity not found after update')
    }
    return result
  }

  override async deleteById(id: string): Promise<TestEntity> {
    const index = this.entities.findIndex(e => e.id === id)
    if (index === -1) {
      throw new Error('Entity not found')
    }
    
    const deleted = this.entities[index]
    if (!deleted) {
      throw new Error('Entity not found')
    }
    this.entities.splice(index, 1)
    return deleted
  }

  override async delete(options: { where: any }): Promise<TestEntity> {
    const index = this.entities.findIndex(e => 
      e.id === options.where.id && e.ownerId === options.where.ownerId
    )
    if (index === -1) {
      throw new Error('Entity not found')
    }
    
    const deleted = this.entities[index]
    if (!deleted) {
      throw new Error('Entity not found')
    }
    this.entities.splice(index, 1)
    return deleted
  }

  override async count(options: { where?: any } = {}): Promise<number> {
    if (!options.where) return this.entities.length
    
    return this.entities.filter(e => {
      if (options.where.ownerId && e.ownerId !== options.where.ownerId) {
        return false
      }
      return true
    }).length
  }

  // Helper methods for testing
  addTestEntity(entity: Partial<TestEntity>): TestEntity {
    const fullEntity: TestEntity = {
      id: `id-${Date.now()}`,
      ownerId: 'owner1',
      name: 'Test Entity',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...entity
    }
    this.entities.push(fullEntity)
    return fullEntity
  }

  clearEntities(): void {
    this.entities = []
  }
}

// Test service implementation
class TestCrudService extends BaseCrudService<
  TestEntity,
  TestCreateDto,
  TestUpdateDto,
  TestQueryDto,
  MockTestRepository
> {
  protected readonly entityName = 'TestEntity'

  constructor(
    protected readonly repository: MockTestRepository,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler)
  }

  protected async findByIdAndOwner(id: string, ownerId: string): Promise<TestEntity | null> {
    return await this.repository.findByIdAndOwner(id, ownerId)
  }

  protected async calculateStats(ownerId: string): Promise<TestStats> {
    const entities = await this.repository.findManyByOwner(ownerId)
    const total = entities.length
    const activeCount = entities.filter(e => e.status === 'active').length
    const inactiveCount = entities.filter(e => e.status === 'inactive').length

    return { 
      total, 
      active: activeCount,
      inactive: inactiveCount
    }
  }

  protected prepareCreateData(data: TestCreateDto, ownerId: string): any {
    return {
      ...data,
      ownerId,
      status: data.status || 'active'
    }
  }

  protected prepareUpdateData(data: TestUpdateDto): any {
    return {
      ...data,
      updatedAt: new Date()
    }
  }

  protected createOwnerWhereClause(id: string, ownerId: string): any {
    return { id, ownerId }
  }

  protected override validateCreateData(data: TestCreateDto): void {
    if (!data.name?.trim()) {
      throw new ValidationException('Name is required', 'name')
    }
  }

  protected override async validateDeletion(entity: TestEntity, _ownerId: string): Promise<void> {
    if (entity.status === 'protected') {
      throw new ValidationException('Cannot delete protected entity', 'status')
    }
  }
}

describe('BaseCrudService Integration Test', () => {
  let service: TestCrudService
  let repository: MockTestRepository
  let errorHandler: ErrorHandlerService
  let validator: ServiceContractValidator

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MockTestRepository,
          useFactory: () => new MockTestRepository()
        },
        {
          provide: ErrorHandlerService,
          useValue: {
            handleErrorEnhanced: jest.fn().mockImplementation((error) => { throw error })
          }
        }
      ]
    }).compile()

    repository = module.get<MockTestRepository>(MockTestRepository)
    errorHandler = module.get<ErrorHandlerService>(ErrorHandlerService)
    service = new TestCrudService(repository, errorHandler)
    validator = new ServiceContractValidator()

    // Clear any existing test data
    repository.clearEntities()
  })

  describe('Service Contract Validation', () => {
    it('should pass service contract validation', () => {
      const result = validator.validateService(service, 'TestCrudService')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should generate proper service metadata', () => {
      const metadata = validator.generateServiceMetadata(service, 'TestCrudService')
      
      expect(metadata.serviceName).toBe('TestCrudService')
      expect(metadata.entityName).toBe('TestEntity')
      expect(metadata.implementsAllAliases).toBe(true)
      expect(metadata.hasProperErrorHandling).toBe(true)
    })
  })

  describe('CRUD Operations', () => {
    it('should perform complete CRUD lifecycle', async () => {
      const ownerId = 'owner1'
      
      // 1. Create entity
      const createDto: TestCreateDto = { name: 'Test Entity', status: 'active' }
      const created = await service.create(createDto, ownerId)
      
      expect(created.id).toBeDefined()
      expect(created.ownerId).toBe(ownerId)
      expect(created.name).toBe('Test Entity')
      expect(created.status).toBe('active')

      // 2. Get by ID
      const retrieved = await service.getByIdOrThrow(created.id, ownerId)
      expect(retrieved).toEqual(created)

      // 3. Update entity
      const updateDto: TestUpdateDto = { name: 'Updated Entity' }
      const updated = await service.update(created.id, updateDto, ownerId)
      
      expect(updated.name).toBe('Updated Entity')
      expect(updated.status).toBe('active') // Should remain unchanged

      // 4. Get stats
      const stats = await service.getStats(ownerId)
      expect(stats.total).toBe(1)
      expect(stats.active).toBe(1)

      // 5. Delete entity
      const deleted = await service.delete(created.id, ownerId)
      expect(deleted.id).toBe(created.id)

      // 6. Verify deletion
      await expect(
        service.getByIdOrThrow(created.id, ownerId)
      ).rejects.toThrow(NotFoundException)
    })

    it('should handle getByOwner with filtering', async () => {
      const ownerId = 'owner1'
      
      // Create test entities
      await service.create({ name: 'Active Entity', status: 'active' }, ownerId)
      await service.create({ name: 'Inactive Entity', status: 'inactive' }, ownerId)
      await service.create({ name: 'Another Active', status: 'active' }, ownerId)

      // Get all entities
      const allEntities = await service.getByOwner(ownerId)
      expect(allEntities).toHaveLength(3)

      // Get filtered entities
      const activeEntities = await service.getByOwner(ownerId, { status: 'active' })
      expect(activeEntities).toHaveLength(2)
      expect(activeEntities.every(e => e.status === 'active')).toBe(true)

      // Test search
      const searchResults = await service.getByOwner(ownerId, { search: 'Another' })
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0]?.name).toBe('Another Active')

      // Test pagination
      const limitedResults = await service.getByOwner(ownerId, { limit: 2 })
      expect(limitedResults).toHaveLength(2)
    })
  })

  describe('Multi-tenancy', () => {
    it('should isolate data by owner', async () => {
      const owner1 = 'owner1'
      const owner2 = 'owner2'

      // Create entities for different owners
      await service.create({ name: 'Owner 1 Entity' }, owner1)
      await service.create({ name: 'Owner 2 Entity' }, owner2)

      // Verify isolation
      const owner1Entities = await service.getByOwner(owner1)
      const owner2Entities = await service.getByOwner(owner2)

      expect(owner1Entities).toHaveLength(1)
      expect(owner2Entities).toHaveLength(1)
      expect(owner1Entities[0]?.name).toBe('Owner 1 Entity')
      expect(owner2Entities[0]?.name).toBe('Owner 2 Entity')
    })

    it('should prevent cross-tenant access', async () => {
      const owner1 = 'owner1'
      const owner2 = 'owner2'

      // Create entity for owner1
      const entity = await service.create({ name: 'Owner 1 Entity' }, owner1)

      // Try to access with owner2 credentials
      await expect(
        service.getByIdOrThrow(entity.id, owner2)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('Validation', () => {
    it('should validate create data', async () => {
      await expect(
        service.create({ name: '' }, 'owner1')
      ).rejects.toThrow(ValidationException)

      await expect(
        service.create({ name: '   ' }, 'owner1')
      ).rejects.toThrow(ValidationException)
    })

    it('should validate deletion rules', async () => {
      const ownerId = 'owner1'
      
      // Create protected entity
      const entity = await service.create({ name: 'Protected', status: 'protected' }, ownerId)
      
      // Should prevent deletion
      await expect(
        service.delete(entity.id, ownerId)
      ).rejects.toThrow(ValidationException)
    })

    it('should validate query parameters', async () => {
      const ownerId = 'owner1'

      // Invalid limit
      await expect(
        service.getByOwner(ownerId, { limit: -1 })
      ).rejects.toThrow(ValidationException)

      await expect(
        service.getByOwner(ownerId, { limit: 1001 })
      ).rejects.toThrow(ValidationException)

      // Invalid offset
      await expect(
        service.getByOwner(ownerId, { offset: -1 })
      ).rejects.toThrow(ValidationException)

      // Valid parameters should work
      const entities = await service.getByOwner(ownerId, { limit: 10, offset: 0 })
      expect(entities).toBeDefined()
    })
  })

  describe('CRUD Methods', () => {
    it('should provide working CRUD methods', async () => {
      const ownerId = 'owner1'
      const entity = await service.create({ name: 'Test Entity' }, ownerId)

      // Test getByOwner method
      const entities = await service.getByOwner(ownerId)
      expect(entities).toHaveLength(1)

      // Test getByIdOrThrow method
      const foundEntity = await service.getByIdOrThrow(entity.id, ownerId)
      expect(foundEntity.id).toBe(entity.id)

      // Test getByIdOrThrow method
      const oneEntity = await service.getByIdOrThrow(entity.id, ownerId)
      expect(oneEntity.id).toBe(entity.id)

      // Test delete method
      const removed = await service.delete(entity.id, ownerId)
      expect(removed.id).toBe(entity.id)

      // Verify removal
      await expect(
        service.getByIdOrThrow(entity.id, ownerId)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const ownerId = 'owner1'
      
      // Mock repository to throw error
      jest.spyOn(repository, 'findManyByOwner').mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      await expect(service.getByOwner(ownerId)).rejects.toThrow('Database connection failed')
      
      // Verify error handler was called
      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          operation: 'getByOwner',
          resource: 'TestEntity',
          metadata: { ownerId }
        })
      )
    })

    it('should provide proper error context', async () => {
      const ownerId = 'owner1'
      const entityId = 'nonexistent'

      await expect(
        service.getByIdOrThrow(entityId, ownerId)
      ).rejects.toThrow(NotFoundException)

      expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
        expect.any(NotFoundException),
        expect.objectContaining({
          operation: 'getByIdOrThrow',
          resource: 'TestEntity',
          metadata: { id: entityId, ownerId }
        })
      )
    })
  })
})

describe('Service Contract Validator', () => {
  let validator: ServiceContractValidator
  let service: TestCrudService

  beforeEach(async () => {
    validator = new ServiceContractValidator()
    
    // Create a test service for the validator tests
    const mockRepository = new MockTestRepository()
    const mockErrorHandler = {
      handleErrorEnhanced: jest.fn().mockImplementation((error) => { throw error })
    } as any
    service = new TestCrudService(mockRepository, mockErrorHandler)
  })

  it('should detect missing methods', () => {
    // Create a mock service that appears to implement the interface but is missing methods
    const incompleteService = {
      getByOwner: () => Promise.resolve([]),
      getByIdOrThrow: () => Promise.resolve({}),
      getStats: () => Promise.resolve({}),
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
      delete: () => Promise.resolve({}),
      // Missing all alias methods intentionally
      entityName: 'Incomplete',
      repository: {},
      errorHandler: {},
      logger: {}
    } as any

    const result = validator.validateService(incompleteService, 'IncompleteService')
    
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(error => error.includes('Missing alias method'))).toBe(true)
  })

  it('should generate compliance report', () => {
    const services = {
      'CompleteService': service,
    }

    const testValidator = new ServiceTestValidator()
    const report = testValidator.generateComplianceReport(services)
    
    expect(report).toContain('CRUD Service Compliance Report')
    expect(report).toContain('**Total Services:** 1')
    expect(report).toContain('**Compliant:** 1')
    expect(report).toContain('CompleteService')
  })
})