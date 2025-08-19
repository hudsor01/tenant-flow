// Export all service base classes and interfaces
export * from './base-crud.service'
export * from './service-contract.validator'

// Re-export common types and interfaces
export type {
	BaseQueryOptions,
	BaseStats,
	ICrudService
} from './base-crud.service'

export type { ServiceMetadata } from './service-contract.validator'
