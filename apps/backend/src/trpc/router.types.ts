/**
 * TRPC Router Types Export
 * 
 * This file exports only the TypeScript types needed by the frontend,
 * without any runtime dependencies. This allows the shared package
 * to import these types without creating circular dependencies.
 */

import type { createAppRouter } from './app-router'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

// Export the main AppRouter type
export type AppRouter = ReturnType<typeof createAppRouter>

// Export utility types for TRPC client
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

// Export specific router types for better type inference
export type AuthRouter = AppRouter['auth']
export type PropertiesRouter = AppRouter['properties']
export type TenantsRouter = AppRouter['tenants']
export type MaintenanceRouter = AppRouter['maintenance']
export type UnitsRouter = AppRouter['units']
export type LeasesRouter = AppRouter['leases']
export type SubscriptionsRouter = AppRouter['subscriptions']