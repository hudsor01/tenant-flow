import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ICrudService, BaseQueryOptions } from '../common/services/base-crud.service'
import type { ErrorHandlerService } from '../common/errors/error-handler.service'
import { NotFoundException, ValidationException } from '../common/exceptions/base.exception'

/**
 * Comprehensive test validator for BaseCrudService implementations
 * Ensures all services follow the same patterns and contracts
 */
export class BaseCrudServiceTestValidator<
  TEntity = Record<string, unknown>,
  TCreateDto = Record<string, unknown>,
  TUpdateDto = Record<string, unknown>,
  TQueryDto extends BaseQueryOptions = BaseQueryOptions,
  TService extends ICrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto> = ICrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto>
> {
  
  /**
   * Validates that a service properly implements the BaseCrudService contract
   */
  validateServiceContract(service: TService, _serviceName: string): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check core CRUD methods
    const coreMethods = [
      'getByOwner', 'getByIdOrThrow', 'getStats', 
      'create', 'update', 'delete'
    ]
    
    coreMethods.forEach(method => {
      if (typeof (service as Record<string, unknown>)[method] !== 'function') {
        errors.push(`Missing core method: ${method}`)
      }
    })

    // Check alias methods
    const aliasMethods = [
      'findAllByOwner', 'findById', 'findOne', 'remove'
    ]
    
    aliasMethods.forEach(method => {
      if (typeof (service as Record<string, unknown>)[method] !== 'function') {
        warnings.push(`Missing alias method: ${method}`)
      }
    })

    // Check required properties
    const requiredProps = ['entityName']
    requiredProps.forEach(prop => {
      if (!(service as Record<string, unknown>)[prop]) {
        errors.push(`Missing required property: ${prop}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Creates a comprehensive test suite for a BaseCrudService implementation
   */
  createTestSuite(
    serviceName: string,
    serviceFactory: () => TService,
    mockEntityFactory: (overrides?: Partial<TEntity>) => TEntity,
    createDtoFactory: (overrides?: Partial<TCreateDto>) => TCreateDto,
    updateDtoFactory: (overrides?: Partial<TUpdateDto>) => TUpdateDto,
    repositoryMockFactory: () => Record<string, unknown>
  ) {
    return describe(`${serviceName} - BaseCrudService Contract Tests`, () => {
      let service: TService
      let repository: Record<string, unknown>
      let errorHandler: ErrorHandlerService

      beforeEach(() => {
        repository = repositoryMockFactory()
        errorHandler = {
          handleErrorEnhanced: vi.fn().mockImplementation((error) => { throw error })
        } as unknown as ErrorHandlerService
        service = serviceFactory()
      })

      describe('Contract Validation', () => {
        it('should implement all required BaseCrudService methods', () => {
          const validation = this.validateServiceContract(service, serviceName)
          
          expect(validation.isValid).toBe(true)
          expect(validation.errors).toHaveLength(0)
        })

        it('should have all alias methods for backward compatibility', () => {
          const validation = this.validateServiceContract(service, serviceName)
          
          expect(validation.warnings).toHaveLength(0)
        })
      })

      describe('Core CRUD Operations', () => {
        const ownerId = 'test-owner-id'
        const entityId = 'test-entity-id'

        it('should implement getByOwner with proper validation', async () => {
          const mockEntities = [mockEntityFactory(), mockEntityFactory()]
          repository.findManyByOwner = vi.fn().mockResolvedValue(mockEntities)
          
          const result = await service.getByOwner(ownerId)
          
          expect(repository.findManyByOwner).toHaveBeenCalledWith(ownerId, {})
          expect(result).toEqual(mockEntities)
        })

        it('should implement getByIdOrThrow with ownership validation', async () => {
          const mockEntity = mockEntityFactory({ id: entityId, ownerId } as Partial<TEntity>)
          repository.findByIdAndOwner = vi.fn().mockResolvedValue(mockEntity)
          
          const result = await service.getByIdOrThrow(entityId, ownerId)
          
          expect(result).toEqual(mockEntity)
        })

        it('should throw NotFoundException when entity not found', async () => {
          repository.findByIdAndOwner = vi.fn().mockResolvedValue(null)
          
          await expect(service.getByIdOrThrow(entityId, ownerId))
            .rejects.toThrow(NotFoundException)
        })

        it('should implement create with ownership assignment', async () => {
          const createDto = createDtoFactory()
          const mockEntity = mockEntityFactory()
          repository.create = vi.fn().mockResolvedValue(mockEntity)
          
          const result = await service.create(createDto, ownerId)
          
          expect(repository.create).toHaveBeenCalled()
          expect(result).toEqual(mockEntity)
        })

        it('should implement update with ownership validation', async () => {
          const updateDto = updateDtoFactory()
          const mockEntity = mockEntityFactory({ id: entityId, ownerId } as Partial<TEntity>)
          
          // Mock findByIdAndOwner for ownership check
          repository.findByIdAndOwner = vi.fn().mockResolvedValue(mockEntity)
          repository.update = vi.fn().mockResolvedValue(mockEntity)
          
          const result = await service.update(entityId, updateDto, ownerId)
          
          expect(repository.findByIdAndOwner).toHaveBeenCalledWith(entityId, ownerId)
          expect(repository.update).toHaveBeenCalled()
          expect(result).toEqual(mockEntity)
        })

        it('should implement delete with ownership validation', async () => {
          const mockEntity = mockEntityFactory({ id: entityId, ownerId } as Partial<TEntity>)
          
          repository.findByIdAndOwner = vi.fn().mockResolvedValue(mockEntity)
          repository.deleteById = vi.fn().mockResolvedValue(mockEntity)
          
          const result = await service.delete(entityId, ownerId)
          
          expect(repository.findByIdAndOwner).toHaveBeenCalledWith(entityId, ownerId)
          expect(repository.deleteById).toHaveBeenCalledWith(entityId)
          expect(result).toEqual(mockEntity)
        })

        it('should implement getStats', async () => {
          const mockStats = { total: 5, active: 3 }
          repository.getStatsByOwner = vi.fn().mockResolvedValue(mockStats)
          
          const result = await service.getStats(ownerId)
          
          expect(repository.getStatsByOwner).toHaveBeenCalledWith(ownerId)
          expect(result).toEqual(mockStats)
        })
      })

      describe('Multi-tenant Data Isolation', () => {
        it('should isolate data by owner', async () => {
          const owner1Entities = [mockEntityFactory({ ownerId: 'owner1' } as Partial<TEntity>)]
          const owner2Entities = [mockEntityFactory({ ownerId: 'owner2' } as Partial<TEntity>)]

          repository.findManyByOwner = vi.fn()
            .mockResolvedValueOnce(owner1Entities)
            .mockResolvedValueOnce(owner2Entities)

          const result1 = await service.getByOwner('owner1')
          const result2 = await service.getByOwner('owner2')

          expect(result1).toEqual(owner1Entities)
          expect(result2).toEqual(owner2Entities)
          expect(repository.findManyByOwner).toHaveBeenCalledTimes(2)
        })

        it('should prevent cross-tenant access', async () => {
          const owner2 = 'owner2'
          const entityId = 'entity-123'

          // Entity belongs to owner1, but owner2 tries to access
          repository.findByIdAndOwner = vi.fn().mockResolvedValue(null)

          await expect(service.getByIdOrThrow(entityId, owner2))
            .rejects.toThrow(NotFoundException)
        })
      })

      describe('Input Validation', () => {
        it('should validate owner ID is provided', async () => {
          await expect(service.getByOwner(''))
            .rejects.toThrow(ValidationException)

          await expect(service.getByOwner('   '))
            .rejects.toThrow(ValidationException)
        })

        it('should validate entity ID is provided', async () => {
          await expect(service.getByIdOrThrow('', 'owner-123'))
            .rejects.toThrow(ValidationException)

          await expect(service.getByIdOrThrow('   ', 'owner-123'))
            .rejects.toThrow(ValidationException)
        })

        it('should validate query parameters', async () => {
          await expect(service.getByOwner('owner-123', { limit: -1 } as TQueryDto))
            .rejects.toThrow(ValidationException)

          await expect(service.getByOwner('owner-123', { limit: 1001 } as TQueryDto))
            .rejects.toThrow(ValidationException)

          await expect(service.getByOwner('owner-123', { offset: -1 } as TQueryDto))
            .rejects.toThrow(ValidationException)
        })
      })

      describe('Error Handling', () => {
        it('should use error handler for repository errors', async () => {
          const repositoryError = new Error('Database connection failed')
          repository.findManyByOwner = vi.fn().mockRejectedValue(repositoryError)

          await expect(service.getByOwner('owner-123'))
            .rejects.toThrow('Database connection failed')

          expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
            repositoryError,
            expect.objectContaining({
              operation: 'getByOwner',
              metadata: { ownerId: 'owner-123' }
            })
          )
        })

        it('should provide proper error context for all operations', async () => {
          const error = new Error('Test error')
          repository.create = vi.fn().mockRejectedValue(error)

          const createDto = createDtoFactory()
          await expect(service.create(createDto, 'owner-123'))
            .rejects.toThrow('Test error')

          expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
            error,
            expect.objectContaining({
              operation: 'create',
              metadata: { ownerId: 'owner-123' }
            })
          )
        })
      })


      describe('Performance and Efficiency', () => {
        it('should complete CRUD operations within acceptable time limits', async () => {
          const mockEntity = mockEntityFactory()
          repository.findManyByOwner = vi.fn().mockResolvedValue([mockEntity])
          repository.findByIdAndOwner = vi.fn().mockResolvedValue(mockEntity)
          repository.create = vi.fn().mockResolvedValue(mockEntity)
          repository.update = vi.fn().mockResolvedValue(mockEntity)
          repository.deleteById = vi.fn().mockResolvedValue(mockEntity)

          const startTime = Date.now()

          // Run a complete CRUD workflow
          await service.getByOwner('owner-123')
          await service.getByIdOrThrow('entity-123', 'owner-123')
          await service.create(createDtoFactory(), 'owner-123')
          await service.update('entity-123', updateDtoFactory(), 'owner-123')
          await service.delete('entity-123', 'owner-123')

          const endTime = Date.now()
          const duration = endTime - startTime

          // Should complete in under 100ms for mocked operations
          expect(duration).toBeLessThan(100)
        })
      })
    })
  }

  /**
   * Generates a compliance report for multiple services
   */
  generateComplianceReport(services: Record<string, TService>): string {
    const results = Object.entries(services).map(([name, service]) => {
      const validation = this.validateServiceContract(service, name)
      return { name, validation }
    })

    const compliant = results.filter(r => r.validation.isValid).length
    const total = results.length

    let report = `# BaseCrudService Compliance Report\n\n`
    report += `**Generated:** ${new Date().toISOString()}\n`
    report += `**Total Services:** ${total}\n`
    report += `**Compliant:** ${compliant}\n`
    report += `**Compliance Rate:** ${((compliant / total) * 100).toFixed(1)}%\n\n`

    // Service-by-service breakdown
    results.forEach(({ name, validation }) => {
      report += `## ${name}\n`
      report += `**Status:** ${validation.isValid ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n`
      
      if (validation.errors.length > 0) {
        report += `**Errors:**\n`
        validation.errors.forEach(error => {
          report += `- ${error}\n`
        })
      }
      
      if (validation.warnings.length > 0) {
        report += `**Warnings:**\n`
        validation.warnings.forEach(warning => {
          report += `- ${warning}\n`
        })
      }
      
      report += `\n`
    })

    return report
  }
}

/**
 * Factory function to create the test validator
 */
export function createBaseCrudServiceTestValidator<T, C, U, Q extends BaseQueryOptions, S extends ICrudService<T, C, U, Q>>() {
  return new BaseCrudServiceTestValidator<T, C, U, Q, S>()
}