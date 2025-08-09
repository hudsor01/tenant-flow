import { Injectable } from '@nestjs/common'
import { BaseCrudService, ICrudService, BaseQueryOptions, BaseStats } from '../services/base-crud.service'
import { CrudService } from '../controllers/base-crud.controller'

/**
 * Service Adapter to bridge interface mismatch between BaseCrudController and BaseCrudService
 * 
 * BaseCrudController expects CrudService interface with methods like:
 * - findByOwner(ownerId, query)
 * - findById(ownerId, id)
 * - create(ownerId, dto)
 * - update(ownerId, id, dto)  
 * - delete(ownerId, id)
 * 
 * BaseCrudService implements ICrudService interface with methods like:
 * - getByOwner(ownerId, query)
 * - getByIdOrThrow(id, ownerId)
 * - create(dto, ownerId)
 * - update(id, dto, ownerId)
 * - delete(id, ownerId)
 * 
 * This adapter bridges the gap while maintaining type safety and functionality.
 */
@Injectable()
export class ServiceAdapter<
  TEntity = unknown,
  TCreateDto = unknown,
  TUpdateDto = unknown,
  TQueryDto extends BaseQueryOptions = BaseQueryOptions
> implements CrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto> {

  constructor(
    private readonly baseCrudService: ICrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto>
  ) {}

  /**
   * Adapter: findByOwner -> getByOwner
   */
  async findByOwner(ownerId: string, query?: TQueryDto): Promise<TEntity[]> {
    return await this.baseCrudService.getByOwner(ownerId, query)
  }

  /**
   * Adapter: findById -> getByIdOrThrow  
   * Returns null if not found (to match CrudService interface)
   */
  async findById(ownerId: string, id: string): Promise<TEntity | null> {
    try {
      return await this.baseCrudService.getByIdOrThrow(id, ownerId)
    } catch (error) {
      // If it's a not found error, return null to match interface
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message
        if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
          return null
        }
      }
      // Re-throw other errors
      throw error
    }
  }

  /**
   * Adapter: create - parameter order difference
   * CrudService expects (ownerId, dto)
   * BaseCrudService expects (dto, ownerId)
   */
  async create(ownerId: string, createDto: TCreateDto): Promise<TEntity> {
    return await this.baseCrudService.create(createDto, ownerId)
  }

  /**
   * Adapter: update - parameter order difference
   * CrudService expects (ownerId, id, dto)
   * BaseCrudService expects (id, dto, ownerId)
   */
  async update(ownerId: string, id: string, updateDto: TUpdateDto): Promise<TEntity> {
    return await this.baseCrudService.update(id, updateDto, ownerId)
  }

  /**
   * Adapter: delete - parameter order difference and return type
   * CrudService expects (ownerId, id) -> void
   * BaseCrudService expects (id, ownerId) -> TEntity
   */
  async delete(ownerId: string, id: string): Promise<void> {
    await this.baseCrudService.delete(id, ownerId)
    // BaseCrudService returns the deleted entity, but CrudService interface expects void
    return
  }

  /**
   * Optional stats method - delegate to BaseCrudService if available
   */
  async getStats?(ownerId: string): Promise<Record<string, unknown>> {
    if ('getStats' in this.baseCrudService && typeof this.baseCrudService.getStats === 'function') {
      return await this.baseCrudService.getStats(ownerId) as BaseStats
    }
    
    // Default empty stats if not implemented
    return {}
  }
}

/**
 * Factory function to create a ServiceAdapter for any BaseCrudService
 */
export function createServiceAdapter<
  TEntity = unknown,
  TCreateDto = unknown,
  TUpdateDto = unknown, 
  TQueryDto extends BaseQueryOptions = BaseQueryOptions
>(
  service: ICrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto>
): CrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto> {
  return new ServiceAdapter(service)
}

/**
 * Type guard to check if a service implements ICrudService
 */
export function isBaseCrudService<T = unknown, C = unknown, U = unknown, Q extends BaseQueryOptions = BaseQueryOptions>(
  service: unknown
): service is ICrudService<T, C, U, Q> {
  return (
    service !== null &&
    typeof service === 'object' &&
    'getByOwner' in service &&
    'getByIdOrThrow' in service &&
    'create' in service &&
    'update' in service &&
    'delete' in service &&
    typeof (service as Record<string, unknown>).getByOwner === 'function' &&
    typeof (service as Record<string, unknown>).getByIdOrThrow === 'function' &&
    typeof (service as Record<string, unknown>).create === 'function' &&
    typeof (service as Record<string, unknown>).update === 'function' &&
    typeof (service as Record<string, unknown>).delete === 'function'
  )
}

/**
 * Helper function to wrap any BaseCrudService with the adapter
 * Provides type safety and automatic adaptation
 */
export function adaptBaseCrudService<
  TEntity = unknown,
  TCreateDto = unknown,
  TUpdateDto = unknown,
  TQueryDto extends BaseQueryOptions = BaseQueryOptions
>(
  service: BaseCrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto>
): CrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto> {
  return createServiceAdapter(service)
}