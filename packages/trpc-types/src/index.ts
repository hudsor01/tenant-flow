/**
 * TenantFlow TRPC Types
 * Centralized export of all TRPC type definitions
 */

import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from './router'

// Export the main AppRouter type
export type { AppRouter } from './router'

// Export TRPC type inference helpers - these will be empty until actual types are available
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

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