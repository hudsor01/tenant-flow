import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseRepository } from './base.repository'
import { mockPrismaClient, mockLogger } from '../../test/setup'
import { ErrorHandlerService } from '../errors/error-handler.service'

// Mock the ErrorHandlerService
vi.mock('../errors/error-handler.service', () => ({
  ErrorCode: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
    PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR',
    STORAGE_ERROR: 'STORAGE_ERROR',
    EMAIL_ERROR: 'EMAIL_ERROR',
    STRIPE_ERROR: 'STRIPE_ERROR',
    INVALID_INPUT: 'INVALID_INPUT'
  },
  ErrorHandlerService: vi.fn().mockImplementation(() => ({
    createBusinessError: vi.fn((code, message, context) => {
      const error = new Error(message)
      Object.assign(error, { code, context })
      return error
    }),
    createNotFoundError: vi.fn((resource, identifier, context) => {
      const message = identifier 
        ? `${resource} with ID '${identifier}' not found`
        : `${resource} not found`
      const error = new Error(message)
      Object.assign(error, { code: 'NOT_FOUND', type: 'NOT_FOUND_ERROR', resource, identifier, context })
      return error
    })
  }))
}))

// Test implementation of BaseRepository
class TestRepository extends BaseRepository {
  protected readonly modelName = 'testModel'
}

