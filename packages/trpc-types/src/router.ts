/**
 * TRPC Router Types for TenantFlow
 * 
 * This file defines type stubs that will be properly inferred by TRPC v11.
 * The actual router types come from the backend but we avoid circular dependencies.
 */

import type { AnyRouter } from '@trpc/server'

// Type stub that will be properly inferred by TRPC v11
// This satisfies the AnyRouter constraint while allowing proper type inference
export interface AppRouter extends AnyRouter {
  // The actual structure will be inferred by TRPC at runtime
  // This is just a type stub to satisfy TypeScript's type constraints
}