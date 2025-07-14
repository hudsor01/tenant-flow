// File: packages/types/trpc.ts
// Purpose: Shared AppRouter type for tRPC client/server type safety.

import type { createAppRouter } from "../../apps/backend/src/trpc/app-router";
export type AppRouter = ReturnType<typeof createAppRouter>;

export interface TrpcContextOpts {
    req: unknown;
    res: unknown;
    services: {
        authService: unknown;
        propertiesService: unknown;
        tenantsService: unknown;
        paymentsService: unknown;
        maintenanceService: unknown;
        subscriptionsService: unknown;
        subscriptionService: unknown;
        portalService: unknown;
    };
}
