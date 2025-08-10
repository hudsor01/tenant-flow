/**
 * Domain Architecture Patterns and Type Safety Guidelines
 * 
 * This file provides standardized patterns and interfaces for creating
 * type-safe domain models that integrate seamlessly with BaseCrudService
 * and BaseRepository implementations.
 */

import { BaseQueryOptions, BaseStats } from '../services/base-crud.service'

/**
 * Standard Entity Interface
 * All domain entities should extend this base interface
 */
export interface BaseDomainEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Entity with ownership - most entities in a multi-tenant system
 */
export interface OwnedEntity extends BaseDomainEntity {
  ownerId: string
}

/**
 * Service Creation Template Interface
 * Use this as a template for creating new CRUD services
 */
export interface ServiceCreationTemplate<
  TEntity extends BaseDomainEntity,
  TCreateDto,
  TUpdateDto,
  TQueryDto extends BaseQueryOptions,
  TPrismaCreateInput,
  TPrismaUpdateInput,
  TPrismaWhereInput
> {
  // Abstract method implementations required
  findByIdAndOwner(id: string, ownerId: string): Promise<TEntity | null>
  calculateStats(ownerId: string): Promise<BaseStats>
  prepareCreateData(data: TCreateDto, ownerId: string): TPrismaCreateInput
  prepareUpdateData(data: TUpdateDto): TPrismaUpdateInput
  createOwnerWhereClause(id: string, ownerId: string): TPrismaWhereInput
  
  // Optional override methods
  validateCreateData?(data: TCreateDto): void
  validateUpdateData?(data: TUpdateDto): void
  validateDeletion?(entity: TEntity, ownerId: string): Promise<void>
}

/**
 * Repository Contract Interface
 * Ensures repository implementations provide all required methods
 */
export interface RepositoryContract<
  TEntity extends BaseDomainEntity,
  TCreateInput,
  TUpdateInput, 
  TWhereInput
> {
  // Required base methods
  findManyByOwner(ownerId: string, options?: Record<string, unknown>): Promise<TEntity[]>
  findByIdAndOwner(id: string, ownerId: string, includeDetails?: boolean): Promise<TEntity | null>
  getStatsByOwner(ownerId: string): Promise<Record<string, unknown>>
  create(options: { data: TCreateInput }): Promise<TEntity>
  update(options: { where: TWhereInput; data: TUpdateInput }): Promise<TEntity>
  delete(options: { where: TWhereInput }): Promise<TEntity>
  
  // Optional pagination and query methods
  findMany?(options?: { where?: TWhereInput; [key: string]: unknown }): Promise<TEntity[]>
  count?(options?: { where?: TWhereInput }): Promise<number>
  findFirst?(options?: { where?: TWhereInput }): Promise<TEntity | null>
}

/**
 * DTO Validation Patterns
 */
export interface DTOValidationRules {
  required: string[]
  optional: string[]
  businessRules?: Array<{
    field: string
    rule: (value: unknown) => boolean
    message: string
  }>
}

/**
 * Standard Query DTO Pattern
 * Extend this for entity-specific query parameters
 */
export interface StandardQueryDto extends BaseQueryOptions {
  search?: string
  status?: string
  limit?: number | string
  offset?: number | string
  page?: number | string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Domain Event Pattern for CRUD Operations
 */
export interface DomainEvent<TEntity> {
  type: 'CREATED' | 'UPDATED' | 'DELETED'
  entityType: string
  entityId: string
  entity: TEntity
  previousEntity?: TEntity
  timestamp: Date
  userId: string
  metadata?: Record<string, unknown>
}

/**
 * Audit Log Entry Pattern
 */
export interface AuditLogEntry {
  id: string
  entityType: string
  entityId: string
  operation: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  userId: string
  timestamp: Date
  changes?: Record<string, { from: unknown; to: unknown }>
  metadata?: Record<string, unknown>
}

/**
 * Type-safe Error Patterns
 */
export enum DomainErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  OWNERSHIP_ERROR = 'OWNERSHIP_ERROR',
  BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR'
}

export interface DomainError {
  type: DomainErrorType
  message: string
  field?: string
  code?: string
  metadata?: Record<string, unknown>
}

/**
 * Generic Service Factory Pattern
 * Use this to ensure consistent service creation
 */
