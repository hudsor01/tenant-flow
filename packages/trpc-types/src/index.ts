/**
 * TenantFlow TRPC Types
 * Centralized export of all TRPC type definitions
 */

// Export the main AppRouter type from shared package
// This avoids circular dependencies while maintaining type compatibility
export type { AppRouter, RouterInputs, RouterOutputs } from '@tenantflow/shared'

// Re-export type utilities
export type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// Re-export core types that are commonly used with TRPC
export type {
  AuthUser,
  Property,
  Unit,
  Tenant,
  Lease,
  MaintenanceRequest,
  Subscription,
  PaginatedResult,
  ApiResponse
} from '@tenantflow/types-core'