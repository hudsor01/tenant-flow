import { Injectable, Logger } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { SecurityEventType } from '@repo/shared'
import { ErrorHandlerService } from '../errors/error-handler.service'
import { NotFoundException, ValidationException } from '../exceptions/base.exception'
import { SecurityAuditService } from '../security/audit.service'

// Define types that match BaseRepository's Prisma types
type PrismaInclude = Record<string, boolean | Record<string, unknown>>
type PrismaSelect = Record<string, boolean | Record<string, unknown>>

/**
 * Repository interface that bridges BaseCrudService with strongly-typed BaseRepository
 * Uses generics to maintain type safety while allowing DTO-to-Prisma transformations
 */
interface CrudRepositoryInterface<TEntity = unknown, TCreateInput = unknown, TUpdateInput = unknown, TWhereInput = unknown> {
  // Core CRUD operations
  findManyByOwner: (ownerId: string, options?: Record<string, unknown>) => Promise<TEntity[]>
  create: (options: { data: TCreateInput; include?: PrismaInclude; select?: PrismaSelect }) => Promise<TEntity>
  update: (options: { where: TWhereInput; data: TUpdateInput; include?: PrismaInclude; select?: PrismaSelect }) => Promise<TEntity>
  delete: (options: { where: TWhereInput; include?: PrismaInclude; select?: PrismaSelect }) => Promise<TEntity>
  findMany: (options?: { where?: TWhereInput; [key: string]: unknown }) => Promise<TEntity[]>
  
  // Additional methods that BaseRepository implementations provide
  findByIdAndOwner: (id: string, ownerId: string, includeDetails?: boolean) => Promise<TEntity | null>
  getStatsByOwner: (ownerId: string) => Promise<Record<string, unknown>>
  count?: (options?: { where?: TWhereInput }) => Promise<number>
  findFirst?: (options?: { where?: TWhereInput; include?: PrismaInclude; select?: PrismaSelect }) => Promise<TEntity | null>
  
  // Repository-specific methods (optional) - each service can extend as needed
  findByOwnerWithLeases?: (ownerId: string, options?: Record<string, unknown>) => Promise<TEntity[]>
  findByOwnerWithUnits?: (ownerId: string, options?: Record<string, unknown>) => Promise<TEntity[]>
  hasActiveLeases?: (id: string, ownerId: string) => Promise<boolean>
  createWithUnits?: (data: TCreateInput, unitsCount: number) => Promise<TEntity>
}

/**
 * Query options interface for list operations
 */
export interface BaseQueryOptions {
  search?: string
  limit?: number | string
  offset?: number | string
  page?: number | string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: unknown
}

/**
 * Statistics interface for owner stats
 */
export type BaseStats = Record<string, number | string | boolean>;

/**
 * Service interface for consistent CRUD contracts
 */
export interface ICrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto extends BaseQueryOptions> {
  // Core CRUD operations
  getByOwner(ownerId: string, query?: TQueryDto): Promise<TEntity[]>
  getByIdOrThrow(id: string, ownerId: string): Promise<TEntity>
  getStats(ownerId: string): Promise<BaseStats>
  create(data: TCreateDto, ownerId: string): Promise<TEntity>
  update(id: string, data: TUpdateDto, ownerId: string): Promise<TEntity>
  delete(id: string, ownerId: string): Promise<TEntity>
  
  // Extended query operations
  findByUnit?(unitId: string, ownerId: string, query?: TQueryDto): Promise<TEntity[]>
  findByTenant?(tenantId: string, ownerId: string, query?: TQueryDto): Promise<TEntity[]>
  findByProperty?(propertyId: string, ownerId: string, query?: TQueryDto): Promise<TEntity[]>
}

/**
 * Base CRUD service providing common operations for multi-tenant entities.
 * Implements the Repository pattern with consistent error handling and logging.
 * 
 * @template TEntity - The entity type (e.g., Property, Tenant)
 * @template TCreateDto - DTO for create operations
 * @template TUpdateDto - DTO for update operations  
 * @template TQueryDto - DTO for query operations
 * @template TCreateInput - Prisma create input type
 * @template TUpdateInput - Prisma update input type
 * @template TWhereInput - Prisma where input type
 */
