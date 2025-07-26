/**
 * TRPC Router Types for TenantFlow
 * 
 * This file defines type stubs that will be properly inferred by TRPC v11.
 * The actual router types come from the backend but we avoid circular dependencies.
 */

import type { AnyRouter } from '@trpc/server'

// Type stub that defines the expected router structure
// This provides TypeScript with enough information for type checking
// while avoiding circular dependencies with the backend
export interface AppRouter extends AnyRouter {
  auth: AnyRouter
  properties: AnyRouter
  tenants: AnyRouter
  maintenance: AnyRouter
  units: AnyRouter
  leases: AnyRouter
  subscriptions: AnyRouter
}