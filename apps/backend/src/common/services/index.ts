// Export all service base classes and interfaces
export * from './base-crud.service'
export * from './crud-service.interface'
export * from './service-contract.validator'

// Re-export common types and interfaces
export type {
  BaseQueryOptions,
  BaseStats,
  ICrudService
} from './base-crud.service'

export type {
  EntityWithId,
  EntityWithOwner,
  EntityWithTimestamps,
  BaseCreateDto,
  BaseUpdateDto,
  ICrudRepository,
  ICrudServiceTestContract,
  CrudServiceConfig,
  AuditLogEntry,
  ICrudCache,
  ValidationResult,
  IBusinessRule,
  CrudEvent,
  ICrudEventPublisher,
  CrudMetrics,
  CrudHealthCheck
} from './crud-service.interface'

export type {
  ServiceMetadata
} from './service-contract.validator'