@Injectable()
export abstract class BaseCrudService<
  TEntity = unknown,
  TCreateDto = unknown,
  TUpdateDto = unknown,
  TQueryDto extends BaseQueryOptions = BaseQueryOptions,
  TCreateInput = unknown,
  TUpdateInput = unknown,
  TWhereInput = unknown
> implements ICrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto> {
  
  protected readonly logger: Logger
  protected abstract readonly entityName: string
  protected abstract readonly repository: CrudRepositoryInterface<TEntity, TCreateInput, TUpdateInput, TWhereInput>

  constructor(
    protected readonly errorHandler: ErrorHandlerService,
    protected readonly auditService?: SecurityAuditService
  ) {
    this.logger = new Logger(this.constructor.name)
    
    // Validate abstract method implementations for security
    this.validateAbstractImplementations()
  }

  /**
   * Validates that all critical abstract methods are properly implemented
   * This prevents security bypasses due to missing implementations
   */
  private validateAbstractImplementations(): void {
    const requiredMethods = [
      'findByIdAndOwner',
      'calculateStats', 
      'prepareCreateData',
      'prepareUpdateData',
      'createOwnerWhereClause'
    ]

    for (const method of requiredMethods) {
      if (typeof (this as unknown as Record<string, unknown>)[method] !== 'function') {
        throw new Error(
          `Security violation: ${this.constructor.name} must implement ${method}() for multi-tenant data isolation`
        )
      }
    }

    // Note: entityName and repository validation deferred to first operation
    // This allows proper property initialization in child classes
  }

  /**
   * Validates that entityName and repository are properly set
   * Called before each operation to ensure security
   */
  private validateServiceInitialization(): void {
    if (!this.entityName) {
      throw new Error(`Security violation: ${this.constructor.name} must define entityName`)
    }
    
    if (!this.repository) {
      throw new Error(`Security violation: ${this.constructor.name} must define repository`)
    }
  }

  /**
   * Get entities by owner with optional filtering
   * Implements multi-tenant data isolation
   * Rate limited to 100 requests per minute for read operations
   */
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getByOwner(ownerId: string, query?: TQueryDto): Promise<TEntity[]> {
    this.validateServiceInitialization()
    this.validateOwnerId(ownerId)
    
    try {
      const options = this.parseQueryOptions(query)
      return await this.repository.findManyByOwner(ownerId, options)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByOwner',
        resource: this.entityName,
        metadata: { ownerId }
      })
    }
  }

  /**
   * Get entity by ID with ownership validation
   * Throws NotFoundException if not found or not owned
   * Rate limited to 100 requests per minute for read operations
   */
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getByIdOrThrow(id: string, ownerId: string): Promise<TEntity> {
    this.validateServiceInitialization()
    this.validateId(id)
    this.validateOwnerId(ownerId)

    try {
      const entity = await this.findByIdAndOwner(id, ownerId)
      
      if (!entity) {
        throw new NotFoundException(this.entityName, id)
      }
      
      return entity
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByIdOrThrow',
        resource: this.entityName,
        metadata: { id, ownerId }
      })
    }
  }

  /**
   * Get statistics for owner's entities
   * Override in child classes for entity-specific stats
   * Rate limited to 100 requests per minute for read operations
   */
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getStats(ownerId: string): Promise<BaseStats> {
    this.validateServiceInitialization()
    this.validateOwnerId(ownerId)
    
    try {
      return await this.calculateStats(ownerId)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getStats',
        resource: this.entityName,
        metadata: { ownerId }
      })
    }
  }

  /**
   * Create new entity with ownership assignment
   * Rate limited to 10 requests per minute for write operations
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(data: TCreateDto, ownerId: string): Promise<TEntity> {
    this.validateServiceInitialization()
    this.validateOwnerId(ownerId)
    this.validateCreateData(data)

    try {
      const createData = this.prepareCreateData(data, ownerId)
      const result = await this.repository.create({ data: createData })
      
      this.logger.log(`${this.entityName} created`, { 
        id: (result as TEntity & { id?: string }).id,
        ownerId 
      })

      // Audit logging for sensitive create operations
      if (this.auditService) {
        await this.auditService.logSecurityEvent({
          eventType: SecurityEventType.ADMIN_ACTION,
          userId: ownerId,
          resource: this.entityName.toLowerCase(),
          action: 'create',
          details: JSON.stringify({
            entityId: (result as TEntity & { id?: string }).id,
            entityType: this.entityName
          })
        })
      }
      
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'create',
        resource: this.entityName,
        metadata: { ownerId }
      })
    }
  }

  /**
   * Update entity with ownership validation
   * Rate limited to 10 requests per minute for write operations
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async update(id: string, data: TUpdateDto, ownerId: string): Promise<TEntity> {
    this.validateServiceInitialization()
    this.validateId(id)
    this.validateOwnerId(ownerId)
    this.validateUpdateData(data)

    try {
      // Verify ownership first
      await this.getByIdOrThrow(id, ownerId)
      
      const updateData = this.prepareUpdateData(data)
      const where = this.createOwnerWhereClause(id, ownerId)
      
      const result = await this.repository.update({ 
        where, 
        data: updateData 
      })
      
      this.logger.log(`${this.entityName} updated`, { id, ownerId })

      // Audit logging for sensitive update operations
      if (this.auditService) {
        await this.auditService.logSecurityEvent({
          eventType: SecurityEventType.ADMIN_ACTION,
          userId: ownerId,
          resource: this.entityName.toLowerCase(),
          action: 'update',
          details: JSON.stringify({
            entityId: id,
            entityType: this.entityName
          })
        })
      }
      
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'update',
        resource: this.entityName,
        metadata: { id, ownerId }
      })
    }
  }

  /**
   * Delete entity with ownership validation and business rule checks
   * Rate limited to 10 requests per minute for write operations
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async delete(id: string, ownerId: string): Promise<TEntity> {
    this.validateServiceInitialization()
    this.validateId(id)
    this.validateOwnerId(ownerId)

    try {
      // Verify ownership first
      const entity = await this.getByIdOrThrow(id, ownerId)
      
      // Check business rules before deletion
      await this.validateDeletion(entity, ownerId)
      
      // SECURITY FIX: Use owner-validated deletion instead of bypass
      const where = this.createOwnerWhereClause(id, ownerId)
      const result = await this.repository.delete({ where })
      
      this.logger.log(`${this.entityName} deleted`, { id, ownerId })

      // Audit logging for sensitive delete operations
      if (this.auditService) {
        await this.auditService.logSecurityEvent({
          eventType: SecurityEventType.ADMIN_ACTION,
          userId: ownerId,
          resource: this.entityName.toLowerCase(),
          action: 'delete',
          details: JSON.stringify({
            entityId: id,
            entityType: this.entityName
          })
        })
      }
      
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'delete',
        resource: this.entityName,
        metadata: { id, ownerId }
      })
    }
  }


  // ========================================
  // Protected Abstract Methods - Override in Child Classes
  // ========================================

  /**
   * Find entity by ID and owner - implement entity-specific logic
   */
  protected abstract findByIdAndOwner(id: string, ownerId: string): Promise<TEntity | null>

  /**
   * Calculate entity-specific statistics
   */
  protected abstract calculateStats(ownerId: string): Promise<BaseStats>

  /**
   * Prepare data for creation - add ownerId and entity-specific transformations
   */
  protected abstract prepareCreateData(data: TCreateDto, ownerId: string): TCreateInput

  /**
   * Prepare data for updates - apply entity-specific transformations
   */
  protected abstract prepareUpdateData(data: TUpdateDto): TUpdateInput

  /**
   * Create owner-specific where clause for updates/deletes
   */
  protected abstract createOwnerWhereClause(id: string, ownerId: string): TWhereInput

  /**
   * Find entities by related field (unitId, tenantId, propertyId, etc.)
   * Override in child classes for entity-specific relationships
   */
  protected async findByRelatedEntity(field: string, value: string, ownerId: string, options: Record<string, unknown>): Promise<TEntity[]> {
    // Default implementation using repository
    const where = {
      [field]: value,
      // Most entities have owner relationship through nested properties
      OR: [
        { ownerId },
        { Unit: { Property: { ownerId } } },
        { Property: { ownerId } }
      ]
    } as TWhereInput
    
    return await this.repository.findMany({ where, ...options })
  }

  // ========================================
  // Protected Hook Methods - Override as needed
  // ========================================

  /**
   * Validate business rules before deletion
   * Override to implement entity-specific validation
   */
  protected async validateDeletion(_entity: TEntity, _ownerId: string): Promise<void> {
    // Default: no additional validation
    return Promise.resolve()
  }

  /**
   * Validate create data - override for custom validation
   */
  protected validateCreateData(_data: TCreateDto): void {
    // Default: no validation
  }

  /**
   * Validate update data - override for custom validation  
   */
  protected validateUpdateData(_data: TUpdateDto): void {
    // Default: no validation
  }

  /**
   * Parse and validate query options
   */
  protected parseQueryOptions(query?: TQueryDto): Record<string, unknown> {
    if (!query) return {}

    const options: Record<string, unknown> = { ...query }
    
    // Parse numeric parameters
    if (query.limit !== undefined) {
      const limit = Number(query.limit)
      if (isNaN(limit) || limit < 0 || limit > 1000) {
        throw new ValidationException('Limit must be between 0 and 1000', 'limit')
      }
      options.limit = limit
    }
    
    if (query.offset !== undefined) {
      const offset = Number(query.offset)
      if (isNaN(offset) || offset < 0) {
        throw new ValidationException('Offset must be non-negative', 'offset')
      }
      options.offset = offset
    }

    // Parse page-based pagination
    if (query.page !== undefined) {
      const page = Number(query.page)
      if (isNaN(page) || page < 1) {
        throw new ValidationException('Page must be a positive number', 'page')
      }
      const limit = options.limit ? Number(options.limit) : 20
      options.offset = (page - 1) * limit
      options.page = page
    }

    // Validate sort parameters
    if (query.sortBy) {
      options.sortBy = query.sortBy
      options.sortOrder = query.sortOrder || 'desc'
    }

    return options
  }

  /**
   * Find entities by unit relationship
   * Default implementation - override in child classes
   */
  async findByUnit?(unitId: string, ownerId: string, query?: TQueryDto): Promise<TEntity[]> {
    this.validateId(unitId)
    this.validateOwnerId(ownerId)
    
    try {
      const options = this.parseQueryOptions(query)
      return await this.findByRelatedEntity('unitId', unitId, ownerId, options)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'findByUnit',
        resource: this.entityName,
        metadata: { unitId, ownerId }
      })
    }
  }

  /**
   * Find entities by tenant relationship
   * Default implementation - override in child classes
   */
  async findByTenant?(tenantId: string, ownerId: string, query?: TQueryDto): Promise<TEntity[]> {
    this.validateId(tenantId)
    this.validateOwnerId(ownerId)
    
    try {
      const options = this.parseQueryOptions(query)
      return await this.findByRelatedEntity('tenantId', tenantId, ownerId, options)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'findByTenant',
        resource: this.entityName,
        metadata: { tenantId, ownerId }
      })
    }
  }

  /**
   * Find entities by property relationship
   * Default implementation - override in child classes
   */
  async findByProperty?(propertyId: string, ownerId: string, query?: TQueryDto): Promise<TEntity[]> {
    this.validateId(propertyId)
    this.validateOwnerId(ownerId)
    
    try {
      const options = this.parseQueryOptions(query)
      return await this.findByRelatedEntity('propertyId', propertyId, ownerId, options)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'findByProperty',
        resource: this.entityName,
        metadata: { propertyId, ownerId }
      })
    }
  }

  // ========================================
  // Alias Methods (for backward compatibility)
  // ========================================

  /**
   * Alias for getByOwner
   */
  async findAllByOwner(ownerId: string, query?: TQueryDto): Promise<TEntity[]> {
    return this.getByOwner(ownerId, query)
  }

  /**
   * Alias for getByIdOrThrow
   */
  async findById(id: string, ownerId: string): Promise<TEntity> {
    return this.getByIdOrThrow(id, ownerId)
  }

  /**
   * Alias for getByIdOrThrow
   */
  async findOne(id: string, ownerId: string): Promise<TEntity> {
    return this.getByIdOrThrow(id, ownerId)
  }

  /**
   * Alias for delete
   */
  async remove(id: string, ownerId: string): Promise<TEntity> {
    return this.delete(id, ownerId)
  }

  /**
   * Alias for findAllByOwner to match BaseCrudController interface
   */
  async findByOwner(ownerId: string, query?: TQueryDto): Promise<TEntity[]> {
    return this.findAllByOwner(ownerId, query)
  }

  // ========================================
  // Private Validation Methods
  // ========================================

  private validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new ValidationException(`${this.entityName} ID is required`, 'id')
    }
  }

  private validateOwnerId(ownerId: string): void {
    if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
      throw new ValidationException('Owner ID is required', 'ownerId')
    }
  }
}