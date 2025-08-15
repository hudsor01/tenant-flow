import { jest } from '@jest/globals'

/**
 * Factory for creating mock repositories with common CRUD methods
 * Reduces boilerplate in test files and ensures consistent mocking patterns
 */
export class MockRepositoryFactory {
  /**
   * Creates a mock repository with standard CRUD methods
   * @param additionalMethods - Additional methods specific to the repository
   * @returns Mock repository object with all methods as jest functions
   */
  static createCrudRepository(additionalMethods: string[] = []): Record<string, jest.Mock> {
    const defaultMethods = [
      // BaseCrudService required methods
      'findByIdAndOwner',
      'findManyByOwner',
      'create',
      'update',
      'delete',
      'getStatsByOwner',
      
      // Common repository methods
      'findById',
      'findOne',
      'findMany',
      'findAll',
      'save',
      'remove',
      'count',
      'exists'
    ]
    
    const allMethods = [...new Set([...defaultMethods, ...additionalMethods])]
    
    return allMethods.reduce((acc, method) => {
      acc[method] = jest.fn()
      return acc
    }, {} as Record<string, jest.Mock>)
  }

  /**
   * Creates a mock repository for TypeORM-style repositories
   * @param additionalMethods - Additional methods specific to the repository
   * @returns Mock repository with TypeORM-style methods
   */
  static createTypeOrmRepository(additionalMethods: string[] = []): Record<string, jest.Mock | object> {
    const typeOrmMethods = [
      'find',
      'findOne',
      'findOneBy',
      'findBy',
      'findAndCount',
      'findOneOrFail',
      'save',
      'remove',
      'delete',
      'update',
      'insert',
      'create',
      'merge',
      'preload',
      'count',
      'createQueryBuilder'
    ]
    
    const allMethods = [...new Set([...typeOrmMethods, ...additionalMethods])]
    
    return allMethods.reduce((acc, method) => {
      if (method === 'createQueryBuilder') {
        // Special handling for query builder
        acc[method] = jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orWhere: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          getMany: jest.fn(),
          getOne: jest.fn(),
          getCount: jest.fn(),
          getRawMany: jest.fn(),
          getRawOne: jest.fn()
        })
      } else {
        acc[method] = jest.fn()
      }
      return acc
    }, {} as Record<string, jest.Mock | object>)
  }

  /**
   * Creates a mock Prisma client with common methods
   * @param models - List of model names to create mocks for
   * @returns Mock Prisma client
   */
  static createPrismaClient(models: string[] = []): Record<string, jest.Mock | Record<string, jest.Mock>> {
    const prismaModelMethods = [
      'findUnique',
      'findFirst',
      'findMany',
      'create',
      'update',
      'upsert',
      'delete',
      'deleteMany',
      'updateMany',
      'count',
      'aggregate',
      'groupBy'
    ]
    
    const client: Record<string, jest.Mock | Record<string, jest.Mock>> = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn()
    }
    
    // Add model-specific methods
    models.forEach(model => {
      client[model] = prismaModelMethods.reduce((acc, method) => {
        acc[method] = jest.fn()
        return acc
      }, {} as Record<string, jest.Mock>)
    })
    
    return client
  }

  /**
   * Helper to setup common mock responses for a repository
   * @param repository - The mock repository to setup
   * @param config - Configuration for mock responses
   */
  static setupCommonMocks(
    repository: Record<string, jest.Mock>,
    config: {
      entity?: unknown,
      entities?: unknown[],
      stats?: unknown,
      throwOnDelete?: boolean
    } = {}
  ): void {
    const { 
      entity = { id: 'test-id' }, 
      entities = [entity],
      stats = { total: 1, active: 1, inactive: 0 },
      throwOnDelete = false
    } = config
    
    // Setup common responses
    if (repository.findByIdAndOwner) {
      repository.findByIdAndOwner.mockResolvedValue(entity as never)
    }
    if (repository.findManyByOwner) {
      repository.findManyByOwner.mockResolvedValue(entities as never)
    }
    if (repository.create) {
      repository.create.mockResolvedValue(entity as never)
    }
    if (repository.update) {
      repository.update.mockResolvedValue(entity as never)
    }
    if (repository.delete) {
      if (throwOnDelete) {
        repository.delete.mockRejectedValue(new Error('Cannot delete') as never)
      } else {
        repository.delete.mockResolvedValue(entity as never)
      }
    }
    if (repository.getStatsByOwner) {
      repository.getStatsByOwner.mockResolvedValue(stats as never)
    }
  }
}