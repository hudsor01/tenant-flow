import { router } from './trpc'
import { createPropertiesRouter } from './routers/properties.router'
import { createTenantsRouter } from './routers/tenants.router'
import { createPaymentsRouter } from './routers/payments.router'
import { createAuthRouter } from './routers/auth.router'
import { createMaintenanceRouter } from './routers/maintenance.router'
import { createSubscriptionsRouter } from './routers/subscriptions.router'

export const createAppRouter = (services: {
  authService: any,
  propertiesService: any,
  tenantsService: any,
  paymentsService: any,
  maintenanceService: any,
  subscriptionsService: any,
  subscriptionService: any,
  portalService: any,
}) =>
  router({
    auth: createAuthRouter(services.authService),
    properties: createPropertiesRouter(services.propertiesService),
    tenants: createTenantsRouter(services.tenantsService),
    payments: createPaymentsRouter(services.paymentsService),
    maintenance: createMaintenanceRouter(services.maintenanceService),
    subscriptions: createSubscriptionsRouter(
      services.subscriptionsService,
      services.subscriptionService,
      services.portalService
    ),
  })

export type AppRouter = ReturnType<typeof createAppRouter>

import type { TrpcContextOpts } from "../../../../packages/types/trpc";

export const createContext = async (opts: TrpcContextOpts) => {
  // Example: extract user/session from req, attach services, etc.
  return {
    ...opts.services,
    req: opts.req,
    res: opts.res,
  }
}
