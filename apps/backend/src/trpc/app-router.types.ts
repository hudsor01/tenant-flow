/**
 * TRPC App Router Type Declarations
 * 
 * This file exports only the type interface of the AppRouter
 * to avoid circular dependencies while maintaining full type safety.
 * 
 * IMPORTANT: This file should ONLY contain type imports and exports.
 * No runtime code or value imports allowed.
 */

import type { AnyRouter } from '@trpc/server'
import type { Context } from './context/app.context'

// Import router types from each router file
import type { createAuthRouter } from './routers/auth.router'
import type { createPropertiesRouter } from './routers/properties.router'
import type { createTenantsRouter } from './routers/tenants.router'
import type { createMaintenanceRouter } from './routers/maintenance.router'
import type { createUnitsRouter } from './routers/units.router'
import type { createLeasesRouter } from './routers/leases.router'
import type { createSubscriptionsRouter } from './routers/subscriptions.router'

// Define the shape of our app router based on the actual implementation
export interface AppRouter extends AnyRouter {
  auth: ReturnType<typeof createAuthRouter>
  properties: ReturnType<typeof createPropertiesRouter>
  tenants: ReturnType<typeof createTenantsRouter>
  maintenance: ReturnType<typeof createMaintenanceRouter>
  units: ReturnType<typeof createUnitsRouter>
  leases: ReturnType<typeof createLeasesRouter>
  subscriptions: ReturnType<typeof createSubscriptionsRouter>
}