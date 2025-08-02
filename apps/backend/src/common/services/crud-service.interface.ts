/**
 * Core interfaces and types for CRUD service contracts
 * These define the standard patterns that all CRUD services should follow
 */

export interface EntityWithId {
  id: string
  [key: string]: unknown
}

export interface EntityWithOwner extends EntityWithId {
  ownerId: string
}

export interface EntityWithTimestamps extends EntityWithId {
  createdAt: Date
  updatedAt: Date
}

/**
 * Standard create DTO interface
 */
export type BaseCreateDto = Record<string, unknown>;

/**
 * Standard update DTO interface  
 */
export type BaseUpdateDto = Record<string, unknown>;

/**
 * Repository interface for CRUD operations
 */
export interface ICrudRepository<T extends EntityWithId> {
  findMany(options?: unknown): Promise<T[]>
  findManyByOwner(ownerId: string, options?: unknown): Promise<T[]>
  findById(id: string, options?: unknown): Promise<T | null>
  findByIdAndOwner?(id: string, ownerId: string, options?: unknown): Promise<T | null>
  create(options: { data: unknown }): Promise<T>
  update(options: { where: unknown; data: unknown }): Promise<T>
  deleteById(id: string): Promise<T>
  count(options?: { where?: unknown }): Promise<number>
  exists(where: unknown): Promise<boolean>
}

/**
 * Service test contract interface
 * Defines what methods should be tested for all CRUD services
 */
export interface ICrudServiceTestContract<
  TCreateDto extends BaseCreateDto,
  TUpdateDto extends BaseUpdateDto,
  TQueryDto
> {
  // Test data setup
  createValidEntity(overrides?: Partial<TCreateDto>): TCreateDto
  createValidUpdateData(overrides?: Partial<TUpdateDto>): TUpdateDto
  createValidQuery(overrides?: Partial<TQueryDto>): TQueryDto

  // Core operation tests
  testGetByOwner(): Promise<void>
  testGetByIdOrThrow(): Promise<void>
  testGetByIdOrThrowNotFound(): Promise<void>
  testGetStats(): Promise<void>
  testCreate(): Promise<void>
  testCreateValidation(): Promise<void>
  testUpdate(): Promise<void>
  testUpdateNotFound(): Promise<void>
  testUpdateValidation(): Promise<void>
  testDelete(): Promise<void>
  testDeleteNotFound(): Promise<void>
  testDeleteValidation(): Promise<void>

  // Multi-tenancy tests
  testOwnershipIsolation(): Promise<void>
  testUnauthorizedAccess(): Promise<void>

  // Query and pagination tests
  testQueryFiltering(): Promise<void>
  testPagination(): Promise<void>
  testSearch(): Promise<void>
}

/**
 * Configuration interface for CRUD services
 */
export interface CrudServiceConfig {
  entityName: string
  maxPageSize?: number
  defaultPageSize?: number
  enableSoftDelete?: boolean
  enableAuditLog?: boolean
  cacheTTL?: number
}

/**
 * Audit log interface for tracking entity changes
 */
export interface AuditLogEntry {
  id: string
  entityType: string
  entityId: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  changes?: Record<string, { from: unknown; to: unknown }>
  performedBy: string
  performedAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Cache interface for CRUD operations
 */
export interface ICrudCache {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  deletePattern(pattern: string): Promise<void>
  generateKey(entityType: string, operation: string, params: Record<string, unknown>): string
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  errors?: {
    field: string
    message: string
    code?: string
  }[]
}

/**
 * Business rule interface for complex validation
 */
export interface IBusinessRule<T> {
  validate(entity: T, context?: Record<string, unknown>): Promise<ValidationResult>
  name: string
  description: string
}

/**
 * Event interface for CRUD operations
 */
export interface CrudEvent<T> {
  type: 'ENTITY_CREATED' | 'ENTITY_UPDATED' | 'ENTITY_DELETED'
  entityType: string
  entity: T
  previousEntity?: T
  performedBy: string
  performedAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Event publisher interface
 */
export interface ICrudEventPublisher {
  publish<T>(event: CrudEvent<T>): Promise<void>
}

/**
 * Metrics interface for monitoring CRUD operations
 */
export interface CrudMetrics {
  operationCount: number
  operationDuration: number
  errorCount: number
  cacheHitRate?: number
  lastOperationAt: Date
}

/**
 * Health check interface for CRUD services
 */
export interface CrudHealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  database: boolean
  cache?: boolean
  lastChecked: Date
  metrics?: CrudMetrics
}