export abstract class DomainServiceFactory {
  /**
   * Creates a standardized CRUD service implementation
   */
  static createCrudService<
    TEntity extends BaseDomainEntity,
    TCreateDto,
    TUpdateDto,
    TQueryDto extends BaseQueryOptions,
    TPrismaCreateInput,
    TPrismaUpdateInput, 
    TPrismaWhereInput
  >(config: {
    entityName: string
    repository: RepositoryContract<TEntity, TPrismaCreateInput, TPrismaUpdateInput, TPrismaWhereInput>
    validationRules?: DTOValidationRules
    businessRules?: Array<(entity: TEntity, context?: Record<string, unknown>) => Promise<void>>
  }): ServiceCreationTemplate<TEntity, TCreateDto, TUpdateDto, TQueryDto, TPrismaCreateInput, TPrismaUpdateInput, TPrismaWhereInput> {
    // This would return a configured service instance
    // Implementation details would depend on specific DI framework
    throw new Error('Factory implementation depends on DI container configuration')
  }
}

/**
 * Repository Base Class Pattern
 * Extend BaseRepository and implement this contract
 */
export interface RepositoryImplementationGuide {
  /**
   * Required method signatures that must match BaseRepository
   */
  baseRepositoryMethods: {
    findManyByOwner: '(ownerId: string, options?: Record<string, unknown>) => Promise<T[]>'
    findByIdAndOwner: '(id: string, ownerId: string, includeDetails?: boolean) => Promise<T | null>'
    getStatsByOwner: '(ownerId: string) => Promise<Record<string, unknown>>'
    create: '(options: CreateOptions<TCreate>) => Promise<T>'
    update: '(options: UpdateOptions<TUpdate, TWhere>) => Promise<T>'
    delete: '(options: DeleteOptions<TWhere>) => Promise<T>'
  }
  
  /**
   * Override requirements for multi-tenant filtering
   */
  requiredOverrides: {
    addOwnerFilter: '(where: TWhere, ownerId: string) => TWhere'
    applySearchFilter: '(where: TWhere, search: string) => TWhere'
  }
}

/**
 * Type Guards for Runtime Validation
 */
export const TypeGuards = {
  isDomainEntity: (obj: unknown): obj is BaseDomainEntity => {
    return obj !== null && typeof obj === 'object' && 
           'id' in obj && 'createdAt' in obj && 'updatedAt' in obj
  },
  
  isOwnedEntity: (obj: unknown): obj is OwnedEntity => {
    return TypeGuards.isDomainEntity(obj) && 'ownerId' in obj
  },
  
  isValidQueryOptions: (obj: unknown): obj is BaseQueryOptions => {
    return obj === null || (typeof obj === 'object' && 
           (!('limit' in obj!) || typeof (obj as BaseQueryOptions).limit === 'number' || typeof (obj as BaseQueryOptions).limit === 'string') &&
           (!('offset' in obj!) || typeof (obj as BaseQueryOptions).offset === 'number' || typeof (obj as BaseQueryOptions).offset === 'string'))
  }
}

/**
 * Performance Monitoring Interface
 */
export interface PerformanceMetrics {
  operationType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'
  entityType: string
  duration: number
  timestamp: Date
  success: boolean
  errorType?: string
  metadata?: {
    recordCount?: number
    queryComplexity?: 'simple' | 'complex'
    cacheHit?: boolean
  }
}

/**
 * Cache Strategy Interface
 */
export interface CacheStrategy<TEntity> {
  get(key: string): Promise<TEntity | null>
  set(key: string, value: TEntity, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  invalidatePattern(pattern: string): Promise<void>
  generateKey(entityType: string, operation: string, params: Record<string, unknown>): string
}

/**
 * Export standardized patterns for easy consumption
 */
export const DomainArchitecturePatterns = {
  TypeGuards,
  DomainErrorType,
  DomainServiceFactory
} as const

/**
 * Development Guidelines Comments
 * 
 * When creating a new CRUD service:
 * 1. Extend BaseCrudService with proper generic types
 * 2. Implement all abstract methods (findByIdAndOwner, calculateStats, etc.)
 * 3. Use proper Prisma types (CreateInput, UpdateInput, WhereInput)
 * 4. Override validation methods as needed (validateCreateData, validateUpdateData)
 * 5. Ensure repository implements all required methods
 * 6. Write comprehensive tests using standardized mock patterns
 * 
 * When creating a new repository:
 * 1. Extend BaseRepository with proper generic types
 * 2. Override addOwnerFilter for multi-tenant security
 * 3. Override applySearchFilter for entity-specific search
 * 4. Implement any entity-specific query methods
 * 5. Ensure proper ownership validation in all queries
 * 
 * Type Safety Checklist:
 * ✓ All DTOs have proper interfaces
 * ✓ Prisma types match service generic parameters
 * ✓ Repository methods return correct entity types
 * ✓ Validation methods check required fields
 * ✓ Error handling uses typed exceptions
 * ✓ Tests mock all required repository methods
 * ✓ Business rules are enforced at service level
 * ✓ Ownership validation prevents data leaks
 */