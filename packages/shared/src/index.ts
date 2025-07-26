/**
 * Shared package main exports
 * Runtime constants, types, and utility functions for TenantFlow
 */

// Export all types (includes re-exported constants)
export * from './types'

// Export all utilities  
export * from './utils'

// Export all validation schemas
export * from './validation'

// Export TRPC type utilities and specific types
// Note: AppRouter should be imported directly from @tenantflow/backend/trpc in consumer packages
export type { 
	RouterInputs, 
	RouterOutputs,
	PropertyListOutput,
	PropertyOutput,
	SubscriptionOutput
} from './trpc.generated'