describe('BaseRepository', () => {
  let repository: TestRepository
  let mockModel: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock model that represents prisma.testModel
    mockModel = {
      findMany: vi.fn(),
      findFirst: vi.fn(), 
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
    
    // Mock the model getter to return our mock model
    vi.spyOn(TestRepository.prototype, 'model', 'get').mockReturnValue(mockModel)
    
    repository = new TestRepository(mockPrismaClient as any)
    // Mock the logger
    ;(repository as any).logger = mockLogger
  })

  describe('Constructor and initialization', () => {
    it('should initialize with PrismaService and Logger', () => {
      expect((repository as any).prisma).toBe(mockPrismaClient)
      expect((repository as any).logger).toBe(mockLogger)
    })

    it('should access model through getter', () => {
      const model = repository.model
      expect(model).toBe(mockModel)
    })
  })

  describe('findMany', () => {
    it('should find many records without options', async () => {
      const mockResults = [{ id: '1', name: 'test1' }, { id: '2', name: 'test2' }]
      mockModel.findMany.mockResolvedValue(mockResults)

      const result = await repository.findMany()

      expect(mockModel.findMany).toHaveBeenCalledWith({})
      expect(result).toEqual(mockResults)
    })

    it('should apply limit and offset correctly', async () => {
      const mockResults = [{ id: '1', name: 'test1' }]
      mockModel.findMany.mockResolvedValue(mockResults)

      await repository.findMany({ 
        limit: 10, 
        offset: 5,
        where: { active: true }
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { active: true },
        take: 10,
        skip: 5
      })
    })

    it('should handle include and select options', async () => {
      const mockResults = [{ id: '1', name: 'test1', relations: [] }]
      mockModel.findMany.mockResolvedValue(mockResults)

      await repository.findMany({
        include: { relations: true },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' }
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        include: { relations: true },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('findManyPaginated', () => {
    it('should return paginated results with default values', async () => {
      const mockItems = [{ id: '1', name: 'test1' }]
      const mockCount = 25
      
      mockModel.findMany.mockResolvedValue(mockItems)
      mockModel.count.mockResolvedValue(mockCount)

      const result = await repository.findManyPaginated()

      expect(result).toEqual({
        items: mockItems,
        total: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3
      })
    })

    it('should calculate offset from page correctly', async () => {
      mockModel.findMany.mockResolvedValue([])
      mockModel.count.mockResolvedValue(0)

      await repository.findManyPaginated({
        page: 3,
        limit: 15,
        where: { active: true }
      })

      // Page 3 with limit 15 should have offset 30
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { active: true },
        take: 15,
        skip: 30
      })
    })

    it('should prefer explicit offset over calculated page offset', async () => {
      mockModel.findMany.mockResolvedValue([])
      mockModel.count.mockResolvedValue(0)

      await repository.findManyPaginated({
        page: 2,
        limit: 10,
        offset: 25,
        where: { active: true }
      })

      // Explicit offset should override page calculation
      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { active: true },
        take: 10,
        skip: 25
      })
    })

    it('should execute findMany and count in parallel', async () => {
      const findManyPromise = Promise.resolve([{ id: '1' }])
      const countPromise = Promise.resolve(5)
      
      mockModel.findMany.mockReturnValue(findManyPromise)
      mockModel.count.mockReturnValue(countPromise)

      const promiseAllSpy = vi.spyOn(Promise, 'all')

      await repository.findManyPaginated({ page: 1, limit: 10 })

      expect(promiseAllSpy).toHaveBeenCalled()
    })
  })

  describe('findOne', () => {
    it('should find one record with where clause', async () => {
      const mockResult = { id: '1', name: 'test' }
      mockModel.findFirst.mockResolvedValue(mockResult)

      const result = await repository.findOne({
        where: { id: '1' },
        include: { relations: true }
      })

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { relations: true }
      })
      expect(result).toEqual(mockResult)
    })

    it('should return null when no record found', async () => {
      mockModel.findFirst.mockResolvedValue(null)

      const result = await repository.findOne({ where: { id: 'nonexistent' } })

      expect(result).toBeNull()
    })
  })

  describe('findById', () => {
    it('should find record by ID', async () => {
      const mockResult = { id: '1', name: 'test' }
      mockModel.findUnique.mockResolvedValue(mockResult)

      const result = await repository.findById('1')

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      })
      expect(result).toEqual(mockResult)
    })

    it('should include additional options', async () => {
      const mockResult = { id: '1', name: 'test', relations: [] }
      mockModel.findUnique.mockResolvedValue(mockResult)

      await repository.findById('1', {
        include: { relations: true },
        select: { id: true, name: true }
      })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { relations: true },
        select: { id: true, name: true }
      })
    })
  })

  describe('count', () => {
    it('should count records without where clause', async () => {
      mockModel.count.mockResolvedValue(42)

      const result = await repository.count()

      expect(mockModel.count).toHaveBeenCalledWith({})
      expect(result).toBe(42)
    })

    it('should count records with where clause', async () => {
      mockModel.count.mockResolvedValue(15)

      const result = await repository.count({
        where: { active: true }
      })

      expect(mockModel.count).toHaveBeenCalledWith({
        where: { active: true }
      })
      expect(result).toBe(15)
    })
  })

  describe('create', () => {
    it('should create a new record successfully', async () => {
      const mockResult = { id: '1', name: 'test' }
      mockModel.create.mockResolvedValue(mockResult)

      const result = await repository.create({
        data: { name: 'test' },
        include: { relations: true }
      })

      expect(mockModel.create).toHaveBeenCalledWith({
        data: { name: 'test' },
        include: { relations: true }
      })
      expect(result).toEqual(mockResult)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Created testModel in'),
        { id: '1' }
      )
    })

    it('should handle unique constraint violations', async () => {
      const conflictError = { code: 'P2002', meta: { target: ['email'] } }
      mockModel.create.mockRejectedValue(conflictError)

      await expect(repository.create({ data: { email: 'test@test.com' } }))
        .rejects.toThrow('testModel already exists')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating testModel',
        conflictError
      )
    })

    it('should re-throw other errors', async () => {
      const otherError = new Error('Database connection failed')
      mockModel.create.mockRejectedValue(otherError)

      await expect(repository.create({ data: { name: 'test' } }))
        .rejects.toThrow('Database connection failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating testModel',
        otherError
      )
    })

    it('should log creation time', async () => {
      const mockResult = { id: '1', name: 'test' }
      mockModel.create.mockImplementation(() => {
        // Simulate some processing time
        return new Promise(resolve => setTimeout(() => resolve(mockResult), 10))
      })

      await repository.create({ data: { name: 'test' } })

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/Created testModel in \d+ms/),
        { id: '1' }
      )
    })
  })

  describe('update', () => {
    it('should update a record successfully', async () => {
      const mockResult = { id: '1', name: 'updated' }
      mockModel.update.mockResolvedValue(mockResult)

      const result = await repository.update({
        where: { id: '1' },
        data: { name: 'updated' },
        include: { relations: true }
      })

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'updated' },
        include: { relations: true }
      })
      expect(result).toEqual(mockResult)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Updated testModel in')
      )
    })

    it('should handle record not found errors', async () => {
      const notFoundError = { code: 'P2025', meta: { cause: 'Record not found' } }
      mockModel.update.mockRejectedValue(notFoundError)

      await expect(repository.update({
        where: { id: 'nonexistent' },
        data: { name: 'updated' }
      })).rejects.toThrow('testModel with ID \'Record not found\' not found')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating testModel',
        notFoundError
      )
    })

    it('should re-throw other errors', async () => {
      const otherError = new Error('Database connection failed')
      mockModel.update.mockRejectedValue(otherError)

      await expect(repository.update({
        where: { id: '1' },
        data: { name: 'updated' }
      })).rejects.toThrow('Database connection failed')
    })
  })

  describe('updateById', () => {
    it('should update record by ID', async () => {
      const mockResult = { id: '1', name: 'updated' }
      mockModel.update.mockResolvedValue(mockResult)

      const result = await repository.updateById('1', { name: 'updated' })

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'updated' }
      })
      expect(result).toEqual(mockResult)
    })

    it('should include additional options', async () => {
      const mockResult = { id: '1', name: 'updated', relations: [] }
      mockModel.update.mockResolvedValue(mockResult)

      await repository.updateById('1', { name: 'updated' }, {
        include: { relations: true }
      })

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'updated' },
        include: { relations: true }
      })
    })
  })

  describe('delete', () => {
    it('should delete a record successfully', async () => {
      const mockResult = { id: '1', name: 'deleted' }
      mockModel.delete.mockResolvedValue(mockResult)

      const result = await repository.delete({
        where: { id: '1', ownerId: 'owner-123' }
      })

      expect(mockModel.delete).toHaveBeenCalledWith({
        where: { id: '1', ownerId: 'owner-123' }
      })
      expect(result).toEqual(mockResult)
      expect(mockLogger.log).toHaveBeenCalledWith('Deleted testModel with ownership validation')
    })

    it('should handle record not found errors', async () => {
      const notFoundError = { code: 'P2025', meta: { cause: 'Record not found' } }
      mockModel.delete.mockRejectedValue(notFoundError)

      await expect(repository.delete({
        where: { id: 'nonexistent', ownerId: 'owner-123' }
      })).rejects.toThrow('testModel with ID \'Record not found\' not found')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting testModel',
        notFoundError
      )
    })

    it('should re-throw other errors', async () => {
      const otherError = new Error('Database connection failed')
      mockModel.delete.mockRejectedValue(otherError)

      await expect(repository.delete({
        where: { id: '1', ownerId: 'owner-123' }
      })).rejects.toThrow('Database connection failed')
    })
  })

  describe('deleteById', () => {
    it('should throw security violation error', async () => {
      await expect(repository.deleteById('1')).rejects.toThrow(
        'Security violation: delete operations must include ownership validation for testModel'
      )
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SECURITY WARNING: deleteById() called without owner validation for testModel',
        expect.objectContaining({
          id: '1',
          stack: expect.any(String)
        })
      )
    })
  })

  describe('exists', () => {
    it('should return true when record exists', async () => {
      mockModel.count.mockResolvedValue(1)

      const result = await repository.exists({ id: '1' })

      expect(mockModel.count).toHaveBeenCalledWith({
        where: { id: '1' }
      })
      expect(result).toBe(true)
    })

    it('should return false when record does not exist', async () => {
      mockModel.count.mockResolvedValue(0)

      const result = await repository.exists({ id: 'nonexistent' })

      expect(result).toBe(false)
    })

    it('should return true for multiple matching records', async () => {
      mockModel.count.mockResolvedValue(3)

      const result = await repository.exists({ active: true })

      expect(result).toBe(true)
    })
  })

  describe('findManyByOwner', () => {
    it('should find records by owner with default options', async () => {
      const mockResults = [{ id: '1', ownerId: 'owner1' }]
      mockModel.findMany.mockResolvedValue(mockResults)

      const result = await repository.findManyByOwner('owner1')

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'owner1' }
      })
      expect(result).toEqual(mockResults)
    })

    it('should merge owner filter with existing where clause', async () => {
      mockModel.findMany.mockResolvedValue([])

      await repository.findManyByOwner('owner1', {
        where: { active: true },
        include: { relations: true }
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { active: true, ownerId: 'owner1' },
        include: { relations: true }
      })
    })
  })

  describe('findManyByOwnerPaginated', () => {
    it('should find paginated records by owner', async () => {
      const mockItems = [{ id: '1', ownerId: 'owner1' }]
      mockModel.findMany.mockResolvedValue(mockItems)
      mockModel.count.mockResolvedValue(5)

      const result = await repository.findManyByOwnerPaginated('owner1', {
        page: 1,
        limit: 10
      })

      expect(result).toEqual({
        items: mockItems,
        total: 5,
        page: 1,
        pageSize: 10,
        totalPages: 1
      })
    })

    it('should merge owner filter with pagination options', async () => {
      mockModel.findMany.mockResolvedValue([])
      mockModel.count.mockResolvedValue(0)

      await repository.findManyByOwnerPaginated('owner1', {
        where: { active: true },
        page: 2,
        limit: 15
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { active: true, ownerId: 'owner1' },
        take: 15,
        skip: 15
      })
    })
  })

  describe('addOwnerFilter', () => {
    it('should add ownerId to empty where clause', () => {
      const result = (repository as any).addOwnerFilter({}, 'owner1')
      
      expect(result).toEqual({ ownerId: 'owner1' })
    })

    it('should merge ownerId with existing where clause', () => {
      const result = (repository as any).addOwnerFilter(
        { active: true, status: 'published' },
        'owner1'
      )
      
      expect(result).toEqual({
        active: true,
        status: 'published',
        ownerId: 'owner1'
      })
    })
  })

  describe('applySearchFilter', () => {
    it('should return where clause unchanged by default', () => {
      const where = { active: true }
      const result = (repository as any).applySearchFilter(where, 'search term')
      
      expect(result).toEqual(where)
    })
  })

  describe('parseQueryParams', () => {
    it('should parse numeric parameters correctly', () => {
      const result = (repository as any).parseQueryParams({
        limit: '25',
        offset: '10',
        page: '3',
        search: '  test search  ',
        active: true
      })

      expect(result).toEqual({
        limit: 25,
        offset: 10,
        page: 3,
        search: 'test search',
        active: true
      })
    })

    it('should handle missing parameters', () => {
      const result = (repository as any).parseQueryParams({
        someOtherParam: 'value'
      })

      expect(result).toEqual({
        limit: undefined,
        offset: undefined,
        page: undefined,
        search: undefined,
        someOtherParam: 'value'
      })
    })

    it('should trim search parameter', () => {
      const result = (repository as any).parseQueryParams({
        search: '   whitespace around   '
      })

      expect(result.search).toBe('whitespace around')
    })

    it('should handle non-numeric string values for numeric params', () => {
      const result = (repository as any).parseQueryParams({
        limit: 'not-a-number',
        offset: '',
        page: 'abc'
      })

      expect(result.limit).toBeNaN()  // parseInt('not-a-number') returns NaN
      expect(result.offset).toBeUndefined()  // empty string is falsy, returns undefined
      expect(result.page).toBeNaN()  // parseInt('abc') returns NaN
    })
  })

  describe('Error handling edge cases', () => {
    it('should handle errors without code property', async () => {
      const error = new Error('Generic error')
      mockModel.create.mockRejectedValue(error)

      await expect(repository.create({ data: { name: 'test' } }))
        .rejects.toThrow('Generic error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating testModel',
        error
      )
    })

    it('should handle null/undefined error codes', async () => {
      const errorWithNullCode = { code: null, message: 'Null code error' }
      mockModel.update.mockRejectedValue(errorWithNullCode)

      await expect(repository.update({
        where: { id: '1' },
        data: { name: 'updated' }
      })).rejects.toThrow()

      // Error should be thrown but not as a specific not found error since code is null
    })
  })

  describe('Performance and timing', () => {
    it('should measure and log creation time accurately', async () => {
      const mockResult = { id: '1', name: 'test' }
      let resolveCreate: (value: any) => void
      
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve
      })
      
      mockModel.create.mockReturnValue(createPromise)

      const createResultPromise = repository.create({ data: { name: 'test' } })
      
      // Simulate 50ms delay
      setTimeout(() => resolveCreate(mockResult), 50)
      
      await createResultPromise

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/Created testModel in \d+ms/),
        { id: '1' }
      )
    })

    it('should measure and log update time accurately', async () => {
      const mockResult = { id: '1', name: 'updated' }
      let resolveUpdate: (value: any) => void
      
      const updatePromise = new Promise(resolve => {
        resolveUpdate = resolve
      })
      
      mockModel.update.mockReturnValue(updatePromise)

      const updateResultPromise = repository.update({
        where: { id: '1' },
        data: { name: 'updated' }
      })
      
      // Simulate 30ms delay
      setTimeout(() => resolveUpdate(mockResult), 30)
      
      await updateResultPromise

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/Updated testModel in \d+ms/)
      )
    })
  })
})